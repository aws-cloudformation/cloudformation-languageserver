import { readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { open, Database, RootDatabase } from 'lmdb';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { TelemetryService } from '../telemetry/TelemetryService';
import { pathToArtifact } from '../utils/ArtifactsDir';
import { DataStore, DataStoreFactory } from './DataStore';
import { encryptionStrategy } from './lmdb/Utils';

const log = LoggerFactory.getLogger('LMDB');

export class LMDBStore implements DataStore {
    private readonly telemetry: ScopedTelemetry;

    constructor(
        private readonly name: string,
        private readonly store: Database<unknown, string>,
    ) {
        this.telemetry = TelemetryService.instance.get(`LMDB.${name}`);
    }

    get<T>(key: string): T | undefined {
        return this.store.get(key) as T | undefined;
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.telemetry.measureAsync('put', () => {
            return this.store.put(key, value);
        });
    }

    remove(key: string): Promise<boolean> {
        return this.store.remove(key);
    }

    clear(): Promise<void> {
        return this.store.clearAsync();
    }

    keys(limit: number = Number.POSITIVE_INFINITY): ReadonlyArray<string> {
        return this.store.getKeys({ limit }).asArray;
    }

    stats(): StoreStatsType {
        return stats(this.store);
    }
}

export class LMDBStoreFactory implements DataStoreFactory {
    @Telemetry({ scope: 'LMDB.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly rootDir = pathToArtifact('lmdb');
    private readonly storePath = join(this.rootDir, Version);
    private readonly timeout: NodeJS.Timeout;

    private readonly env: RootDatabase = open({
        path: this.storePath,
        maxDbs: 10, // 10 max databases
        mapSize: 100 * 1024 * 1024, // 100MB max size
        encoding: Encoding,
        encryptionKey: encryptionStrategy(Version),
    });

    private readonly stores = new Map<string, LMDBStore>();

    constructor() {
        this.registerLMDBGauges();

        this.timeout = setTimeout(
            () => {
                this.cleanupOldVersions();
            },
            2 * 60 * 1000,
        );
    }

    getOrCreate(store: string): DataStore {
        let val = this.stores.get(store);
        if (val === undefined) {
            let database;
            this.env.transactionSync(() => {
                database = this.env.openDB<unknown, string>({
                    name: store,
                    encoding: Encoding,
                });
            });

            if (database === undefined) {
                throw new Error(`Failed to open LMDB store ${store}`);
            }
            val = new LMDBStore(store, database);
            this.stores.set(store, val);
        }

        return val;
    }

    storeNames(): ReadonlyArray<string> {
        return [...this.stores.keys()];
    }

    stats(): Record<string, StoreStatsType> {
        const result: Record<string, StoreStatsType> = {};
        result['global'] = stats(this.env);

        for (const [key, value] of this.stores.entries()) {
            result[key] = value.stats();
        }

        return result;
    }

    async close(): Promise<void> {
        // Clear the stores map but don't close individual stores
        // LMDB will close them when we close the environment
        clearTimeout(this.timeout);
        this.stores.clear();
        await this.env.close();
    }

    private cleanupOldVersions(): void {
        const entries = readdirSync(this.rootDir, { withFileTypes: true });
        for (const entry of entries) {
            try {
                if (entry.isDirectory() && entry.name !== Version) {
                    this.telemetry.count('oldVersion.cleanup.count', 1, { unit: '1' });
                    rmSync(join(this.rootDir, entry.name), { recursive: true, force: true });
                }
            } catch (error) {
                log.error(error, 'Failed to cleanup old LMDB versions');
                this.telemetry.count('oldVersion.cleanup.error', 1, { unit: '1' });
            }
        }
    }

    private registerLMDBGauges(): void {
        this.telemetry.registerGaugeProvider('version', () => VersionNumber);
        this.telemetry.registerGaugeProvider('global.size_mb', () => stats(this.env).totalSizeMB, { unit: 'MB' });
        this.telemetry.registerGaugeProvider('global.max_size_mb', () => stats(this.env).maxSizeMB, {
            unit: 'MB',
        });
        this.telemetry.registerGaugeProvider('global.entries', () => stats(this.env).entries);
        this.telemetry.registerGaugeProvider('global.readers', () => stats(this.env).numReaders);
        this.telemetry.registerGaugeProvider('stores.count', () => this.stores.size);
    }
}

function bytesToMB(bytes: number) {
    return Number((bytes / (1024 * 1024)).toFixed(4));
}

const VersionNumber = 2;
const Version = `v${VersionNumber}`;
const Encoding: 'msgpack' | 'json' | 'string' | 'binary' | 'ordered-binary' = 'msgpack';

function stats(store: RootDatabase | Database): StoreStatsType {
    const stats = store.getStats() as Record<string, number>;
    const pageSize = stats['pageSize'];
    const branchPages = stats['treeBranchPageCount'];
    const leafPages = stats['treeLeafPageCount'];
    const overflowPages = stats['overflowPages'];

    return {
        totalSizeMB: bytesToMB((branchPages + leafPages + overflowPages) * pageSize),
        maxSizeMB: bytesToMB(stats['mapSize']),
        entries: stats['entryCount'],
        maxReaders: stats['maxReaders'],
        numReaders: stats['numReaders'],
        branchPages,
        leafPages,
        overflowPages,
    };
}

type StoreStatsType = {
    totalSizeMB: number;
    maxSizeMB: number;
    entries: number;
    maxReaders: number; // The configured maximum number of concurrent reader slots
    numReaders: number; // The number of reader slots currently in use
    branchPages: number; // An internal node in the B+ tree that contains keys and pointers to other pages, guiding search operations.
    leafPages: number; // A terminal node in the B+ tree where the actual key-value pairs are stored.
    overflowPages: number; // A separate page used to hold a value that is too large to fit on its corresponding leaf page.
};
