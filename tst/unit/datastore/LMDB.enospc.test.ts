import { randomUUID as v4 } from 'crypto';
import fs from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';
import { StoreMetric } from '../../../src/datastore/Utils';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';

/** The wrapper lmdb-js throws when its write thread fails, hiding the cause on a promise. */
function commitFailure(causeMessage: string): Error {
    const commitError = new Promise<never>((_resolve, reject) => {
        reject(new Error(causeMessage));
    });
    return Object.assign(new Error('Commit failed (see commitError for details)'), { commitError });
}

const OutOfDiskMessage = 'No space left on device: Attempting to write page at position 191807488, size 11976704';

describe('LMDB out-of-disk metrics', () => {
    let testDir: string;
    let factory: LMDBStoreFactory;

    beforeEach(async () => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-enospc-test', v4());
        fs.mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
        await factory.initialize();
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await factory.close();
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    function failAllWritesWith(error: Error): void {
        const store = factory.get(StoreName.public_schemas);
        const underlyingStore = (store as unknown as { store: { put: () => Promise<boolean> } }).store;
        underlyingStore.put = () => {
            return Promise.reject(error);
        };
    }

    it('should count an out-of-disk write under its own metric', async () => {
        const count = vi.spyOn(TelemetryService.instance.get('LMDB.Global'), 'count');
        failAllWritesWith(commitFailure(OutOfDiskMessage));

        await factory.get(StoreName.public_schemas).put('us-east-1', 'schemas');

        expect(count).toHaveBeenCalledWith(`put.${StoreMetric.outOfDisk}`, 1);
    });

    it('should attribute the metric to the operation that hit the full disk', async () => {
        const count = vi.spyOn(TelemetryService.instance.get('LMDB.Global'), 'count');
        const store = factory.get(StoreName.public_schemas);
        const underlyingStore = (store as unknown as { store: { remove: () => Promise<boolean> } }).store;
        underlyingStore.remove = () => Promise.reject(commitFailure(OutOfDiskMessage));

        await store.remove('us-east-1');

        expect(count).toHaveBeenCalledWith(`remove.${StoreMetric.outOfDisk}`, 1);
        expect(count).not.toHaveBeenCalledWith(`put.${StoreMetric.outOfDisk}`, 1);
    });

    it('should not count a transient commit failure as out of disk', async () => {
        const count = vi.spyOn(TelemetryService.instance.get('LMDB.Global'), 'count');
        failAllWritesWith(commitFailure('MDB_BAD_TXN: Transaction must abort'));

        await factory.get(StoreName.public_schemas).put('us-east-1', 'schemas');

        expect(count).not.toHaveBeenCalledWith(`put.${StoreMetric.outOfDisk}`, 1);
    });

    it('should not count an out-of-disk write as a discarded database', async () => {
        // A full disk leaves the stored bytes intact, so it must not inflate the corruption signal.
        const count = vi.spyOn(TelemetryService.instance.get('LMDB.Global'), 'count');
        failAllWritesWith(commitFailure(OutOfDiskMessage));

        await factory.get(StoreName.public_schemas).put('us-east-1', 'schemas');

        expect(count).not.toHaveBeenCalledWith(expect.stringContaining(StoreMetric.dataDiscarded), expect.anything());
    });

    it('should report the real errno rather than the opaque commit wrapper', async () => {
        const error = vi.spyOn(TelemetryService.instance.get('LMDB.Global'), 'error');
        failAllWritesWith(commitFailure(OutOfDiskMessage));

        await factory.get(StoreName.public_schemas).put('us-east-1', 'schemas');

        expect(error).toHaveBeenCalledWith(
            StoreMetric.outOfDisk,
            expect.objectContaining({ cause: expect.objectContaining({ message: OutOfDiskMessage }) }),
            undefined,
            expect.objectContaining({ attributes: { operation: 'put' } }),
        );
    });

    it('should detect an out-of-disk failure reported directly as an ENOSPC error', async () => {
        const count = vi.spyOn(TelemetryService.instance.get('LMDB.Global'), 'count');
        failAllWritesWith(Object.assign(new Error('write failed'), { code: 'ENOSPC' }));

        await factory.get(StoreName.public_schemas).put('us-east-1', 'schemas');

        expect(count).toHaveBeenCalledWith(`put.${StoreMetric.outOfDisk}`, 1);
    });

    it('should still retry a transient commit failure that is not out of disk', async () => {
        const store = factory.get(StoreName.public_schemas);

        // Recovery replaces the store handle, so the retry runs against a fresh database rather
        // than this stub — the observable result is that the write lands despite the first failure.
        failAllWritesWith(commitFailure('MDB_BAD_TXN: Transaction must abort'));

        await expect(store.put('us-east-1', 'schemas')).resolves.toBe(true);
        expect(store.get<string>('us-east-1')).toBe('schemas');
    });

    it('should fail only the current handle before retrying on its replacement', async () => {
        const store = factory.get(StoreName.public_schemas);
        const underlyingStore = (store as unknown as { store: { put: () => Promise<boolean> } }).store;
        const failCurrentHandle = vi.fn(() => Promise.reject(commitFailure('MDB_BAD_TXN: Transaction must abort')));
        underlyingStore.put = failCurrentHandle;

        await expect(store.put('us-east-1', 'schemas')).resolves.toBe(true);

        expect(failCurrentHandle).toHaveBeenCalledOnce();
        expect(store.get<string>('us-east-1')).toBe('schemas');
    });
});
