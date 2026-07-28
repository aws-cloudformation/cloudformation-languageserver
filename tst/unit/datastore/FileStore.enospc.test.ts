import { randomUUID as v4 } from 'crypto';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EncryptedFile } from '../../../src/datastore/file/EncryptedFile';
import { encryptionKey } from '../../../src/datastore/file/Encryption';
import { KeyedFileStore } from '../../../src/datastore/file/KeyedFileStore';
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

    it('should report a file encrypted under a different key as undecryptable', () => {
        const fileName = `${StoreName}.wrongkey.enc`;
        // Content written under a different machine key, which is what a hostname change produces.
        writeFileSync(join(testDir, fileName), Buffer.from('not-decryptable-under-this-key'));
        const telemetry = TelemetryService.instance.get(`FileStore.${StoreName}`);
        const count = vi.spyOn(telemetry, 'count');

        new EncryptedFile(key, StoreName, fileName, testDir);

        expect(count).toHaveBeenCalledWith('store.discarded', 1);
        expect(count).toHaveBeenCalledWith('store.discarded.undecryptable', 1);
        expect(count).not.toHaveBeenCalledWith('store.discarded.truncated', 1);
    });

    it('should report a zero-length file as truncated rather than undecryptable', () => {
        const fileName = `${StoreName}.truncated.enc`;
        writeFileSync(join(testDir, fileName), Buffer.alloc(0));
        const telemetry = TelemetryService.instance.get(`FileStore.${StoreName}`);
        const count = vi.spyOn(telemetry, 'count');

        new EncryptedFile(key, StoreName, fileName, testDir);

        expect(count).toHaveBeenCalledWith('store.discarded.truncated', 1);
        expect(count).not.toHaveBeenCalledWith('store.discarded.undecryptable', 1);
    });
});
