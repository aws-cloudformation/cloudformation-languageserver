import { randomUUID as v4 } from 'crypto';
import fs from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';

describe('LMDB retry after recovery', () => {
    let testDir: string;
    let factory: LMDBStoreFactory;

    beforeEach(() => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-retry-test', v4());
        fs.mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
    });

    afterEach(async () => {
        await factory.close();
    });

    describe('sync operations retry on transient failure', () => {
        it('should return data after transient get() failure triggers recovery and retry', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            const lmdbStore = store as any;
            const realStore = lmdbStore.store;

            realStore.get = () => {
                throw new Error('MDB_CORRUPTED: Located page was wrong type');
            };

            // Recovery replaces the store handle, retry succeeds on the new handle
            const result = store.get<string>('key');
            expect(result).toBe('value');
        });

        it('should throw if recovery fails and retry also fails', () => {
            const store = factory.get(StoreName.public_schemas);
            const lmdbStore = store as any;

            // Mock handleError to not actually recover
            const originalHandleError = (factory as any).handleError.bind(factory);
            (factory as any).handleError = () => {
                /* no-op: simulates recovery failure */
            };

            const realStore = lmdbStore.store;
            realStore.get = () => {
                throw new Error('MDB_CORRUPTED: permanent');
            };

            expect(() => store.get<string>('key')).toThrow('MDB_CORRUPTED: permanent');
            (factory as any).handleError = originalHandleError;
        });

        it('should retry keys() after transient failure', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('k1', 'v1');

            const lmdbStore = store as any;
            const realStore = lmdbStore.store;
            const originalGetKeys = realStore.getKeys.bind(realStore);
            let callCount = 0;

            realStore.getKeys = (opts: any) => {
                callCount++;
                if (callCount === 1) throw new Error('MDB_BAD_TXN: Transaction must abort');
                return originalGetKeys(opts);
            };

            const keys = store.keys(10);
            expect(keys).toContain('k1');
        });
    });

    describe('async operations retry on transient failure', () => {
        it('should succeed after transient put() failure', async () => {
            const store = factory.get(StoreName.public_schemas);
            const lmdbStore = store as any;
            const realStore = lmdbStore.store;

            realStore.put = () => {
                throw new Error('MDB_PAGE_NOTFOUND: Requested page not found');
            };

            await store.put('key', 'value');
            expect(store.get('key')).toBe('value');
        });

        it('should throw on async if retry also fails', async () => {
            const store = factory.get(StoreName.public_schemas);
            const lmdbStore = store as any;

            (factory as any).handleError = () => {
                /* no-op */
            };

            const realStore = lmdbStore.store;
            realStore.put = () => {
                throw new Error('MDB_PANIC: unrecoverable');
            };

            await expect(store.put('key', 'value')).rejects.toThrow('MDB_PANIC: unrecoverable');
        });
    });

    describe('recovery is called exactly once per failure', () => {
        it('should call handleError once on transient failure', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            const handleErrorSpy = vi.spyOn(factory as any, 'handleError');
            const lmdbStore = store as any;
            const realStore = lmdbStore.store;

            realStore.get = () => {
                throw new Error('MDB_CORRUPTED: test');
            };

            store.get<string>('key');
            expect(handleErrorSpy).toHaveBeenCalledTimes(1);
            handleErrorSpy.mockRestore();
        });

        it('should work normally after a successful retry', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key1', 'value1');

            const lmdbStore = store as any;
            const realStore = lmdbStore.store;

            realStore.get = () => {
                throw new Error('MDB_BAD_TXN: abort');
            };

            expect(store.get<string>('key1')).toBe('value1');
            await store.put('key2', 'value2');
            expect(store.get<string>('key2')).toBe('value2');
        });
    });
});
