import { Database } from 'lmdb';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { DataStore, StoreName } from '../DataStore';
import { stats, StoreStatsType } from './Stats';

type ErrorHandler = (error: unknown) => void;

export class LMDBStore implements DataStore {
    private readonly telemetry: ScopedTelemetry;

    constructor(
        public readonly name: StoreName,
        private store: Database<unknown, string>,
        private readonly onError?: ErrorHandler,
        private readonly validateDatabase?: () => void,
    ) {
        this.telemetry = TelemetryService.instance.get(`LMDB.${name}`);
    }

    updateStore(store: Database<unknown, string>) {
        this.store = store;
    }

    private exec<T>(op: string, fn: () => T): T {
        return this.telemetry.measure(op, () => {
            try {
                this.validateDatabase?.();
                return fn();
            } catch (e) {
                this.onError?.(e);
                throw e;
            }
        });
    }

    private async execAsync<T>(op: string, fn: () => Promise<T>): Promise<T> {
        return await this.telemetry.measureAsync(op, async () => {
            try {
                this.validateDatabase?.();
                return await fn();
            } catch (e) {
                this.onError?.(e);
                throw e;
            }
        });
    }

    get<T>(key: string): T | undefined {
        return this.exec('get', () => this.store.get(key) as T | undefined);
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.execAsync('put', () => this.store.put(key, value));
    }

    remove(key: string): Promise<boolean> {
        return this.execAsync('remove', () => this.store.remove(key));
    }

    clear(): Promise<void> {
        return this.execAsync('clear', () => this.store.clearAsync());
    }

    keys(limit: number): ReadonlyArray<string> {
        return this.exec('keys', () => this.store.getKeys({ limit }).asArray);
    }

    stats(): StoreStatsType {
        return this.exec('stats', () => stats(this.store));
    }
}
