import { getHeapStatistics } from 'v8';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { Closeable } from '../utils/Closeable';

/**
 * Self-enforcing memory watchdog for the language server process.
 *
 * Why this exists: the server's memory splits across three pools — the main
 * V8 heap (capped by --max-old-space-size), the Pyodide worker's V8 heap
 * (capped by worker resourceLimits), and Pyodide's WASM linear memory
 * (~200-300MB) which V8 cannot cap at all. OS-level enforcement is not
 * portable: macOS ignores RSS ulimits, RLIMIT_AS breaks WASM (Emscripten
 * reserves multi-GB virtual ranges), and cgroups/Job Objects are not
 * available from the IDE spawn paths. Since the Pyodide worker is a thread
 * in THIS process, watching our own RSS covers every pool at once.
 *
 * Two watchdogs run on the same timer:
 *
 * RSS policy (whole process, dominated by Pyodide WASM):
 * 1. RSS >= soft limit  → restart the Pyodide worker (frees the WASM pool,
 *    the largest and leakiest chunk). Rate-limited by a cooldown. Pyodide
 *    reloads lazily on the next lint request.
 * 2. RSS >= hard limit  → force a worker restart immediately, and if RSS is
 *    STILL over the hard limit after consecutive checks, exit the process.
 *
 * Heap policy (non-Pyodide pool: schemas, documents, syntax trees, LSP
 * state — bounded by --max-old-space-size, which V8 enforces by ABORTING
 * the process). The goal here is graceful pre-OOM handling: V8's effective
 * limit is read from v8.getHeapStatistics().heap_size_limit, so this adapts
 * to whatever --max-old-space-size the client set.
 * 1. heapUsed >= 85% of the V8 limit → invoke the heap reclaim callback
 *    (drops rebuildable caches, e.g. the combined schema cache).
 * 2. heapUsed >= 95% for consecutive checks → exit(1) BEFORE V8 aborts —
 *    a controlled exit lets the client restart cleanly instead of a crash
 *    dump mid-request.
 *
 * Exits are safe (no orphans) thanks to the stdin-EOF fix; IDE clients
 * automatically respawn the server.
 *
 * Limits are configurable via env vars (0 disables a stage):
 * - CFN_LSP_MEMORY_SOFT_LIMIT_MB (default 1200)
 * - CFN_LSP_MEMORY_HARD_LIMIT_MB (default 1600)
 *
 * Defaults are sized from field data (memory-investigation.md): healthy
 * instances run 650-825MB with linting active, so the soft limit only fires
 * on abnormal growth, never on the working baseline.
 */

export interface MemoryMonitorOptions {
    /** Restart the Pyodide worker above this RSS (MB). 0 disables. */
    softLimitMb?: number;
    /** Exit the process when RSS stays above this (MB). 0 disables. */
    hardLimitMb?: number;
    /** Reclaim main-heap caches above this fraction of the V8 limit. 0 disables. */
    heapSoftFraction?: number;
    /** Exit before V8 aborts above this fraction of the V8 limit. 0 disables. */
    heapHardFraction?: number;
    /** How often to sample. */
    checkIntervalMs?: number;
    /** Minimum time between reclaims (per pool). */
    reclaimCooldownMs?: number;
    /** RSS source override (tests). */
    getRssMb?: () => number;
    /** Heap stats override (tests). Returns [usedMb, limitMb]. */
    getHeapMb?: () => [number, number];
    /** Exit override (tests). */
    exit?: (code: number) => void;
}

const DEFAULT_SOFT_LIMIT_MB = 1200;
const DEFAULT_HARD_LIMIT_MB = 1600;
const DEFAULT_HEAP_SOFT_FRACTION = 0.85;
const DEFAULT_HEAP_HARD_FRACTION = 0.95;
const DEFAULT_CHECK_INTERVAL_MS = 30_000;
const DEFAULT_RECLAIM_COOLDOWN_MS = 5 * 60_000;
/** Consecutive over-hard-limit checks (after a forced reclaim) before exiting */
const HARD_STRIKES_BEFORE_EXIT = 3;

