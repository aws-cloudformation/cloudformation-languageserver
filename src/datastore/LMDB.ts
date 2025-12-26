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

        const { env, config } = createEnv(this.lmdbDir);
        this.env = env;

        for (const store of storeNames) {
            const database = createDB(this.env, store);

            this.stores.set(
                store,
                new LMDBStore(
                    store,
                    database,
                    (e) => this.handleError(e),
                    () => this.ensureValidEnv(),
                ),
            );
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
            `Initialized LMDB ${Version} with stores: ${toString(storeNames)} and ${formatNumber(this.totalBytes() / (1024 * 1024), 4)} MB`,
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

        if (msg.includes('MDB_BAD_RSLOT') || msg.includes("doesn't match env pid")) {
            this.recoverFromFork();
        } else if (
            msg.includes('MDB_CURSOR_FULL') ||
            msg.includes('MDB_CORRUPTED') ||
            msg.includes('MDB_PAGE_NOTFOUND') ||
            msg.includes('MDB_BAD_TXN') ||
            msg.includes('Commit failed') ||
            msg.includes('closed database')
        ) {
            this.recoverFromCorruption();
        }
    }

    private ensureValidEnv(): void {
        if (process.pid !== this.openPid) {
            this.telemetry.count('process.fork', 1);
            this.log.warn({ oldPid: this.openPid, newPid: process.pid }, 'Process fork detected');
            this.reopenEnv();

            // Update all stores with new handles
            for (const store of this.storeNames) {
                this.stores.get(store)?.updateStore(createDB(this.env, store));
            }
        }
    }

    private recoverFromFork(): void {
        this.telemetry.count('forked', 1);
        this.log.warn({ oldPid: this.openPid, newPid: process.pid }, 'Fork detected, reopening LMDB');
        this.reopenEnv();
        this.recreateStores();
    }

    private recoverFromCorruption(): void {
        this.telemetry.count('corrupted', 1);
        this.log.warn('Corruption detected, reopening LMDB');
        this.reopenEnv();
        this.recreateStores();
    }

    private reopenEnv(): void {
        this.env = createEnv(this.lmdbDir).env;
        this.openPid = process.pid;
        this.log.warn('Recreated LMDB environment');
    }

    private recreateStores(): void {
        for (const name of this.storeNames) {
            const database = this.env.openDB<unknown, string>({ name, encoding: Encoding });
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
            const totalBytes = this.totalBytes();

            const envStat = stats(this.env);
            this.telemetry.histogram('version', VersionNumber);
            this.telemetry.histogram('env.size.bytes', envStat.totalSize, { unit: 'By' });
            this.telemetry.histogram('env.max.size.bytes', envStat.maxSize, {
                unit: 'By',
            });
            this.telemetry.histogram('env.entries', envStat.entries);

            for (const [name, store] of this.stores.entries()) {
                const stat = store.stats();
                this.telemetry.histogram(`store.${name}.size.bytes`, stat.totalSize, { unit: 'By' });
                this.telemetry.histogram(`store.${name}.entries`, stat.entries);
            }

            this.telemetry.histogram('total.usage', 100 * (totalBytes / TotalMaxDbSize), { unit: '%' });
            this.telemetry.histogram('total.size.bytes', totalBytes, { unit: 'By' });
        } catch (e) {
            this.handleError(e);
        }
    }

    private totalBytes() {
        let totalBytes = 0;
        totalBytes += stats(this.env).totalSize;

        for (const store of this.stores.values()) {
            totalBytes += store.stats().totalSize;
        }

        return totalBytes;
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
