import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { TelemetryService } from '../telemetry/TelemetryService';
import { DataStore, DataStoreFactory, StoreName } from './DataStore';

export class MemoryStore implements DataStore {
    private readonly store = new Map<string, unknown>();
    private readonly telemetry: ScopedTelemetry;

    constructor(private readonly name: string) {
        this.telemetry = TelemetryService.instance.get(`MemoryStore.${name}`);
    }

    get<T>(key: string): T | undefined {
        const val = this.store.get(key);
        if (val === undefined) return undefined;
        return val as T;
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.telemetry.measureAsync('put', () => {
            this.store.set(key, value);
            return Promise.resolve(true);
        });
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

    size() {
        return this.store.size;
    }
}

export class MemoryStoreFactory implements DataStoreFactory {
    @Telemetry({ scope: 'MemoryStore.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly stores = new Map<StoreName, MemoryStore>();

    constructor() {
        this.registerMemoryStoreGauges();
    }

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
        this.telemetry.registerGaugeProvider('env.entries', () => this.stores.size);

        for (const [name, store] of this.stores.entries()) {
            this.telemetry.registerGaugeProvider(`store.${name}.entries`, () => store.size());
        }
    }
}
