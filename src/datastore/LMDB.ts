import { open, Database, RootDatabase } from 'lmdb';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { pathToArtifact } from '../utils/ArtifactsDir';
import { DataStore, DataStoreFactory } from './DataStore';

export class LMDBStore implements DataStore {
    constructor(private readonly store: Database<unknown, string>) {}

    get<T>(key: string): T | undefined {
        return this.store.get(key) as T | undefined;
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.store.put(key, value);
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
    @Telemetry() private readonly telemetry!: ScopedTelemetry;

    private readonly rootDir = pathToArtifact('lmdb');
    private readonly storePath = `${this.rootDir}/${Version}`;

    private readonly env: RootDatabase = open({
        path: this.storePath,
        maxDbs: 10, // 10 max databases
        mapSize: 100 * 1024 * 1024, // 100MB max size
        encoding: Encoding,
    });

    private readonly stores = new Map<string, LMDBStore>();

    constructor() {
        this.registerLMDBGauges();
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
            val = new LMDBStore(database);
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
        this.stores.clear();
        await this.env.close();
    }

    private registerLMDBGauges(): void {
        this.telemetry.registerGaugeProvider('lmdb.global.size_mb', () => stats(this.env).totalSizeMB, { unit: 'MB' });
        this.telemetry.registerGaugeProvider('lmdb.global.max_size_mb', () => stats(this.env).maxSizeMB, {
            unit: 'MB',
        });
        this.telemetry.registerGaugeProvider('lmdb.global.entries', () => stats(this.env).entries, { unit: '1' });
        this.telemetry.registerGaugeProvider('lmdb.global.readers', () => stats(this.env).numReaders, { unit: '1' });
        this.telemetry.registerGaugeProvider('lmdb.stores.count', () => this.stores.size, { unit: '1' });
    }
}

function bytesToMB(bytes: number) {
    return Number((bytes / (1024 * 1024)).toFixed(4));
}

const Version = 'v1';
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
