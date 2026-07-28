import { Database } from 'lmdb';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { DataStore, StoreName } from '../DataStore';
import { StoreOperation } from '../Utils';
import { attachCommitCause, resolveCommitError } from './CommitError';
import { stats, StoreStatsType } from './Stats';

type ErrorHandler = (error: unknown, op: StoreOperation) => void;

export class LMDBStore implements DataStore {
    private readonly telemetry: ScopedTelemetry;

    constructor(
        public readonly name: StoreName,
        private store: Database<unknown, string>,
        private readonly onError: ErrorHandler,
        private readonly validateDatabase: () => void,
        // eslint-disable-next-line unicorn/consistent-function-scoping
        private readonly beginOp: () => () => void = () => () => {},
    ) {
        this.telemetry = TelemetryService.instance.get(`LMDB.${name}`);
    }

    updateStore(store: Database<unknown, string>) {
        this.store = store;
    }

    currentDatabase(): Database<unknown, string> {
        return this.store;
    }

    private exec<T>(op: StoreOperation, fn: () => T): T {
        return this.telemetry.measure(
            op,
            () => {
                const release = this.beginOp();
                try {
                    this.validateDatabase();
                    return fn();
                } catch (e) {
                    this.onError(e, op);
                    this.telemetry.count(`retry.${op}`, 1);
                    this.validateDatabase();
                    return fn();
                } finally {
                    release();
                }
            },
            { captureErrorAttributes: true },
        );
    }

    private async execAsync<T>(op: StoreOperation, fn: () => Promise<T>): Promise<T> {
        return await this.telemetry.measureAsync(
            op,
            async () => {
                const release = this.beginOp();
                try {
                    this.validateDatabase();
                    return await fn();
                } catch (e) {
                    const cause = await resolveCommitError(e);
                    attachCommitCause(e, cause);

                    this.onError(e, op);
                    this.telemetry.count(`retry.${op}`, 1);
                    this.validateDatabase();
                    return await fn();
                } finally {
                    release();
                }
            },
            { captureErrorAttributes: true },
        );
    }

    get<T>(key: string): T | undefined {
        return this.exec(StoreOperation.get, () => this.store.get(key) as T | undefined);
    }

    put<T>(key: string, value: T): Promise<boolean> {
        return this.execAsync(StoreOperation.put, () => this.store.put(key, value));
    }

    remove(key: string): Promise<boolean> {
        return this.execAsync(StoreOperation.remove, () => this.store.remove(key));
    }

    clear(): Promise<void> {
        return this.execAsync(StoreOperation.clear, () => this.store.clearAsync());
    }

    keys(limit: number): ReadonlyArray<string> {
        return this.exec(StoreOperation.keys, () => [...this.store.getKeys({ limit })]);
    }

    stats(): StoreStatsType {
        return this.exec(StoreOperation.stats, () => stats(this.store));
    }
}
