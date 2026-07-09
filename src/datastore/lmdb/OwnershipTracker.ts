import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { lock } from 'proper-lockfile';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { processId } from '../../utils/Environment';
import { readFileIfExists } from '../../utils/File';
import { LOCK_OPTIONS } from '../../utils/LocalFile';

const OWNER_MARKER_PREFIX = 'owner.';
const COORDINATION_FILE_NAME = 'coordination';

/**
 * An `opening` marker older than this is treated as a crashed startup regardless of whether its
 * PID is currently alive. A real LMDB open completes in seconds, so this is set well beyond any
 * plausible open duration: the margin absorbs slow disks and corruption-retry reopens while still
 * breaking a recycled-PID crash loop within a couple of minutes. It exists because `isProcessAlive`
 * cannot tell a crashed opener apart from an unrelated process the OS later assigned the same PID.
 */
const OPENING_MARKER_STALE_MS = 5 * 60 * 1000;

/**
 * Lifecycle phase encoded in each owner marker's file name.
 *
 * - `opening`: inside the LMDB open. A C-level abort here (e.g. an lmdb assertion) kills
 *   the process with no JS cleanup, so a marker left in this phase signals a startup crash.
 * - `running`: the env opened successfully. A marker left here is an ordinary abrupt kill
 *   (SIGKILL, shutdown, OOM) of a healthy process — not a startup crash.
 */
export enum OwnershipPhase {
    opening = 'opening',
    running = 'running',
}

interface MarkerScan {
    /** Number of markers belonging to other, still-running processes. */
    liveOwners: number;
    /** Marker file names safe to delete (dead owners and malformed marker files). */
    removableFiles: string[];
    /** Number of dead owners that died while still in the `opening` phase. */
    crashedStartups: number;
}

/**
 * Detects fatal LMDB startup crashes across processes so a crash loop can be broken by
 * wiping the (presumed corrupt) data directory exactly once.
 *
 * The LMDB directory is a single machine-wide path shared by every IDE/LSP process. A
 * C-level abort while opening it kills the process with no JS cleanup, so the editor
 * restarts into the same crash on loop. We detect this at the *next* startup from a
 * per-PID marker left on disk: `owner.<pid>.opening` is written before opening LMDB and
 * renamed to `owner.<pid>.running` once it succeeds; both are removed on clean shutdown.
 *
 * Under a cross-process lock, startup wipes the data directory only when BOTH hold:
 *   1. no marker belongs to a live process (no sibling IDE is using the data), and
 *   2. a dead owner is still in the `opening` phase (its startup died mid-open).
 * A dead `running` marker is a healthy process killed abruptly, so reboots/force-quits
 * preserve the cache.
 *
 * Liveness is a PID check, which cannot distinguish a crashed opener from an unrelated
 * process the OS later assigned the same PID. So an `opening` marker older than
 * {@link OPENING_MARKER_STALE_MS} is treated as a dead crashed startup regardless of PID
 * liveness (a genuine in-progress open is never that old), using the timestamp each marker
 * persists in its body. This closes the window where a recycled PID keeps a crash loop alive.
 *
 * The scan, wipe, and marker claim share one `proper-lockfile` lock so concurrent
 * startups can't both wipe or open a directory another is wiping. Every step is
 * best-effort: any lock/filesystem failure is logged and treated as "cannot determine a
 * crash → proceed without wiping", so detection alone can never block startup.
 */
export class LMDBOwnershipTracker {
    static readonly DirName = 'markers';

    private readonly log = LoggerFactory.getLogger('LMDB.Ownership');
    private readonly markersDir: string;
    private readonly coordinationPath: string;
    private readonly pid = processId();

    // True once we've written our own marker; distinguishes a recycled-PID predecessor's
    // leftover marker (a crash) from our own marker left by an earlier retry (not a crash).
    private ownMarkerClaimed = false;

    constructor(lmdbDir: string) {
        this.markersDir = join(lmdbDir, LMDBOwnershipTracker.DirName);
        this.coordinationPath = join(this.markersDir, COORDINATION_FILE_NAME);
    }

    /**
     * Under the coordination lock: detect a prior startup crash, invoke `onCrashDetected`
     * (so the caller can safely wipe) if one is found with no live owner, clear dead
     * markers, and claim this process's `opening` marker. Best-effort — any lock or
     * filesystem failure is logged and swallowed so startup proceeds without a wipe.
     */
    async beginStartup(onCrashDetected: () => void): Promise<void> {
        try {
            mkdirSync(this.markersDir, { recursive: true });

            const release = await lock(this.coordinationPath, LOCK_OPTIONS);
            try {
                const { liveOwners, removableFiles, crashedStartups } = this.scanMarkers();

                if (liveOwners === 0 && crashedStartups > 0) {
                    onCrashDetected();
                }

                for (const fileName of removableFiles) {
                    this.removeMarker(join(this.markersDir, fileName));
                }
                this.writeOwnMarker(OwnershipPhase.opening);
            } finally {
                await release();
            }
        } catch (error) {
            // Crash detection is a best-effort safeguard; never let it abort startup.
            this.log.warn(error, 'LMDB crash detection failed; proceeding without recovery');
        }
    }

    /**
     * Promote this process's marker from `opening` to `running` after the env opens.
     * Lock-free: only this process touches its own marker.
     */
    markRunning(): void {
        try {
            renameSync(this.ownMarkerPath(OwnershipPhase.opening), this.ownMarkerPath(OwnershipPhase.running));
        } catch {
            // The opening marker may be absent if beginStartup() could not write it.
            // Record the running marker directly so a later startup reads the right phase.
            try {
                this.writeOwnMarker(OwnershipPhase.running);
            } catch (error) {
                this.log.warn(error, 'Failed to record LMDB running marker');
            }
        }
    }

