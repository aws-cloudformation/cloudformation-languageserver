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
        return this.telemetry.countExecution('get', () => {
            return this.store.get(key) as T | undefined;
        });
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.telemetry.countExecutionAsync('put', () => {
            this.store.set(key, value);
            return Promise.resolve(true);
        });
    }

    remove(key: string): Promise<boolean> {
        return this.telemetry.countExecutionAsync('remove', () => {
            return Promise.resolve(this.store.delete(key));
        });
    }

    clear(): Promise<void> {
        return this.telemetry.countExecutionAsync('clear', () => {
            this.store.clear();
            return Promise.resolve();
        });
    }

    keys(limit: number): ReadonlyArray<string> {
        return this.telemetry.countExecution('keys', () => {
            return [...this.store.keys()].slice(0, limit);
        });
    }

    size() {
        return this.store.size;
    }
}

export class MemoryStoreFactory implements DataStoreFactory {
    @Telemetry({ scope: 'MemoryStore.Global' }) private readonly telemetry!: ScopedTelemetry;

    private readonly metricsInterval: NodeJS.Timeout;
    private readonly stores = new Map<StoreName, MemoryStore>();

    constructor() {
        this.metricsInterval = setInterval(() => {
            this.emitMetrics();
        }, 60 * 1000);
    }

    get(store: StoreName): DataStore {
        let val = this.stores.get(store);
        if (val === undefined) {
            val = new MemoryStore(store);
            this.stores.set(store, val);
        }

        return val;
    }

    get storeNames(): ReadonlyArray<string> {
        return [...this.stores.keys()];
    }

    close(): Promise<void> {
        clearInterval(this.metricsInterval);
        return Promise.resolve();
    }

    private emitMetrics(): void {
        this.telemetry.histogram('env.entries', this.stores.size);

        for (const [name, store] of this.stores.entries()) {
            this.telemetry.histogram(`store.${name}.entries`, store.size());
        }
    }
}
