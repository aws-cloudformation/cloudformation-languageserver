import { randomUUID as v4 } from 'crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EncryptedFile } from '../../../src/datastore/file/EncryptedFile';
import { encryptionKey } from '../../../src/datastore/file/Encryption';
import { KeyedFileStore } from '../../../src/datastore/file/KeyedFileStore';
import { DiscardReason } from '../../../src/datastore/Utils';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';

const StoreName = 'public_schemas';

describe('FileStore out-of-disk and unreadable files', () => {
    const key = encryptionKey(2);
    let testDir: string;

    beforeEach(() => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'filestore-enospc-tests', v4());
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('should propagate an out-of-disk write failure', async () => {
        const store = new KeyedFileStore(key, StoreName, testDir);
        const outOfDisk = Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' });
        vi.spyOn(EncryptedFile.prototype, 'put').mockRejectedValue(outOfDisk);

        await expect(store.put('us-east-1', { schemas: [] })).rejects.toThrow('no space left on device');
    });

    it('should count an out-of-disk write separately from other write faults', async () => {
        const store = new KeyedFileStore(key, StoreName, testDir);
        const telemetry = TelemetryService.instance.get(`FileStore.${StoreName}`);
        const count = vi.spyOn(telemetry, 'count');
        vi.spyOn(EncryptedFile.prototype, 'put').mockRejectedValue(
            Object.assign(new Error('write failed'), { code: 'ENOSPC' }),
        );

        await expect(store.put('us-east-1', { schemas: [] })).rejects.toThrow('write failed');

        expect(count).toHaveBeenCalledWith('put.enospc', 1);
    });

    it('should not count an unrelated write failure as out of disk', async () => {
        const store = new KeyedFileStore(key, StoreName, testDir);
        const telemetry = TelemetryService.instance.get(`FileStore.${StoreName}`);
        const count = vi.spyOn(telemetry, 'count');
        vi.spyOn(EncryptedFile.prototype, 'put').mockRejectedValue(
            Object.assign(new Error('permission denied'), { code: 'EACCES' }),
        );

        await expect(store.put('us-east-1', { schemas: [] })).rejects.toThrow('permission denied');

        expect(count).not.toHaveBeenCalledWith('put.enospc', 1);
    });

    it('should count an out-of-disk failure against the operation that hit it', async () => {
        const store = new KeyedFileStore(key, StoreName, testDir);
        const telemetry = TelemetryService.instance.get(`FileStore.${StoreName}`);
        const count = vi.spyOn(telemetry, 'count');
        vi.spyOn(EncryptedFile.prototype, 'remove').mockRejectedValue(
            Object.assign(new Error('unlink failed'), { code: 'ENOSPC' }),
        );
        vi.spyOn(EncryptedFile.prototype, 'put').mockResolvedValue(true);
        await store.put('us-east-1', { schemas: [] });

        await expect(store.remove('us-east-1')).rejects.toThrow('unlink failed');

        // `remove` must not be attributed to `clear`, or the two series merge.
        expect(count).toHaveBeenCalledWith('remove.enospc', 1);
        expect(count).not.toHaveBeenCalledWith('clear.enospc', 1);
    });

    it('should count an out-of-disk failure on a synchronous read path', () => {
        const store = new KeyedFileStore(key, StoreName, testDir);
        const telemetry = TelemetryService.instance.get(`FileStore.${StoreName}`);
        const count = vi.spyOn(telemetry, 'count');
        vi.spyOn(store as unknown as { loadAllFiles: () => void }, 'loadAllFiles').mockImplementation(() => {
            throw Object.assign(new Error('readdir failed'), { code: 'ENOSPC' });
        });

        expect(() => store.keys(10)).toThrow('readdir failed');
        expect(count).toHaveBeenCalledWith('keys.enospc', 1);
    });

    it('should see out of disk through a wrapped cause', () => {
        const store = new KeyedFileStore(key, StoreName, testDir);
        const telemetry = TelemetryService.instance.get(`FileStore.${StoreName}`);
        const count = vi.spyOn(telemetry, 'count');
        const cause = Object.assign(new Error('no space left on device'), { code: 'ENOSPC' });
        vi.spyOn(store as unknown as { loadAllFiles: () => void }, 'loadAllFiles').mockImplementation(() => {
            throw new Error('could not list store files', { cause });
        });

        expect(() => store.keys(10)).toThrow('could not list store files');
        expect(count).toHaveBeenCalledWith('keys.enospc', 1);
    });

    it('should report a file encrypted under a different key as an integrity failure', () => {
        const fileName = `${StoreName}.wrongkey.enc`;
        // Content written under a different machine key, which is what a hostname change produces.
        writeFileSync(join(testDir, fileName), Buffer.from('not-decryptable-under-this-key'));
        const telemetry = TelemetryService.instance.get(`FileStore.${StoreName}`);
        const count = vi.spyOn(telemetry, 'count');

        new EncryptedFile(key, StoreName, fileName, testDir);

        expect(count).toHaveBeenCalledWith(`store.discarded.${DiscardReason.IntegrityCheckFailed}`, 1);
        expect(count).not.toHaveBeenCalledWith(`store.discarded.${DiscardReason.Truncated}`, 1);
        expect(count).not.toHaveBeenCalledWith(`store.discarded.${DiscardReason.Unknown}`, 1);
    });

    it('should report a zero-length file as truncated rather than an integrity failure', () => {
        const fileName = `${StoreName}.truncated.enc`;
        writeFileSync(join(testDir, fileName), Buffer.alloc(0));
        const telemetry = TelemetryService.instance.get(`FileStore.${StoreName}`);
        const count = vi.spyOn(telemetry, 'count');

        new EncryptedFile(key, StoreName, fileName, testDir);

        expect(count).toHaveBeenCalledWith(`store.discarded.${DiscardReason.Truncated}`, 1);
        expect(count).not.toHaveBeenCalledWith(`store.discarded.${DiscardReason.IntegrityCheckFailed}`, 1);
    });

    it('should delete a file it could not read so the next session starts clean', () => {
        const fileName = `${StoreName}.unreadable.enc`;
        const filePath = join(testDir, fileName);
        writeFileSync(filePath, Buffer.from('not-decryptable-under-this-key'));

        new EncryptedFile(key, StoreName, fileName, testDir);

        expect(existsSync(filePath)).toBe(false);
    });
});
