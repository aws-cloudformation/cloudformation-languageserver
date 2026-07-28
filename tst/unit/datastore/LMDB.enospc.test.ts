import { randomUUID as v4 } from 'crypto';
import fs from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';

/** The wrapper lmdb-js throws when its write thread fails, hiding the cause on a promise. */
function commitFailure(causeMessage: string): Error {
    const commitError = new Promise<never>((_resolve, reject) => {
        reject(new Error(causeMessage));
    });
    return Object.assign(new Error('Commit failed (see commitError for details)'), { commitError });
}

const OutOfDiskMessage = 'No space left on device: Attempting to write page at position 191807488, size 11976704';

describe('LMDB out-of-disk write failures', () => {
    let testDir: string;
    let factory: LMDBStoreFactory;

    beforeEach(async () => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-enospc-test', v4());
        fs.mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
        await factory.initialize();
    });

    afterEach(async () => {
        await factory.close();
    });

    it('should propagate the failure without retrying when the disk is full', async () => {
        const store = factory.get(StoreName.public_schemas);
        const underlyingStore = (store as unknown as { store: { put: () => Promise<boolean> } }).store;
        let putAttempts = 0;

        underlyingStore.put = () => {
            putAttempts++;
            return Promise.reject(commitFailure(OutOfDiskMessage));
        };

        await expect(store.put('us-east-1', 'schemas')).rejects.toThrow('Commit failed');
        expect(putAttempts).toBe(1);
    });

    it('should not run environment recovery when the disk is full', async () => {
        const store = factory.get(StoreName.public_schemas);
        const recoverFromError = vi.spyOn(factory as unknown as { recoverFromError: () => void }, 'recoverFromError');
        const underlyingStore = (store as unknown as { store: { put: () => Promise<boolean> } }).store;
        underlyingStore.put = () => Promise.reject(commitFailure(OutOfDiskMessage));

        await expect(store.put('us-east-1', 'schemas')).rejects.toThrow('Commit failed');

        expect(recoverFromError).not.toHaveBeenCalled();
    });

    it('should detect an out-of-disk failure reported directly as an ENOSPC error', async () => {
        const store = factory.get(StoreName.public_schemas);
        const underlyingStore = (store as unknown as { store: { put: () => Promise<boolean> } }).store;
        let putAttempts = 0;

        underlyingStore.put = () => {
            putAttempts++;
            return Promise.reject(Object.assign(new Error('write failed'), { code: 'ENOSPC' }));
        };

        await expect(store.put('us-east-1', 'schemas')).rejects.toThrow('write failed');
        expect(putAttempts).toBe(1);
    });

    it('should still retry a transient commit failure that is not out of disk', async () => {
        const store = factory.get(StoreName.public_schemas);
        const underlyingStore = (store as unknown as { store: { put: (k: string, v: unknown) => Promise<boolean> } })
            .store;

        // Recovery replaces the store handle, so the retry runs against a fresh database rather
        // than this stub — the observable result is that the write lands despite the first failure.
        underlyingStore.put = () => Promise.reject(commitFailure('MDB_BAD_TXN: Transaction must abort'));

        await expect(store.put('us-east-1', 'schemas')).resolves.toBe(true);
        expect(store.get<string>('us-east-1')).toBe('schemas');
    });
});
