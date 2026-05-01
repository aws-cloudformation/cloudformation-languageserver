import { randomUUID as v4 } from 'crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptionKey } from '../../../src/datastore/file/Encryption';
import { EncryptedFile } from '../../../src/datastore/file/EncryptedFile';

describe('EncryptedFile', () => {
    const key = encryptionKey(2);
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'encryptedfile-tests', v4());

    beforeEach(() => {
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    describe('put and get', () => {
        it('should round-trip a value through encrypt/write/read/decrypt', async () => {
            const file = new EncryptedFile(key, 'test', 'data.enc', testDir);
            file.setKey('my-key');

            await file.put({ region: 'us-east-1' });

            // Read back from a fresh instance (simulates restart)
            const file2 = new EncryptedFile(key, 'test', 'data.enc', testDir);
            expect(file2.get()).toEqual({ region: 'us-east-1' });
            expect(file2.entry()?.key).toBe('my-key');
        });

        it('should overwrite existing values', async () => {
            const file = new EncryptedFile(key, 'test', 'overwrite.enc', testDir);
            file.setKey('k');

            await file.put('first');
            await file.put('second');

            const file2 = new EncryptedFile(key, 'test', 'overwrite.enc', testDir);
            expect(file2.get()).toBe('second');
        });
    });

    describe('remove', () => {
        it('should delete the file and clear content', async () => {
            const file = new EncryptedFile(key, 'test', 'remove.enc', testDir);
            file.setKey('k');
            await file.put('data');
            expect(file.exists()).toBe(true);

            await file.remove();

            expect(file.exists()).toBe(false);
            expect(file.get()).toBeUndefined();
        });

        it('should succeed when file does not exist', async () => {
            const file = new EncryptedFile(key, 'test', 'nonexistent.enc', testDir);
            await expect(file.remove()).resolves.toBe(true);
        });
    });

    describe('corrupt file recovery', () => {
        it('should delete corrupt file and return undefined content', () => {
            const fileName = 'corrupt.enc';
            const filePath = join(testDir, fileName);

            // Write garbage data that will fail decryption
            writeFileSync(filePath, 'this is not valid encrypted data');
            expect(existsSync(filePath)).toBe(true);

            // Constructor should catch the decryption error, delete the file, and not throw
            const file = new EncryptedFile(key, 'test', fileName, testDir);

            expect(file.get()).toBeUndefined();
            expect(file.exists()).toBe(false);
        });

        it('should recover and allow new writes after corrupt file deletion', async () => {
            const fileName = 'recover.enc';
            writeFileSync(join(testDir, fileName), Buffer.from([0xde, 0xad, 0xbe, 0xef]));

            const file = new EncryptedFile(key, 'test', fileName, testDir);
            expect(file.get()).toBeUndefined();

            file.setKey('new-key');
            await file.put('fresh-data');

            const file2 = new EncryptedFile(key, 'test', fileName, testDir);
            expect(file2.get()).toBe('fresh-data');
        });
    });

    describe('fileSize', () => {
        it('should return 0 for nonexistent file', () => {
            const file = new EncryptedFile(key, 'test', 'missing.enc', testDir);
            expect(file.fileSize()).toBe(0);
        });

        it('should return positive size after write', async () => {
            const file = new EncryptedFile(key, 'test', 'sized.enc', testDir);
            file.setKey('k');
            await file.put('some data');
            expect(file.fileSize()).toBeGreaterThan(0);
        });
    });

    describe('edge cases', () => {
        it('should throw when setting key twice', () => {
            const file = new EncryptedFile(key, 'test', 'double-key.enc', testDir);
            file.setKey('first');
            expect(() => file.setKey('second')).toThrow('File key was already set');
        });

        it('should throw when putting without a key', async () => {
            const file = new EncryptedFile(key, 'test', 'no-key.enc', testDir);
            await expect(file.put('data')).rejects.toThrow('File key is not set');
        });

        it('should return undefined for nonexistent file', () => {
            const file = new EncryptedFile(key, 'test', 'nope.enc', testDir);
            expect(file.get()).toBeUndefined();
            expect(file.entry()).toBeUndefined();
            expect(file.exists()).toBe(false);
        });
    });
});
