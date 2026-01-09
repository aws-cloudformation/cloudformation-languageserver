import { Closeable } from '../utils/Closeable';
import { isWindows } from '../utils/Environment';
import { pathToStorage } from '../utils/Storage';
import { FileStoreFactory } from './FileStore';
import { LMDBStoreFactory } from './LMDB';
import { MemoryStoreFactory } from './MemoryStore';

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

    close(): Promise<void>;
}

export interface DataStoreFactoryProvider extends Closeable {
    get(store: StoreName, persistence: Persistence): DataStore;
}

export class MemoryDataStoreFactoryProvider implements DataStoreFactoryProvider {
    private readonly memoryStoreFactory = new MemoryStoreFactory();

    get(store: StoreName, _persistence: Persistence): DataStore {
        return this.getMemoryStore(store);
    }

    getMemoryStore(store: StoreName): DataStore {
        return this.memoryStoreFactory.get(store);
    }

    close(): Promise<void> {
        return this.memoryStoreFactory.close();
    }
}

export class MultiDataStoreFactoryProvider implements DataStoreFactoryProvider {
    private readonly memoryStoreFactory: MemoryStoreFactory;
    private readonly persistedStore: DataStoreFactory;

    constructor() {
        if (isWindows) {
            this.persistedStore = new FileStoreFactory(pathToStorage());
        } else {
            this.persistedStore = new LMDBStoreFactory(pathToStorage());
        }

        this.memoryStoreFactory = new MemoryStoreFactory();
    }

    get(store: StoreName, persistence: Persistence): DataStore {
        if (persistence === Persistence.memory) {
            return this.memoryStoreFactory.get(store);
        }
        return this.persistedStore.get(store);
    }

    close(): Promise<void> {
        return this.persistedStore.close();
    }
}
