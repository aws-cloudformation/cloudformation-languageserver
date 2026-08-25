import { existsSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { open, RootDatabase, RootDatabaseOptionsWithPath } from 'lmdb';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { diskUsage } from '../utils/Disk';
import { isWindows, processId } from '../utils/Environment';
import { DataStoreError, LMDBCrashError } from '../utils/errors/ErrorClasses';
import { extractErrorMessage } from '../utils/errors/ErrorUtils';
import { formatNumber, toString } from '../utils/String';
import { DataStore, DataStoreFactory, PersistedStores, StoreName, TotalMaxDatastoreSize } from './DataStore';
import { LMDBStore } from './lmdb/LMDBStore';
import { LMDBOwnershipTracker } from './lmdb/OwnershipTracker';
import { stats } from './lmdb/Stats';
import { encryptionStrategy } from './lmdb/Utils';
import { recordDiscardedData, recordDiskUsage, recordOutOfDiskFailure, StoreOperation } from './Utils';
import { isOlderVersionDirectory } from './VersionDirectory';

const MetricsIntervalMs = 60 * 1000;
const CleanupDelayMs = 2 * 60 * 1000;

type OpenedEnv = { config: RootDatabaseOptionsWithPath; env: RootDatabase };

export class LMDBStoreFactory implements DataStoreFactory {
    private readonly log = LoggerFactory.getLogger('LMDB.Global');
    @Telemetry({ scope: 'LMDB.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly lmdbDir: string;
    private readonly lmdbVersionDir: string;
    private metricsInterval?: NodeJS.Timeout;
    private cleanupTimeout?: NodeJS.Timeout;

    private env: RootDatabase | undefined;
    private openPid = processId();
    private initPromise?: Promise<void>;
    private pendingEnvRelease = Promise.resolve();
    private destructiveRecovery?: Promise<void>;
    private closed = false;
    private activeOps = 0;

    private readonly stores = new Map<StoreName, LMDBStore>();
    private readonly ownershipTracker: LMDBOwnershipTracker;

    constructor(
        rootDir: string,
        public readonly storeNames = PersistedStores,
    ) {
        this.lmdbDir = join(rootDir, 'lmdb');
        this.lmdbVersionDir = join(this.lmdbDir, Version);
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
            this.deleteVersionDir(new LMDBCrashError());
        });

        const { config, env } = await this.initialLmdbOpen();
        this.log.info(
            {
                path: config.path,
                maxDbs: config.maxDbs,
                mapSize: config.mapSize,
                encoding: config.encoding,
                noSubdir: config.noSubdir,
                overlappingSync: config.overlappingSync,
            },
            `Initialized LMDB ${Version} with stores: ${toString(this.storeNames)} and ${formatNumber(stats(env).totalSize / (1024 * 1024), 4)} MB`,
        );

        // The env and stores opened successfully — promote the marker out of `opening`
        // so an abrupt kill from now on is not mistaken for a startup crash.
        this.ownershipTracker.markRunning();
        this.scheduleBackgroundTasks();
    }

    get(store: StoreName): DataStore {
        const val = this.stores.get(store);
        if (val === undefined) {
            throw new DataStoreError(
                `Store ${store} not found. Available stores: ${[...this.stores.keys()].join(', ')}`,
            );
        }
        return val;
    }

    /**
     * Open the environment and every store, returning the config on success
     * or, deleting the directory and retrying
     */
    private async initialLmdbOpen(): Promise<OpenedEnv> {
        try {
            try {
                return this.createEnvAndStores();
            } catch (e) {
                recordOutOfDiskFailure(this.telemetry, StoreOperation.open, e);

                await this.releaseEnv(this.env);

                this.log.warn(e, 'LMDB unreadable on startup, deleting and recreating');
                return await this.deleteAndRecreate(e);
            }
        } catch (e) {
            this.ownershipTracker.release();
            throw e;
        }
    }

    private createEnvAndStores(): OpenedEnv {
        const { env, config } = createEnv(this.lmdbVersionDir);
        this.env = env;
        this.openPid = processId();

        for (const name of this.storeNames) {
            const store = createDB(this.env, name);
            const existing = this.stores.get(name);

            if (existing) {
                existing.updateStore(store);
            } else {
                this.stores.set(
                    name,
                    new LMDBStore(
                        name,
                        store,
                        (e, op) => this.handleError(e, op),
                        () => {
                            if (processId() !== this.openPid) {
                                return this.recoverFromFork();
                            }
                        },
                        () => this.beginOp(),
                    ),
                );
            }
        }

        return { config, env };
    }

    private beginOp(): () => void {
        // Safe: JS is single-threaded, so closed check + increment is atomic within a tick
        if (this.closed) {
            throw new DataStoreError('Database is closed');
        }
        this.activeOps++;
        return () => {
            this.activeOps--;
        };
    }

    private handleError(error: unknown, op: StoreOperation): Promise<void> | undefined {
        recordOutOfDiskFailure(this.telemetry, op, error);

        if (this.closed) return;
        const msg = extractErrorMessage(error);

        try {
            if (msg.includes('MDB_BAD_RSLOT') || msg.includes("doesn't match env pid")) {
                return this.recoverFromFork();
            }
            return this.recoverFromError();
        } catch (recoveryError) {
            this.log.error(recoveryError, 'LMDB recovery failed');
            this.telemetry.count('recovery.failed', 1);
        }
    }

    private recoverFromFork(): Promise<void> | undefined {
        if (this.destructiveRecovery !== undefined) {
            return this.destructiveRecovery;
        }

        this.telemetry.count('process.forked', 1);
        this.log.warn({ oldPid: this.openPid, newPid: processId() }, 'Process fork detected, reopening LMDB');

        try {
            this.reopenEnv();
        } catch (e) {
            return this.recoverByRecreating(e);
        }
    }

    private recoverFromError(): Promise<void> | undefined {
        if (this.destructiveRecovery !== undefined) {
            return this.destructiveRecovery;
        }

        this.telemetry.count('error.recover', 1);

        try {
            this.reopenEnv();
        } catch (e) {
            return this.recoverByRecreating(e);
        }
    }

    private recoverByRecreating(cause: unknown): Promise<void> {
        const recovery = this.deleteAndRecreate(cause).then(() => {});
        this.destructiveRecovery = recovery;

        const clearRecovery = () => {
            if (this.destructiveRecovery === recovery) {
                this.destructiveRecovery = undefined;
            }
        };

        void recovery.then(clearRecovery, clearRecovery);
        return recovery;
    }

    private async deleteAndRecreate(cause: unknown): Promise<OpenedEnv> {
        try {
            await this.pendingEnvRelease;
            if (this.closed) {
                throw new DataStoreError('Database is closed');
            }
            this.deleteVersionDir(cause);
            return this.reopenEnv();
        } catch (e) {
            this.log.error(e, 'Failed to recreate LMDB after deletion');
            this.telemetry.count('recovery.failed', 1);
            throw e;
        }
    }

    /**
     * Replaces the LMDB environment synchronously. In-flight async operations may
     * fail on the old env, but execAsync's retry logic will recover using the new
     * store handle (updated by recreateStores). Unlike close(), we don't drain
     * activeOps because the env is being replaced, not destroyed.
     *
     * The previous handle is closed *after* the replacement is open: `open()` on an
     * already-open path attaches to the same underlying environment, so keeping the new handle
     * open first keeps the data available across the swap. Closing the old handle is what
     * actually releases it — without this, every reopen leaked an environment handle and a
     * reader slot, and `maxReaders` is finite.
     */
    private reopenEnv(): OpenedEnv {
        this.telemetry.count('env.reopen', 1);
        const previousEnv = this.env;

        let opened: OpenedEnv;
        try {
            opened = this.createEnvAndStores();
        } catch (e) {
            // createEnvAndStores may have already assigned a new (unusable) handle to this.env before
            // throwing. Release both, or each failed reopen orphans a handle and a finite reader slot.
            const partial = this.env;
            if (partial !== undefined && partial !== previousEnv) {
                this.trackEnvRelease(partial);
            }
            this.trackEnvRelease(previousEnv);
            throw e;
        }

        this.trackEnvRelease(previousEnv);
        this.log.warn('Recreated LMDB environment');
        return opened;
    }

    private trackEnvRelease(env: RootDatabase | undefined): void {
        const release = this.releaseEnv(env);
        this.pendingEnvRelease = Promise.all([this.pendingEnvRelease, release]).then(() => {});
    }

    /**
     * Closes the environment being replaced. Without this, every reopen leaked an environment handle
     * and a reader slot, and `maxReaders` is finite.
     *
     * `close()` synchronously aborts the read transaction and clears lmdb's pending
     * `setTimeout(resetReadTxn, 0)`, then drains outstanding reads and writes before releasing the
     * handle. Callers that delete the data directory await it, since an open handle blocks `rmSync`
     * on Windows.
     */
    private async releaseEnv(env: RootDatabase | undefined): Promise<void> {
        if (env === undefined) {
            return;
        }

        if (this.env === env) {
            this.env = undefined;
        }

        try {
            await env.close();
            this.telemetry.count('env.release.closed', 1);
        } catch (error) {
            this.log.warn(error, 'Failed to close the previous LMDB environment after reopen');
            this.telemetry.error('env.release.close.error', error, undefined, {
                captureErrorAttributes: true,
            });
        }
    }

    private deleteVersionDir(cause: unknown) {
        recordDiscardedData(this.telemetry, cause);

        try {
            rmSync(this.lmdbVersionDir, { recursive: true, force: true });
        } catch (e) {
            this.telemetry.error('delete.versions.error', e, undefined, {
                captureErrorAttributes: true,
            });
            this.log.error(e, 'Failed to delete LMDB version directory');
        }
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

    private cleanupOldVersions(): void {
        if (this.closed || !existsSync(this.lmdbDir)) return;

        const entries = readdirSync(this.lmdbDir, { withFileTypes: true });
        for (const entry of entries) {
            try {
                if (
                    entry.isDirectory() &&
                    isOlderVersionDirectory(entry.name, VersionNumber) &&
                    entry.name !== LMDBOwnershipTracker.DirName
                ) {
                    this.telemetry.count('oldVersion.cleanup.count', 1);
                    rmSync(join(this.lmdbDir, entry.name), { recursive: true, force: true });
                }
            } catch (error) {
                this.log.error(error, 'Failed to cleanup old LMDB versions');
                this.telemetry.count('oldVersion.cleanup.error', 1);
            }
        }
    }

    private emitMetrics(): void {
        if (this.closed || this.env === undefined) {
            return;
        }

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

            this.telemetry.histogram('total.usage', 100 * (totalBytes / TotalMaxDatastoreSize), { unit: '%' });
            this.telemetry.histogram('total.size.bytes', totalBytes, { unit: 'By' });

            const usage = diskUsage(this.lmdbDir);
            if (usage !== undefined) {
                recordDiskUsage(this.telemetry, usage);
            }
        } catch (e) {
            this.handleError(e, StoreOperation.stats)?.catch((e) => {
                this.telemetry.error('metrics.error', e, undefined, {
                    captureErrorAttributes: true,
                });
            });
        }
    }

    async close(): Promise<void> {
        if (this.closed) {
            return;
        }

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

        const closeCurrentEnv = this.env?.close();
        await this.pendingEnvRelease;
        await closeCurrentEnv;
        this.ownershipTracker.release();
    }
}

const VersionNumber = 6;
const Version = `v${VersionNumber}`;
const Encoding: 'msgpack' | 'json' | 'string' | 'binary' | 'ordered-binary' = 'msgpack';

function createEnv(lmdbVersionDir: string) {
    const config: RootDatabaseOptionsWithPath = {
        path: lmdbVersionDir,
        maxDbs: 10,
        mapSize: TotalMaxDatastoreSize,
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
