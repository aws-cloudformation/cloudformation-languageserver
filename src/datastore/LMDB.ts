import { readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { open, Database, RootDatabase } from 'lmdb';
import { Logger } from 'pino';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { TelemetryService } from '../telemetry/TelemetryService';
import { pathToArtifact } from '../utils/ArtifactsDir';
import { toString } from '../utils/String';
import { DataStore, DataStoreFactory, StoreName } from './DataStore';
import { encryptionStrategy } from './lmdb/Utils';

export class LMDBStore implements DataStore {
    private readonly log: Logger;
    private readonly telemetry: ScopedTelemetry;

    constructor(
        public readonly name: StoreName,
        private readonly store: Database<unknown, string>,
    ) {
        this.telemetry = TelemetryService.instance.get(`LMDB.${name}`);
        this.log = LoggerFactory.getLogger(`LMDB.${name}`);
        this.log.info('Initialized');
    }

    get<T>(key: string): T | undefined {
        this.log.info(`Get ${key}`);
        return this.store.get(key) as T | undefined;
    }

    async put<T>(key: string, value: T): Promise<boolean> {
        this.log.info(`Put ${key}`);
        return await this.store.put(key, value);
    }

    remove(key: string): Promise<boolean> {
        this.log.info(`Remove ${key}`);
        return this.store.remove(key);
    }

    clear(): Promise<void> {
        this.log.info(`Clear ${this.name}`);
        return this.store.clearAsync();
    }

    keys(limit: number): ReadonlyArray<string> {
        this.log.info(`Keys ${limit}`);
        return this.store.getKeys({ limit }).asArray;
    }

    stats(): StoreStatsType {
        return stats(this.store);
    }
}

export class LMDBStoreFactory implements DataStoreFactory {
    private readonly log: Logger;
    @Telemetry({ scope: 'LMDB.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly storePath: string;
    private readonly timeout: NodeJS.Timeout;
    private readonly env: RootDatabase;

    private readonly stores = new Map<StoreName, LMDBStore>();

    constructor(
        private readonly rootDir: string = pathToArtifact('.lmdb'),
        storeNames: StoreName[] = [StoreName.public_schemas, StoreName.sam_schemas],
    ) {
        this.log = LoggerFactory.getLogger('LMDB.Global');

        this.storePath = join(rootDir, VersionFileName);
        this.log.info(`Initializing LMDB ${Version} at ${this.storePath} with stores: ${toString(storeNames)}`);

        this.env = open({
            path: this.storePath,
            maxDbs: 10,
            mapSize: TotalMaxDbSize,
            remapChunks: true,
            encoding: Encoding,
            encryptionKey: encryptionStrategy(Version),
            commitDelay: 0,
        });

        for (const store of storeNames) {
            const database = this.env.openDB<unknown, string>({
                name: store,
                encoding: Encoding,
            });
            this.stores.set(store, new LMDBStore(store, database));
        }
        this.registerLMDBGauges();

        this.timeout = setTimeout(
            () => {
                this.cleanupOldVersions();
            },
            2 * 60 * 1000,
        );

        console.log(toString(stats(this.env))); // eslint-disable-line no-console
        for (const store of this.stores.values()) {
            console.log(store.name, toString(store.stats())); // eslint-disable-line no-console
        }

        this.log.info('Initialized');
    }

    get(store: StoreName): DataStore {
        this.log.info(`Get store ${store}`);
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
        clearTimeout(this.timeout);
        this.stores.clear();
        await this.env.close();
    }

    private cleanupOldVersions(): void {
        const entries = readdirSync(this.rootDir, { withFileTypes: true });
        for (const entry of entries) {
            try {
                if (entry.name !== VersionFileName) {
                    this.telemetry.count('oldVersion.cleanup.count', 1);
                    rmSync(join(this.rootDir, entry.name), { recursive: true, force: true });
                }
            } catch (error) {
                this.log.error(error, 'Failed to cleanup old LMDB versions');
                this.telemetry.count('oldVersion.cleanup.error', 1);
            }
        }
    }

    private registerLMDBGauges(): void {
        let totalBytes = 0;
        const envStat = stats(this.env);
        this.telemetry.registerGaugeProvider('version', () => Version);
        this.telemetry.registerGaugeProvider('env.size', () => envStat.totalSize, { unit: 'By' });
        this.telemetry.registerGaugeProvider('env.max.size', () => envStat.maxSize, {
            unit: 'By',
        });
        this.telemetry.registerGaugeProvider('env.entries', () => envStat.entries);
        totalBytes += envStat.totalSize;

        for (const [name, store] of this.stores.entries()) {
            const stat = store.stats();
            totalBytes += stat.totalSize;

            this.telemetry.registerGaugeProvider(`store.${name}.size`, () => stat.totalSize, {
                unit: 'By',
            });
            this.telemetry.registerGaugeProvider(`store.${name}.entries`, () => stat.entries);
        }

        this.telemetry.registerGaugeProvider('total.usage', () => 100 * (totalBytes / TotalMaxDbSize), {
            unit: '%',
        });
        this.telemetry.registerGaugeProvider('total.size', () => totalBytes, {
            unit: 'By',
        });
    }
}

const Version = 4;
const VersionFileName = `.v${Version}.lmdb`;
const Encoding: 'msgpack' | 'json' | 'string' | 'binary' | 'ordered-binary' = 'msgpack';
const TotalMaxDbSize = 5 * 250 * 1024 * 1024; // 250MB max size

function stats(store: RootDatabase | Database): StoreStatsType {
    const stats = store.getStats() as Record<string, number>;
    const pageSize = stats['pageSize'];
    const branchPages = stats['treeBranchPageCount'];
    const leafPages = stats['treeLeafPageCount'];
    const overflowPages = stats['overflowPages'];

    return {
        totalSize: (branchPages + leafPages + overflowPages) * pageSize,
        maxSize: stats['mapSize'],
        entries: stats['entryCount'],
        maxReaders: stats['maxReaders'],
        numReaders: stats['numReaders'],
        branchPages,
        leafPages,
        overflowPages,
    };
}

type StoreStatsType = {
    totalSize: number;
    maxSize: number;
    entries: number;
    maxReaders: number; // The configured maximum number of concurrent reader slots
    numReaders: number; // The number of reader slots currently in use
    branchPages: number; // An internal node in the B+ tree that contains keys and pointers to other pages, guiding search operations.
    leafPages: number; // A terminal node in the B+ tree where the actual key-value pairs are stored.
    overflowPages: number; // A separate page used to hold a value that is too large to fit on its corresponding leaf page.
};