    /** Remove this process's marker on clean shutdown. Idempotent. */
    release(): void {
        this.removeMarker(this.ownMarkerPath(OwnershipPhase.opening));
        this.removeMarker(this.ownMarkerPath(OwnershipPhase.running));
    }

    private scanMarkers(): MarkerScan {
        let entries: string[];
        try {
            entries = readdirSync(this.markersDir);
        } catch (error) {
            this.log.warn(error, 'Failed to list LMDB marker directory');
            return { liveOwners: 0, removableFiles: [], crashedStartups: 0 };
        }

        const scan: MarkerScan = { liveOwners: 0, removableFiles: [], crashedStartups: 0 };
        const now = Date.now();

        for (const fileName of entries) {
            if (!fileName.startsWith(OWNER_MARKER_PREFIX)) {
                continue;
            }

            const marker = parseMarker(fileName, this.readMarkerBody(fileName));
            if (marker === undefined) {
                scan.removableFiles.push(fileName);
                continue;
            }

            const isOwnMarker = marker.pid === this.pid;
            // An `opening` marker older than the threshold is a crashed startup even when its PID
            // reads as alive: liveness is only a PID probe, which a PID the OS recycled to an
            // unrelated process would pass, but a real open never lasts this long. Trusting the
            // persisted age over `isProcessAlive` here is what defeats PID recycling.
            const isStaleOpening =
                marker.phase === OwnershipPhase.opening &&
                marker.startedAt !== undefined &&
                now - marker.startedAt > OPENING_MARKER_STALE_MS;
            const isLive = !isOwnMarker && !isStaleOpening && isProcessAlive(marker.pid);
            if (isLive) {
                scan.liveOwners++;
                continue;
            }

            scan.removableFiles.push(fileName);

            // A dead `opening` marker is a mid-open crash — unless it's our own from an
            // earlier retry (already claimed), which would otherwise self-wipe. A same-PID
            // marker seen before we've claimed ours is a recycled-PID predecessor's crash.
            const isOwnRetryMarker = isOwnMarker && this.ownMarkerClaimed;
            if (marker.phase === OwnershipPhase.opening && !isOwnRetryMarker) {
                scan.crashedStartups++;
            }
        }

        return scan;
    }

    /** Read a marker's body (best-effort); returns '' if it vanished or cannot be read. */
    private readMarkerBody(fileName: string): string {
        try {
            return readFileIfExists(join(this.markersDir, fileName));
        } catch {
            return '';
        }
    }

    private writeOwnMarker(phase: OwnershipPhase): void {
        // Replace any leftover marker for our (possibly recycled) PID before claiming.
        this.removeMarker(this.ownMarkerPath(OwnershipPhase.opening));
        this.removeMarker(this.ownMarkerPath(OwnershipPhase.running));
        writeFileSync(this.ownMarkerPath(phase), `${this.pid}\n${new Date().toISOString()}`);
        this.ownMarkerClaimed = true;
    }

    private removeMarker(path: string): void {
        try {
            rmSync(path, { force: true });
        } catch (error) {
            this.log.warn(error, `Failed to remove LMDB marker ${path}`);
        }
    }

    private ownMarkerPath(phase: OwnershipPhase): string {
        return join(this.markersDir, `${OWNER_MARKER_PREFIX}${this.pid}.${phase}`);
    }
}

interface ParsedMarker {
    pid: number;
    phase: OwnershipPhase;
    /** When the marker was written (ms since epoch), or undefined if the body has no valid timestamp. */
    startedAt: number | undefined;
}

/**
 * Parse a marker from its file name (authoritative for pid/phase) and, when available, the
 * timestamp persisted in its body. `body` is the marker's file contents (`<pid>\n<ISO timestamp>`
 * per {@link LMDBOwnershipTracker.writeOwnMarker}); an unreadable/legacy body simply yields no
 * timestamp, leaving pid/phase detection unaffected.
 */
function parseMarker(fileName: string, body: string): ParsedMarker | undefined {
    const nameBody = fileName.slice(OWNER_MARKER_PREFIX.length);
    const separator = nameBody.lastIndexOf('.');
    if (separator <= 0) {
        return undefined;
    }

    const pid = Number(nameBody.slice(0, separator));
    const phase = nameBody.slice(separator + 1);
    if (!Number.isInteger(pid) || pid <= 0 || !isOwnershipPhase(phase)) {
        return undefined;
    }

    return { pid, phase, startedAt: parseTimestamp(body) };
}

/** Extract the ISO timestamp from a marker body (`<pid>\n<ISO timestamp>`), or undefined if absent/invalid. */
function parseTimestamp(body: string): number | undefined {
    const isoLine = body.split('\n', 2)[1]?.trim();
    if (isoLine === undefined || isoLine === '') {
        return undefined;
    }
    const parsed = Date.parse(isoLine);
    return Number.isNaN(parsed) ? undefined : parsed;
}

function isOwnershipPhase(value: string): value is OwnershipPhase {
    return value === OwnershipPhase.opening.toString() || value === OwnershipPhase.running.toString();
}

function isProcessAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error: unknown) {
        // EPERM: the process exists but we lack permission to signal it — still alive.
        // ESRCH (or anything else): no such process — treat as dead.
        return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
}
