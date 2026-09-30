import { FeatureFlag } from '../featureFlag/FeatureFlagI';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { Closeable, closeSafely } from '../utils/Closeable';
import { isWindows } from '../utils/Environment';
import { pathToStorage } from '../utils/Storage';
import { FileStoreFactory } from './FileStoreFactory';
import { checkLmdbAvailability, LmdbAvailability } from './lmdb/LMDBModule';
import { LMDBStoreFactory } from './LMDBStoreFactory';
import { MemoryStoreFactory } from './MemoryStore';

export const TotalMaxDatastoreSize = 250 * 1024 * 1024; // 250MB max size

export enum Persistence {
    memory = 'memory',
    local = 'local',
}

export enum StoreName {
    public_schemas = 'public_schemas',
    sam_schemas = 'sam_schemas',
    private_schemas = 'private_schemas',
}

export const PersistedStores: ReadonlyArray<StoreName> = [StoreName.public_schemas, StoreName.sam_schemas];

export interface DataStore {
    get<T>(key: string): T | undefined;

    put<T>(key: string, value: T): Promise<boolean>;

    remove(key: string): Promise<boolean>;

    clear(): Promise<void>;

    keys(limit: number): ReadonlyArray<string>;
}

export interface DataStoreFactory extends Closeable {
    get(store: StoreName): DataStore;

    storeNames: ReadonlyArray<string>;

    initialize(): Promise<void>;

    close(): Promise<void>;
}

export interface DataStoreFactoryProvider extends Closeable {
    get(store: StoreName, persistence: Persistence): DataStore;

    initialize(): Promise<void>;
}

export class MemoryDataStoreFactoryProvider implements DataStoreFactoryProvider {
    private readonly memoryStoreFactory = new MemoryStoreFactory();

    get(store: StoreName, _persistence: Persistence): DataStore {
        return this.getMemoryStore(store);
    }

    getMemoryStore(store: StoreName): DataStore {
        return this.memoryStoreFactory.get(store);
    }

    initialize(): Promise<void> {
        return this.memoryStoreFactory.initialize();
    }

    close(): Promise<void> {
        return this.memoryStoreFactory.close();
    }
}

export class MultiDataStoreFactoryProvider implements DataStoreFactoryProvider {
    private readonly log = LoggerFactory.getLogger('DataStore');
    @Telemetry({ scope: 'DataStore' }) private readonly telemetry!: ScopedTelemetry;

    private readonly memoryStoreFactory: MemoryStoreFactory;
    private readonly persistedStore: DataStoreFactory;

    constructor(fileDbFeatureFlag: FeatureFlag, probeLmdb: () => LmdbAvailability = checkLmdbAvailability) {
        this.persistedStore = this.createPersistedStore(fileDbFeatureFlag, probeLmdb);
        this.memoryStoreFactory = new MemoryStoreFactory();
    }

    private createPersistedStore(fileDbFeatureFlag: FeatureFlag, probeLmdb: () => LmdbAvailability): DataStoreFactory {
        const rootDir = pathToStorage();
        if (fileDbFeatureFlag.isEnabled() || isWindows) {
            return new FileStoreFactory(rootDir);
        }

        const lmdb = probeLmdb();
        if (!lmdb.available) {
            this.log.warn(lmdb.cause, 'LMDB native module cannot be loaded on this host, falling back to FileDB');
            this.telemetry.error('lmdb.unavailable', lmdb.cause, undefined, { captureErrorAttributes: true });
            return new FileStoreFactory(rootDir);
        }
        return new LMDBStoreFactory(rootDir);
    }

    get(store: StoreName, persistence: Persistence): DataStore {
        if (persistence === Persistence.memory) {
            return this.memoryStoreFactory.get(store);
        }
        return this.persistedStore.get(store);
    }

    async initialize(): Promise<void> {
        await this.memoryStoreFactory.initialize();
        await this.persistedStore.initialize();
    }

    async close(): Promise<void> {
        await closeSafely(this.memoryStoreFactory, this.persistedStore);
    }
}
