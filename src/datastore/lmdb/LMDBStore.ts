import { Database } from 'lmdb';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { TelemetryService } from '../../telemetry/TelemetryService';
import { DataStore, StoreName } from '../DataStore';
import { ErrorHandler, isValueTooLarge, StoreOperation } from '../Utils';
import { attachCommitCause, resolveCommitError } from './CommitError';
import { stats, StoreStatsType } from './Stats';

export class LMDBStore implements DataStore {
    private readonly telemetry: ScopedTelemetry;
    private readonly log: ReturnType<typeof LoggerFactory.getLogger>;

    constructor(
        public readonly name: StoreName,
        private store: Database<unknown, string>,
        private readonly onError: ErrorHandler,
        private readonly validateDatabase: () => void | Promise<void>,
        // eslint-disable-next-line unicorn/consistent-function-scoping
        private readonly beginOp: () => () => void = () => () => {},
    ) {
        this.telemetry = TelemetryService.instance.get(`LMDB.${name}`);
        this.log = LoggerFactory.getLogger(`LMDB.${name}`);
    }

    updateStore(store: Database<unknown, string>) {
        this.store = store;
    }

    private exec<T>(op: StoreOperation, fn: () => T): T {
        return this.telemetry.measure(
            op,
            () => {
                const release = this.beginOp();
                try {
                    const initialRecovery = this.validateDatabase();
                    if (initialRecovery !== undefined) {
                        throw new Error('Database recovery is in progress');
                    }

                    try {
                        return fn();
                    } catch (e) {
                        const recovery = this.onError(e, op);
                        if (recovery !== undefined) {
                            throw e;
                        }

                        this.telemetry.count(`retry.${op}`, 1);
                        const retryRecovery = this.validateDatabase();
                        if (retryRecovery !== undefined) {
                            throw e;
                        }
                        return fn();
                    }
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
                    await this.validateDatabase();

                    try {
                        return await fn();
                    } catch (e) {
                        const cause = await resolveCommitError(e);
                        attachCommitCause(e, cause);

                        // MDB_BAD_VALSIZE is deterministic - the same value fails identically after
                        // recovery, so retrying (and the recovery work itself) is wasted. Skip
                        // straight to the caller instead of going through the generic retry path.
                        if (isValueTooLarge(cause ?? e)) {
                            throw e;
                        }

                        await this.onError(e, op);
                        this.telemetry.count(`retry.${op}`, 1);
                        await this.validateDatabase();
                        return await fn();
                    }
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

    async put<T>(key: string, value: T): Promise<boolean> {
        try {
            return await this.execAsync(StoreOperation.put, () => this.store.put(key, value));
        } catch (error) {
            if (isValueTooLarge(error)) {
                this.telemetry.error('put.valueTooLarge', error, undefined, {
                    captureErrorAttributes: true,
                    attributes: { key },
                });
                this.log.warn({ store: this.name, key }, 'Skipping cache write: value exceeds LMDB size limits');
                return false;
            }
            throw error;
        }
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
