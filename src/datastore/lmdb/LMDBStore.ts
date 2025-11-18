import { Database } from 'lmdb';
import { Logger } from 'pino';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { DataStore, StoreName } from '../DataStore';
import { stats, StoreStatsType } from './Stats';

export class LMDBStore implements DataStore {
    private readonly telemetry: ScopedTelemetry;

    constructor(
        public readonly name: StoreName,
        protected readonly store: Database<unknown, string>,
        private readonly log: Logger = LoggerFactory.getLogger(`LMDB.${name}`),
    ) {
        this.telemetry = TelemetryService.instance.get(`LMDB.${name}`);
    }

    get<T>(key: string): T | undefined {
        return this.telemetry.countExecution('get', () => {
            return this.store.get(key) as T | undefined;
        });
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.telemetry.measureAsync('put', () => {
            return this.store.put(key, value);
        });
    }

    remove(key: string): Promise<boolean> {
        return this.telemetry.countExecutionAsync('remove', () => {
            return this.store.remove(key);
        });
    }

    clear(): Promise<void> {
        return this.telemetry.countExecutionAsync('clear', () => {
            return this.store.clearAsync();
        });
    }

    keys(limit: number): ReadonlyArray<string> {
        return this.telemetry.countExecution('keys', () => {
            return this.store.getKeys({ limit }).asArray;
        });
    }

    stats(): StoreStatsType {
        return stats(this.store);
    }
}
