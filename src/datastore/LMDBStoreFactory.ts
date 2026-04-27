import { existsSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { open, RootDatabase, RootDatabaseOptionsWithPath } from 'lmdb';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { isWindows } from '../utils/Environment';
import { extractErrorMessage } from '../utils/Errors';
import { formatNumber, toString } from '../utils/String';
import { DataStore, DataStoreFactory, PersistedStores, StoreName } from './DataStore';
import { LMDBStore } from './lmdb/LMDBStore';
import { stats } from './lmdb/Stats';
import { encryptionStrategy } from './lmdb/Utils';

export class LMDBStoreFactory implements DataStoreFactory {
    private readonly log = LoggerFactory.getLogger('LMDB.Global');
    @Telemetry({ scope: 'LMDB.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly lmdbDir: string;
    private readonly timeout: NodeJS.Timeout;
    private readonly metricsInterval: NodeJS.Timeout;

    private env: RootDatabase;
    private openPid = process.pid;
    private closed = false;

    private readonly stores = new Map<StoreName, LMDBStore>();

    constructor(
        rootDir: string,
        public readonly storeNames = PersistedStores,
    ) {
        this.lmdbDir = join(rootDir, 'lmdb');

        let config: RootDatabaseOptionsWithPath;
        try {
            const result = createEnv(this.lmdbDir);
            this.env = result.env;
            config = result.config;
        } catch (e) {
            this.log.warn(e, 'LMDB corrupted on startup, deleting and recreating');
            this.deleteVersionDir();
            const result = createEnv(this.lmdbDir);
            this.env = result.env;
            config = result.config;
        }

        try {
            for (const store of storeNames) {
                this.addStore(store);
            }
        } catch (e) {
            this.log.warn(e, 'Store corrupted on startup, deleting and recreating');
            this.stores.clear();
            void this.env.close();
            this.deleteVersionDir();
            this.env = createEnv(this.lmdbDir).env;
            for (const store of storeNames) {
                this.addStore(store);
            }
        }

        this.metricsInterval = setInterval(() => {
            this.emitMetrics();
        }, 60 * 1000);

        this.timeout = setTimeout(
            () => {
                this.cleanupOldVersions();
            },
            2 * 60 * 1000,
        );

        this.log.info(
            {
                path: config.path,
                maxDbs: config.maxDbs,
                mapSize: config.mapSize,
                encoding: config.encoding,
                noSubdir: config.noSubdir,
                overlappingSync: config.overlappingSync,
            },
            `Initialized LMDB ${Version} with stores: ${toString(storeNames)} and ${formatNumber(stats(this.env).totalSize / (1024 * 1024), 4)} MB`,
        );
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

        clearInterval(this.metricsInterval);
        clearTimeout(this.timeout);
        this.stores.clear();
        await this.env.close();
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
        if (process.pid !== this.openPid) {
            this.telemetry.count('process.forked', 1);
            this.log.warn({ oldPid: this.openPid, newPid: process.pid }, 'Process fork detected, reopening LMDB');

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
        this.log.warn({ oldPid: this.openPid, newPid: process.pid }, 'Process fork detected, reopening LMDB');

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

    private reopenEnv(): void {
        this.telemetry.count('env.reopen', 1);
        this.env = createEnv(this.lmdbDir).env;
        this.openPid = process.pid;
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
                if (entry.name !== Version) {
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

const VersionNumber = 5;
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
