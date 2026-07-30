import { randomUUID as v4 } from 'crypto';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encryptionKey } from '../../../src/datastore/file/Encryption';
import { EncryptedFile } from '../../../src/datastore/file/EncryptedFile';
import { LocalFile } from '../../../src/utils/LocalFile';

describe('EncryptedFile', () => {
    const key = encryptionKey(2);
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'encryptedfile-tests', v4());

    beforeEach(() => {
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(testDir, { recursive: true, force: true });
    });

    describe('put and get', () => {
        it('should round-trip a value through encrypt/write/read/decrypt', async () => {
            const file = EncryptedFile.createFromPath(key, 'data.enc', testDir);
            file.setKey('my-key');

            await file.put({ region: 'us-east-1' });

            // Read back from a fresh instance (simulates restart)
            const file2 = EncryptedFile.createFromPath(key, 'data.enc', testDir);
            expect(file2.get()).toEqual({ region: 'us-east-1' });
            expect(file2.entry()?.key).toBe('my-key');
        });

        it('should overwrite existing values', async () => {
            const file = EncryptedFile.createFromPath(key, 'overwrite.enc', testDir);
            file.setKey('k');

            await file.put('first');
            await file.put('second');

            const file2 = EncryptedFile.createFromPath(key, 'overwrite.enc', testDir);
            expect(file2.get()).toBe('second');
        });
    });

    describe('remove', () => {
        it('should delete the file and clear content', async () => {
            const file = EncryptedFile.createFromPath(key, 'remove.enc', testDir);
            file.setKey('k');
            await file.put('data');
            expect(file.exists()).toBe(true);

            await file.remove();

            expect(file.exists()).toBe(false);
            expect(file.get()).toBeUndefined();
        });

        it('should succeed when file does not exist', async () => {
            const file = EncryptedFile.createFromPath(key, 'nonexistent.enc', testDir);
            await expect(file.remove()).resolves.toBe(true);
        });

        it('should keep content when the file could not be deleted', async () => {
            const file = EncryptedFile.createFromPath(key, 'undeletable.enc', testDir);
            file.setKey('k');
            await file.put('data');
            vi.spyOn(LocalFile.prototype, 'remove').mockRejectedValue(new Error('unlink failed'));

            await expect(file.remove()).rejects.toThrow('unlink failed');

            // The bytes are still on disk, so dropping the in-memory copy would report the entry
            // as gone while the next session reads it back.
            expect(file.get()).toBe('data');
            expect(file.entry()?.key).toBe('k');
        });
    });

    describe('fileSize', () => {
        it('should return 0 for nonexistent file', () => {
            const file = EncryptedFile.createFromPath(key, 'missing.enc', testDir);
            expect(file.fileSize()).toBe(0);
        });

        it('should return positive size after write', async () => {
            const file = EncryptedFile.createFromPath(key, 'sized.enc', testDir);
            file.setKey('k');
            await file.put('some data');
            expect(file.fileSize()).toBeGreaterThan(0);
        });
    });

    describe('edge cases', () => {
        it('should throw when setting key twice', () => {
            const file = EncryptedFile.createFromPath(key, 'double-key.enc', testDir);
            file.setKey('first');
            expect(() => file.setKey('second')).toThrow('File key was already set');
        });

        it('should throw when putting without a key', async () => {
            const file = EncryptedFile.createFromPath(key, 'no-key.enc', testDir);
            await expect(file.put('data')).rejects.toThrow('File key is not set');
        });

        it('should return undefined for nonexistent file', () => {
            const file = EncryptedFile.createFromPath(key, 'nope.enc', testDir);
            expect(file.get()).toBeUndefined();
            expect(file.entry()).toBeUndefined();
            expect(file.exists()).toBe(false);
        });
    });
});
