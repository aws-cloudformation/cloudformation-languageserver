import { randomUUID as v4 } from 'crypto';
import fs from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataStore, StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';

describe('LMDB value size handling', () => {
    let lmdbFactory: LMDBStoreFactory;
    let lmdbStore: DataStore;
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-valuesize-tests', v4());

    beforeEach(async () => {
        fs.mkdirSync(testDir, { recursive: true });
        lmdbFactory = new LMDBStoreFactory(testDir);
        await lmdbFactory.initialize();
        lmdbStore = lmdbFactory.get(StoreName.public_schemas);
    });

    afterEach(async () => {
        await lmdbFactory.close();
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    /**
     * Installs a `put` mock that always throws MDB_BAD_VALSIZE. Recovery (triggered by the
     * factory's `onError` handler) replaces the underlying store handle via `updateStore`,
     * so the mock must be re-applied after each such replacement to keep simulating a
     * deterministic (non-transient) size error across retries.
     */
    function mockPutAlwaysRejectsWithBadValSize(): void {
        const internal = lmdbStore as any;
        const throwBadValSize = () => {
            throw new Error('MDB_BAD_VALSIZE: Unsupported size of key/DB name/data, or wrong DUPFIXED size');
        };
        internal.store.put = throwBadValSize;

        const originalUpdateStore = internal.updateStore.bind(internal);
        internal.updateStore = (newStore: unknown) => {
            originalUpdateStore(newStore);
            internal.store.put = throwBadValSize;
        };
    }

    it('should skip caching gracefully (not throw) when a value exceeds LMDB size limits', async () => {
        mockPutAlwaysRejectsWithBadValSize();

        const result = await lmdbStore.put('big-key', 'value');
        expect(result).toBe(false);
        expect(lmdbStore.get('big-key')).toBeUndefined();
    });

    it('should not produce an unhandled promise rejection for MDB_BAD_VALSIZE errors', async () => {
        mockPutAlwaysRejectsWithBadValSize();

        // If put() ever rejects without being awaited/caught here, this would surface as an
        // unhandled rejection in the test process. Awaiting confirms the promise always resolves.
        await expect(lmdbStore.put('key', 'value')).resolves.not.toThrow();
    });

    it('should still throw for errors unrelated to value size', async () => {
        const internal = lmdbStore as any;

        // No-op onError override so recovery doesn't replace the mocked store handle,
        // letting the deterministic failure propagate as expected by the generic retry path.
        (lmdbFactory as any).handleError = () => {
            /* no-op: simulate recovery failure so retry hits the same mocked error */
        };

        internal.store.put = () => {
            throw new Error('MDB_PANIC: unrecoverable');
        };

        await expect(lmdbStore.put('key', 'value')).rejects.toThrow('MDB_PANIC: unrecoverable');
    });

    it('should put normal-sized values without any change in behavior', async () => {
        const result = await lmdbStore.put('normal-key', { data: 'small value' });
        expect(result).toBe(true);
        expect(lmdbStore.get('normal-key')).toEqual({ data: 'small value' });
    });
});
