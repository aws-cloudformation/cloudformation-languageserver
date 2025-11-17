import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { DataStore, DataStoreFactory, StoreName } from './DataStore';

export class MemoryStore implements DataStore {
    private readonly store = new Map<string, unknown>();

    constructor(private readonly name: string) {}

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

    keys(limit: number): ReadonlyArray<string> {
        return [...this.store.keys()].slice(0, limit);
    }
}

export class MemoryStoreFactory implements DataStoreFactory {
    @Telemetry({ scope: 'MemoryStore.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly stores = new Map<StoreName, MemoryStore>();

    get(store: StoreName): DataStore {
        let val = this.stores.get(store);
        if (val === undefined) {
            val = new MemoryStore(store);
            this.stores.set(store, val);
        }

        return val;
    }

    storeNames(): ReadonlyArray<string> {
        return [...this.stores.keys()];
    }

    close(): Promise<void> {
        return Promise.resolve();
    }

    private registerMemoryStoreGauges(): void {
        this.telemetry.registerGaugeProvider('stores.count', () => this.stores.size);
        this.telemetry.registerGaugeProvider('global.entries', () => {
            let total = 0;
            for (const store of this.stores.values()) {
                total += store.keys(1000).length;
            }
            return total;
        });
    }
}