function envLimitMb(name: string, fallback: number): number {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === '') {
        return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const MB = 1024 * 1024;

export class MemoryMonitor implements Closeable {
    private readonly softLimitMb: number;
    private readonly hardLimitMb: number;
    private readonly heapSoftFraction: number;
    private readonly heapHardFraction: number;
    private readonly checkIntervalMs: number;
    private readonly reclaimCooldownMs: number;
    private readonly getRssMb: () => number;
    private readonly getHeapMb: () => [number, number];
    private readonly exit: (code: number) => void;

    private timer: NodeJS.Timeout | undefined;
    private lastReclaimAt = 0;
    private lastHeapReclaimAt = 0;
    private hardStrikes = 0;
    private heapStrikes = 0;
    private checking = false;

    @Telemetry() private readonly telemetry!: ScopedTelemetry;

    constructor(
        /** Frees reclaimable memory (restarts the Pyodide worker). */
        private readonly reclaim: (reason: string) => Promise<void>,
        options: MemoryMonitorOptions = {},
        /** Frees rebuildable main-heap caches (e.g. combined schema cache). */
        private readonly reclaimHeap?: (reason: string) => Promise<void>,
        private readonly log = LoggerFactory.getLogger(MemoryMonitor),
    ) {
        this.softLimitMb = options.softLimitMb ?? envLimitMb('CFN_LSP_MEMORY_SOFT_LIMIT_MB', DEFAULT_SOFT_LIMIT_MB);
        this.hardLimitMb = options.hardLimitMb ?? envLimitMb('CFN_LSP_MEMORY_HARD_LIMIT_MB', DEFAULT_HARD_LIMIT_MB);
        this.heapSoftFraction = options.heapSoftFraction ?? DEFAULT_HEAP_SOFT_FRACTION;
        this.heapHardFraction = options.heapHardFraction ?? DEFAULT_HEAP_HARD_FRACTION;
        this.checkIntervalMs = options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS;
        this.reclaimCooldownMs = options.reclaimCooldownMs ?? DEFAULT_RECLAIM_COOLDOWN_MS;
        this.getRssMb = options.getRssMb ?? ((): number => process.memoryUsage().rss / MB);
        this.getHeapMb =
            options.getHeapMb ??
            ((): [number, number] => {
                const stats = getHeapStatistics();
                return [stats.used_heap_size / MB, stats.heap_size_limit / MB];
            });
        // eslint-disable-next-line unicorn/no-process-exit -- intentional: controlled exit-and-respawn is the enforcement action
        this.exit = options.exit ?? ((code): void => process.exit(code));
    }

    private get enabled(): boolean {
        return this.softLimitMb > 0 || this.hardLimitMb > 0 || this.heapSoftFraction > 0 || this.heapHardFraction > 0;
    }

    start(): void {
        if (this.timer || !this.enabled) {
            return;
        }
        this.log.info(
            `Memory monitor started: rss soft=${this.softLimitMb}MB (worker restart), ` +
                `rss hard=${this.hardLimitMb}MB (process exit), ` +
                `heap soft=${Math.round(this.heapSoftFraction * 100)}% / hard=${Math.round(this.heapHardFraction * 100)}% ` +
                `of V8 limit, interval=${this.checkIntervalMs}ms`,
        );
        this.timer = setInterval(() => void this.check(), this.checkIntervalMs);
        // Never keep the process alive just to watch memory
        this.timer.unref();
    }

    /** One sampling pass. Public so tests can drive it without timers. */
    async check(): Promise<void> {
        if (this.checking) {
            return; // a slow reclaim is still in flight
        }
        this.checking = true;
        try {
            await this.checkRss();
            await this.checkHeap();
        } finally {
            this.checking = false;
        }
    }

    /** Whole-process pool (dominated by Pyodide WASM linear memory). */
    private async checkRss(): Promise<void> {
        const rssMb = Math.round(this.getRssMb());

        if (this.hardLimitMb > 0 && rssMb >= this.hardLimitMb) {
            this.hardStrikes++;
            this.telemetry.count('hard.breach', 1);
            this.log.error(
                `RSS ${rssMb}MB >= hard limit ${this.hardLimitMb}MB (strike ${this.hardStrikes}/${HARD_STRIKES_BEFORE_EXIT})`,
            );
            if (this.hardStrikes >= HARD_STRIKES_BEFORE_EXIT) {
                this.telemetry.count('hard.exit', 1);
                this.log.error(
                    `RSS still over hard limit after worker restart — exiting so the client respawns a fresh server`,
                );
                this.exit(1);
                return;
            }
            // Force a reclaim regardless of cooldown — this is the escalation path
            await this.tryReclaim(`hard limit ${this.hardLimitMb}MB exceeded (rss=${rssMb}MB)`, true);
            return;
        }
        this.hardStrikes = 0;

        if (this.softLimitMb > 0 && rssMb >= this.softLimitMb) {
            this.telemetry.count('soft.breach', 1);
            await this.tryReclaim(`soft limit ${this.softLimitMb}MB exceeded (rss=${rssMb}MB)`, false);
        }
    }

    /**
     * Non-Pyodide pool: the main V8 heap (schemas, documents, syntax trees,
     * LSP state). --max-old-space-size already hard-enforces this, but by
     * ABORTING the process — this stage acts first so the endgame is a
     * controlled restart, not a crash dump.
     */
    private async checkHeap(): Promise<void> {
        if (this.heapSoftFraction <= 0 && this.heapHardFraction <= 0) {
            return;
        }
        const [usedMb, limitMb] = this.getHeapMb();
        const fraction = usedMb / limitMb;

        if (this.heapHardFraction > 0 && fraction >= this.heapHardFraction) {
            this.heapStrikes++;
            this.telemetry.count('heap.hard.breach', 1);
            this.log.error(
                `Main heap ${Math.round(usedMb)}MB is ${Math.round(fraction * 100)}% of the ` +
                    `${Math.round(limitMb)}MB V8 limit (strike ${this.heapStrikes}/${HARD_STRIKES_BEFORE_EXIT})`,
            );
            if (this.heapStrikes >= HARD_STRIKES_BEFORE_EXIT) {
                this.telemetry.count('heap.exit', 1);
                this.log.error(`Exiting before V8 aborts — the client respawns a fresh server`);
                this.exit(1);
                return;
            }
            await this.tryReclaimHeap(
                `heap at ${Math.round(fraction * 100)}% of V8 limit (${Math.round(usedMb)}MB)`,
                true,
            );
            return;
        }
        this.heapStrikes = 0;

        if (this.heapSoftFraction > 0 && fraction >= this.heapSoftFraction) {
            this.telemetry.count('heap.soft.breach', 1);
            await this.tryReclaimHeap(
                `heap at ${Math.round(fraction * 100)}% of V8 limit (${Math.round(usedMb)}MB)`,
                false,
            );
        }
    }

    private async tryReclaim(reason: string, force: boolean): Promise<void> {
        const now = Date.now();
        if (!force && now - this.lastReclaimAt < this.reclaimCooldownMs) {
            return; // avoid restart thrash while memory hovers around the limit
        }
        this.lastReclaimAt = now;
        this.telemetry.count('reclaim', 1);
        this.log.warn(`Reclaiming memory: ${reason}`);
        try {
            await this.reclaim(reason);
        } catch (error) {
            this.log.error(error, 'Memory reclaim failed');
        }
    }

    private async tryReclaimHeap(reason: string, force: boolean): Promise<void> {
        if (!this.reclaimHeap) {
            return;
        }
        const now = Date.now();
        if (!force && now - this.lastHeapReclaimAt < this.reclaimCooldownMs) {
            return;
        }
        this.lastHeapReclaimAt = now;
        this.telemetry.count('heap.reclaim', 1);
        this.log.warn(`Reclaiming main-heap caches: ${reason}`);
        try {
            await this.reclaimHeap(reason);
        } catch (error) {
            this.log.error(error, 'Heap reclaim failed');
        }
    }

    close(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
}
