import { randomUUID as v4 } from 'crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataStore, StoreName } from '../../../src/datastore/DataStore';
import { EncryptedFile } from '../../../src/datastore/file/EncryptedFile';
import { FileStoreFactory } from '../../../src/datastore/FileStoreFactory';
import { DiscardReason, StoreMetric } from '../../../src/datastore/Utils';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';

/**
 * Both metrics under test are recorded on the factory's scope: out-of-disk through
 * `FileStoreFactory.onError`, discarded data through the parent telemetry the factory hands each
 * store. So these tests drive the real factory rather than constructing a `KeyedFileStore` with a
 * stub handler — a stub satisfies the type but records nothing, which would let the wiring rot
 * without failing anything. Mirrors `LMDB.enospc.test.ts`.
 */
const GlobalScope = 'FileStore.Global';

describe('FileStore out-of-disk and unreadable files', () => {
    let testDir: string;
    let factory: FileStoreFactory;
    let store: DataStore;

    beforeEach(() => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'filestore-enospc-tests', v4());
        mkdirSync(testDir, { recursive: true });
        factory = new FileStoreFactory(testDir);
        store = factory.get(StoreName.public_schemas);
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await factory.close();
        rmSync(testDir, { recursive: true, force: true });
    });

    function globalCounts() {
        return vi.spyOn(TelemetryService.instance.get(GlobalScope), 'count');
    }

    function failLoadAllFilesWith(error: unknown) {
        vi.spyOn(store as unknown as { loadAllFiles: () => void }, 'loadAllFiles').mockImplementation(() => {
            throw error;
        });
    }

    /**
     * Plants a file the store cannot decrypt. Read off the live store rather than rebuilding the
     * path so the test does not pin the FileDB version directory.
     */
    function plantUnreadableFile(name: string, contents: Buffer): string {
        const fileDbDir = (store as unknown as { fileDbDir: string }).fileDbDir;
        const filePath = join(fileDbDir, `${StoreName.public_schemas}.${name}.enc`);
        writeFileSync(filePath, contents);
        return filePath;
    }

    it('should propagate an out-of-disk write failure', async () => {
        const outOfDisk = Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' });
        vi.spyOn(EncryptedFile.prototype, 'put').mockRejectedValue(outOfDisk);

        await expect(store.put('us-east-1', { schemas: [] })).rejects.toThrow('no space left on device');
    });

    it('should count an out-of-disk write separately from other write faults', async () => {
        const count = globalCounts();
        vi.spyOn(EncryptedFile.prototype, 'put').mockRejectedValue(
            Object.assign(new Error('write failed'), { code: 'ENOSPC' }),
        );

        await expect(store.put('us-east-1', { schemas: [] })).rejects.toThrow('write failed');

        expect(count).toHaveBeenCalledWith(`put.${StoreMetric.outOfDisk}`, 1);
    });

    it('should not count an unrelated write failure as out of disk', async () => {
        const count = globalCounts();
        vi.spyOn(EncryptedFile.prototype, 'put').mockRejectedValue(
            Object.assign(new Error('permission denied'), { code: 'EACCES' }),
        );

        await expect(store.put('us-east-1', { schemas: [] })).rejects.toThrow('permission denied');

        expect(count).not.toHaveBeenCalledWith(`put.${StoreMetric.outOfDisk}`, 1);
    });

    it('should count an out-of-disk failure against the operation that hit it', async () => {
        const count = globalCounts();
        vi.spyOn(EncryptedFile.prototype, 'put').mockResolvedValue(true);
        await store.put('us-east-1', { schemas: [] });

        vi.spyOn(EncryptedFile.prototype, 'remove').mockRejectedValue(
            Object.assign(new Error('unlink failed'), { code: 'ENOSPC' }),
        );

        await expect(store.remove('us-east-1')).rejects.toThrow('unlink failed');

        // `remove` must not be attributed to `clear`, or the two series merge.
        expect(count).toHaveBeenCalledWith(`remove.${StoreMetric.outOfDisk}`, 1);
        expect(count).not.toHaveBeenCalledWith(`clear.${StoreMetric.outOfDisk}`, 1);
    });

    it('should count an out-of-disk failure on a synchronous read path', () => {
        const count = globalCounts();
        failLoadAllFilesWith(Object.assign(new Error('readdir failed'), { code: 'ENOSPC' }));

        expect(() => store.keys(10)).toThrow('readdir failed');
        expect(count).toHaveBeenCalledWith(`keys.${StoreMetric.outOfDisk}`, 1);
    });

    it('should see out of disk through a wrapped cause', () => {
        const count = globalCounts();
        const cause = Object.assign(new Error('no space left on device'), { code: 'ENOSPC' });
        failLoadAllFilesWith(new Error('could not list store files', { cause }));

        expect(() => store.keys(10)).toThrow('could not list store files');
        expect(count).toHaveBeenCalledWith(`keys.${StoreMetric.outOfDisk}`, 1);
    });

    it('should report a file encrypted under a different key as an integrity failure', () => {
        // Content written under a different machine key, which is what a hostname change produces.
        plantUnreadableFile('wrongkey', Buffer.from('not-decryptable-under-this-key'));
        const count = globalCounts();

        // The scan is what reads the file, so recovery runs inside `keys`.
        store.keys(10);

        expect(count).toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.IntegrityCheckFailed}`, 1);
        expect(count).not.toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.Truncated}`, 1);
        expect(count).not.toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.Unknown}`, 1);
    });

    it('should report a zero-length file as truncated rather than an integrity failure', () => {
        plantUnreadableFile('truncated', Buffer.alloc(0));
        const count = globalCounts();

        store.keys(10);

        expect(count).toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.Truncated}`, 1);
        expect(count).not.toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.IntegrityCheckFailed}`, 1);
    });

    it('should delete a file it could not read so the next session starts clean', () => {
        const filePath = plantUnreadableFile('unreadable', Buffer.from('not-decryptable-under-this-key'));

        store.keys(10);

        expect(existsSync(filePath)).toBe(false);
    });
});
