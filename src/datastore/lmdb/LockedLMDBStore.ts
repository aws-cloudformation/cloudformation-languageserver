import { Mutex } from 'async-mutex';
import { Database } from 'lmdb';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { StoreName } from '../DataStore';
import { LMDBStore } from './LMDBStore';

export class LockedLMDBStore extends LMDBStore {
    private readonly lock = new Mutex();

    constructor(name: StoreName, store: Database<unknown, string>) {
        super(name, store, LoggerFactory.getLogger(`LockedLMDBStore.${name}`));
    }

    override get<T>(key: string): T | undefined {
        if (this.lock.isLocked()) {
            throw new LockedError('DataStore is locked');
        }

        return super.get(key);
    }

    override put<T>(key: string, value: T): Promise<boolean> {
        return this.lock.runExclusive(() => {
            return super.put(key, value);
        });
    }

    override remove(key: string): Promise<boolean> {
        return this.lock.runExclusive(() => {
            return super.remove(key);
        });
    }

    override clear(): Promise<void> {
        return this.lock.runExclusive(() => {
            return super.clear();
        });
    }

    override keys(limit: number): ReadonlyArray<string> {
        if (this.lock.isLocked()) {
            throw new LockedError('DataStore is locked');
        }
        return super.keys(limit);
    }
}

class LockedError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
    }
}
