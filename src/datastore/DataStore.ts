import { Closeable } from '../utils/Closeable';
import { LMDBStoreFactory } from './LMDB';
import { MemoryStoreFactory } from './MemoryStore';

export enum Persistence {
    memory = 'memory',
    local = 'local',
}

export interface DataStore {
    get<T>(key: string): T | undefined;

    put<T>(key: string, value: T): Promise<boolean>;

    remove(key: string): Promise<boolean>;

    clear(): Promise<void>;

    keys(limit: number): ReadonlyArray<string>;

    stats(): unknown;
}

export interface DataStoreFactory extends Closeable {
    getOrCreate(store: string): DataStore;

    storeNames(): ReadonlyArray<string>;

    stats(): unknown;
}

export interface DataStoreFactoryProvider extends Closeable {
    get(store: string, persistence: Persistence): DataStore;
}

export class MemoryDataStoreFactoryProvider implements DataStoreFactoryProvider {
    private readonly memoryStoreFactory = new MemoryStoreFactory();

    get(store: string, _persistence: Persistence): DataStore {
        return this.getMemoryStore(store);
    }

    getMemoryStore(store: string): DataStore {
        return this.memoryStoreFactory.getOrCreate(store);
    }

    close(): Promise<void> {
        return this.memoryStoreFactory.close();
    }
}

export class MultiDataStoreFactoryProvider implements DataStoreFactoryProvider {
    private readonly memoryStoreFactory = new MemoryStoreFactory();
    private readonly lmdbStoreFactory = new LMDBStoreFactory();

    get(store: string, persistence: Persistence): DataStore {
        if (persistence === Persistence.memory) {
            return this.memoryStoreFactory.getOrCreate(store);
        }
        return this.lmdbStoreFactory.getOrCreate(store);
    }

    close(): Promise<void> {
        return this.lmdbStoreFactory.close();
    }
}
