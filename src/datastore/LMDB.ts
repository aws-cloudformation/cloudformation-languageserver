import { readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { open, RootDatabase, RootDatabaseOptionsWithPath } from 'lmdb';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { isWindows } from '../utils/Environment';
import { formatNumber, toString } from '../utils/String';
import { DataStore, DataStoreFactory, StoreName } from './DataStore';
import { LMDBStore } from './lmdb/LMDBStore';
import { stats } from './lmdb/Stats';
import { encryptionStrategy } from './lmdb/Utils';

export class LMDBStoreFactory implements DataStoreFactory {
    private readonly log = LoggerFactory.getLogger('LMDB.Global');
    @Telemetry({ scope: 'LMDB.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly lmdbDir: string;
    private readonly timeout: NodeJS.Timeout;
    private readonly metricsInterval: NodeJS.Timeout;
    private readonly env: RootDatabase;

    private readonly stores = new Map<StoreName, LMDBStore>();

    constructor(rootDir: string, storeNames: StoreName[] = [StoreName.public_schemas, StoreName.sam_schemas]) {
        this.lmdbDir = join(rootDir, 'lmdb');

        const config: RootDatabaseOptionsWithPath = {
            path: join(this.lmdbDir, Version),
            maxDbs: 10,
            mapSize: TotalMaxDbSize,
            encoding: Encoding,
            encryptionKey: encryptionStrategy(VersionNumber),
        };

        if (isWindows) {
            config.noSubdir = false;
            config.overlappingSync = false;
        }

        this.env = open(config);

        for (const store of storeNames) {
            const database = this.env.openDB<unknown, string>({
                name: store,
                encoding: Encoding,
            });

            this.stores.set(store, new LMDBStore(store, database));
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

    storeNames(): ReadonlyArray<string> {
        return [...this.stores.keys()];
    }

    async close(): Promise<void> {
        // Clear the stores map but don't close individual stores
        // LMDB will close them when we close the environment
        clearInterval(this.metricsInterval);
        clearTimeout(this.timeout);
        this.stores.clear();
        await this.env.close();
    }

    private cleanupOldVersions(): void {
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

            this.telemetry.histogram(`store.${name}.size.bytes`, stat.totalSize, {
                unit: 'By',
            });
            this.telemetry.histogram(`store.${name}.entries`, stat.entries);
        }

        this.telemetry.histogram('total.usage', 100 * (totalBytes / TotalMaxDbSize), {
            unit: '%',
        });
        this.telemetry.histogram('total.size.bytes', totalBytes, {
            unit: 'By',
        });
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
