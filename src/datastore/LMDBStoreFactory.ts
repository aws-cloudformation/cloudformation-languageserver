import { existsSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { open, RootDatabase, RootDatabaseOptionsWithPath } from 'lmdb';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { isWindows, processId } from '../utils/Environment';
import { extractErrorMessage } from '../utils/Errors';
import { formatNumber, toString } from '../utils/String';
import { DataStore, DataStoreFactory, PersistedStores, StoreName } from './DataStore';
import { LMDBStore } from './lmdb/LMDBStore';
import { LMDBOwnershipTracker } from './lmdb/OwnershipTracker';
import { stats } from './lmdb/Stats';
import { encryptionStrategy } from './lmdb/Utils';

const MetricsIntervalMs = 60 * 1000;
const CleanupDelayMs = 2 * 60 * 1000;

export class LMDBStoreFactory implements DataStoreFactory {
    private readonly log = LoggerFactory.getLogger('LMDB.Global');
    @Telemetry({ scope: 'LMDB.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly lmdbDir: string;
    private metricsInterval?: NodeJS.Timeout;
    private cleanupTimeout?: NodeJS.Timeout;

    private env!: RootDatabase;
    private openPid = processId();
    private initPromise?: Promise<void>;
    private closed = false;
    private activeOps = 0;

    private readonly stores = new Map<StoreName, LMDBStore>();
    private readonly ownershipTracker: LMDBOwnershipTracker;

    constructor(
        rootDir: string,
        public readonly storeNames = PersistedStores,
    ) {
        this.lmdbDir = join(rootDir, 'lmdb');
        this.ownershipTracker = new LMDBOwnershipTracker(this.lmdbDir);
    }

    /**
     * Open the LMDB environment and stores. Idempotent: concurrent and repeat callers
     * share a single in-flight promise, and a failed attempt is not cached, so a retry
     * re-runs initialization rather than leaving the factory permanently half-open.
     */
    initialize(): Promise<void> {
        this.initPromise ??= this.runInitialize().catch((error) => {
            // Allow a later caller to retry instead of caching the rejection forever.
            this.initPromise = undefined;
            throw error;
        });
        return this.initPromise;
    }

    private async runInitialize(): Promise<void> {
        // Record an `opening` marker and recover from a prior startup crash before the
        // (potentially fatal) env open, so a crash here is detectable on the next start.
        await this.ownershipTracker.beginStartup(() => {
            this.log.warn('Detected fatal LMDB startup crash from a previous run, wiping data directory to recover');
            this.telemetry.count('startup.crashRecovery', 1);
            this.deleteVersionDir();
        });

        this.openEnvAndStores();

        // The env and stores opened successfully — promote the marker out of `opening`
        // so an abrupt kill from now on is not mistaken for a startup crash.
        this.ownershipTracker.markRunning();
        this.scheduleBackgroundTasks();
    }

    get(store: StoreName): DataStore {
        const val = this.stores.get(store);
        if (val === undefined) {
            throw new Error(`Store ${store} not found. Available stores: ${[...this.stores.keys()].join(', ')}`);
        }
        return val;
    }

    async close(): Promise<void> {
        if (this.closed) return;
        this.closed = true;

        const deadline = Date.now() + 2000;
        while (this.activeOps > 0 && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
        if (this.activeOps > 0) {
            this.log.warn({ activeOps: this.activeOps }, 'Closing LMDB with in-flight operations after timeout');
        }

        if (this.metricsInterval !== undefined) {
            clearInterval(this.metricsInterval);
        }
        if (this.cleanupTimeout !== undefined) {
            clearTimeout(this.cleanupTimeout);
        }
        this.stores.clear();

        // initialize() may have failed or never run, leaving env unset.
        if ((this.env as RootDatabase | undefined) !== undefined) {
            await this.env.close();
        }
        this.ownershipTracker.release();
    }

    private openEnvAndStores(): void {
        const config = this.tryOpen() ?? this.recreateAfterCorruption();

        this.log.info(
            {
                path: config.path,
                maxDbs: config.maxDbs,
                mapSize: config.mapSize,
                encoding: config.encoding,
                noSubdir: config.noSubdir,
                overlappingSync: config.overlappingSync,
            },
            `Initialized LMDB ${Version} with stores: ${toString(this.storeNames)} and ${formatNumber(stats(this.env).totalSize / (1024 * 1024), 4)} MB`,
        );
    }

    /**
     * Open the environment and every store, returning the config on success or
     * `undefined` if either step throws so the caller can recover.
     */
    private tryOpen(): RootDatabaseOptionsWithPath | undefined {
        try {
            return this.openEnvAndAddStores();
        } catch (e) {
            this.log.warn(e, 'LMDB corrupted on startup, deleting and recreating');
            return undefined;
        }
    }

    /**
     * Delete the (presumed corrupt) version directory and open a fresh environment and
     * stores. Unlike {@link tryOpen}, a failure here is fatal and propagates.
     */
    private recreateAfterCorruption(): RootDatabaseOptionsWithPath {
        this.stores.clear();
        if ((this.env as RootDatabase | undefined) !== undefined) {
            void this.env.close();
        }
        this.deleteVersionDir();
        return this.openEnvAndAddStores();
    }

    private openEnvAndAddStores(): RootDatabaseOptionsWithPath {
        const { env, config } = createEnv(this.lmdbDir);
        this.env = env;
        for (const store of this.storeNames) {
            this.addStore(store);
        }
        return config;
    }

    private scheduleBackgroundTasks(): void {
        this.metricsInterval = setInterval(() => {
            this.emitMetrics();
        }, MetricsIntervalMs);

        this.cleanupTimeout = setTimeout(() => {
            this.cleanupOldVersions();
        }, CleanupDelayMs);

        this.metricsInterval.unref();
        this.cleanupTimeout.unref();
    }

    private beginOp(): () => void {
        // Safe: JS is single-threaded, so closed check + increment is atomic within a tick
        if (this.closed) {
            throw new Error('Database is closed');
        }
        this.activeOps++;
        return () => {
            this.activeOps--;
        };
    }

    private handleError(error: unknown): void {
        if (this.closed) return;
        const msg = extractErrorMessage(error);

        try {
            if (msg.includes('MDB_BAD_RSLOT') || msg.includes("doesn't match env pid")) {
                this.recoverFromFork();
            } else {
                this.recoverFromError();
            }
        } catch (recoveryError) {
            this.log.error(recoveryError, 'LMDB recovery failed, disabling database');
            this.telemetry.count('recovery.failed', 1);
        }
    }

    private ensureValidEnv(): void {
        if (processId() !== this.openPid) {
            this.telemetry.count('process.forked', 1);
            this.log.warn({ oldPid: this.openPid, newPid: processId() }, 'Process fork detected, reopening LMDB');

            try {
                this.reopenEnv();

                // Update all stores with new handles
                for (const store of this.storeNames) {
                    this.stores.get(store)?.updateStore(createDB(this.env, store));
                }
            } catch (e) {
                this.log.error(e, 'Failed to reopen LMDB after fork');
                this.deleteAndRecreate();
            }
        }
    }

    private recoverFromFork(): void {
        this.telemetry.count('forked.recover', 1);
        this.log.warn({ oldPid: this.openPid, newPid: processId() }, 'Process fork detected, reopening LMDB');

        try {
            this.reopenEnv();
            this.recreateStores();
        } catch {
            this.log.warn('Fork recovery failed, deleting and recreating');
            this.deleteAndRecreate();
        }
    }

    private recoverFromError(): void {
        this.telemetry.count('error.recover', 1);
        this.log.warn('Error detected, attempting to reopen LMDB');

        try {
            this.reopenEnv();
            this.recreateStores();
            this.log.info('Successfully recovered by reopening LMDB');
        } catch {
            this.log.warn('Reopen failed, deleting database');
            this.deleteAndRecreate();
        }
    }

    private deleteAndRecreate(): void {
        try {
            this.deleteVersionDir();
            this.reopenEnv();
            this.recreateStores();
        } catch (e) {
            this.log.error(e, 'Failed to recreate LMDB after deletion');
            this.telemetry.count('recovery.failed', 1);
        }
    }

    /**
     * Replaces the LMDB environment synchronously. In-flight async operations may
     * fail on the old env, but execAsync's retry logic will recover using the new
     * store handle (updated by recreateStores). Unlike close(), we don't drain
     * activeOps because the env is being replaced, not destroyed.
     */
    private reopenEnv(): void {
        this.telemetry.count('env.reopen', 1);
        this.env = createEnv(this.lmdbDir).env;
        this.openPid = processId();
        this.log.warn('Recreated LMDB environment');
    }

    private recreateStores(): void {
        for (const name of this.storeNames) {
            const existing = this.stores.get(name);
            if (existing) {
                existing.updateStore(createDB(this.env, name));
            } else {
                this.addStore(name);
            }
        }
    }

    private addStore(name: StoreName): void {
        const database = createDB(this.env, name);
        this.stores.set(
            name,
            new LMDBStore(
                name,
                database,
                (e) => this.handleError(e),
                () => this.ensureValidEnv(),
                () => this.beginOp(),
            ),
        );
    }

    private deleteVersionDir(): void {
        try {
            rmSync(join(this.lmdbDir, Version), { recursive: true, force: true });
        } catch (e) {
            this.log.error(e, 'Failed to delete LMDB version directory');
        }
    }

    private cleanupOldVersions(): void {
        if (this.closed || !existsSync(this.lmdbDir)) return;

        const entries = readdirSync(this.lmdbDir, { withFileTypes: true });
        for (const entry of entries) {
            try {
                if (entry.name === Version || entry.name === LMDBOwnershipTracker.DirName) {
                    continue;
                }

                this.telemetry.count('oldVersion.cleanup.count', 1);
                rmSync(join(this.lmdbDir, entry.name), { recursive: true, force: true });
            } catch (error) {
                this.log.error(error, 'Failed to cleanup old LMDB versions');
                this.telemetry.count('oldVersion.cleanup.error', 1);
            }
        }
    }

    private emitMetrics(): void {
        if (this.closed) return;

        try {
            const staleLocks = this.env.readerCheck();
            if (staleLocks > 0) {
                this.log.info(`Removed ${staleLocks} stale reader locks for LMDB`);
            }
            const envStat = stats(this.env);
            this.telemetry.histogram('version', VersionNumber);
            this.telemetry.histogram('env.size.bytes', envStat.totalSize, { unit: 'By' });
            this.telemetry.histogram('env.max.size.bytes', envStat.maxSize, {
                unit: 'By',
            });
            this.telemetry.histogram('env.entries', envStat.entries);

            let totalBytes = envStat.totalSize;
            for (const [name, store] of this.stores.entries()) {
                const stat = store.stats();
                this.telemetry.histogram(`store.${name}.size.bytes`, stat.totalSize, { unit: 'By' });
                this.telemetry.histogram(`store.${name}.entries`, stat.entries);
                totalBytes += stat.totalSize;
            }

            this.telemetry.histogram('total.usage', 100 * (totalBytes / TotalMaxDbSize), { unit: '%' });
            this.telemetry.histogram('total.size.bytes', totalBytes, { unit: 'By' });
        } catch (e) {
            this.handleError(e);
        }
    }
}

const VersionNumber = 6;
const Version = `v${VersionNumber}`;
const Encoding: 'msgpack' | 'json' | 'string' | 'binary' | 'ordered-binary' = 'msgpack';
const TotalMaxDbSize = 250 * 1024 * 1024; // 250MB max size

function createEnv(lmdbDir: string) {
    const config: RootDatabaseOptionsWithPath = {
        path: join(lmdbDir, Version),
        maxDbs: 10,
        mapSize: TotalMaxDbSize,
        encoding: Encoding,
        encryptionKey: encryptionStrategy(VersionNumber),
        // Forces use of the last safely flushed transaction on open, rather than the last committed
        // (but possibly unflushed) one. Prevents corruption when the process is killed mid-flush.
        // https://github.com/kriszyp/lmdb-js#readme ("safeRestore")
        // https://github.com/kriszyp/lmdb-js/blob/master/open.js#L188 (flag 0x800)
        ...({ safeRestore: true } as Record<string, unknown>),
    };

    if (isWindows) {
        config.noSubdir = false;
        config.overlappingSync = false;
    }

    return {
        config,
        env: open(config),
    };
}

function createDB(env: RootDatabase, name: string) {
    return env.openDB<unknown, string>({ name, encoding: Encoding });
}
