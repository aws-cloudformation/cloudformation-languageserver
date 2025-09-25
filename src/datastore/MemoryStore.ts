import { DataStore, DataStoreFactory } from './DataStore';

export class MemoryStore implements DataStore {
    private readonly store = new Map<string, unknown>();

    get<T>(key: string): T | undefined {
        const val = this.store.get(key);
        if (val === undefined) return undefined;
        return val as T;
    }

    put<T>(key: string, value: T): Promise<boolean> {
        this.store.set(key, value);
        return Promise.resolve(true);
    }

    remove(key: string): Promise<boolean> {
        return Promise.resolve(this.store.delete(key));
    }

    clear(): Promise<void> {
        this.store.clear();
        return Promise.resolve();
    }

    keys(limit: number = Number.POSITIVE_INFINITY): ReadonlyArray<string> {
        return [...this.store.keys()].slice(0, limit);
    }

    stats(): unknown {
        return {
            numKeys: [...this.store.keys()].length,
        };
    }
}

export class MemoryStoreFactory implements DataStoreFactory {
    private readonly stores = new Map<string, MemoryStore>();

    getOrCreate(store: string): DataStore {
        let val = this.stores.get(store);
        if (val === undefined) {
            val = new MemoryStore();
            this.stores.set(store, val);
        }

        return val;
    }

    storeNames(): ReadonlyArray<string> {
        return [...this.stores.keys()];
    }

    stats(): unknown {
        const keys = [];
        const stores: Record<string, number> = {};
        for (const [key, value] of this.stores.entries()) {
            keys.push(key);
            stores[key] = value.keys().length;
        }

        return {
            numStores: keys.length,
            storeNames: keys.sort(),
            stores,
        };
    }

    close(): Promise<void> {
        return Promise.resolve();
    }
}
