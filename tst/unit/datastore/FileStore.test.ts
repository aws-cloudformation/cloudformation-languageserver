import { execFile } from 'child_process';
import { randomUUID as v4 } from 'crypto';
import { rmSync, mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import { promisify } from 'util';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataStore, StoreName } from '../../../src/datastore/DataStore';
import { decrypt, encryptionKey } from '../../../src/datastore/file/Encryption';
import { KeyedFileStore } from '../../../src/datastore/file/KeyedFileStore';
import { FileStoreFactory } from '../../../src/datastore/FileStoreFactory';
import { stableHashCode } from '../../../src/utils/StableHash';

describe('FileStore', () => {
    let fileFactory: FileStoreFactory;
    let fileStore: DataStore;
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'filedb-tests', v4());

    beforeEach(() => {
        fileFactory = new FileStoreFactory(testDir);
        fileStore = fileFactory.get(StoreName.public_schemas);
    });

    afterEach(async () => {
        await fileFactory.close();
        rmSync(testDir, { recursive: true, force: true });
    });

    describe('get', () => {
        it('should return undefined for non-existent key', () => {
            expect(fileStore.get<string>('non-existent-key')).toBeUndefined();
        });

        it('should return the stored value for an existing key', async () => {
            const testValue = { data: 'test-value' };
            await fileStore.put('test-key', testValue);
            expect(fileStore.get<typeof testValue>('test-key')).toEqual(testValue);
        });

        it('should read from in-memory cache without hitting disk', async () => {
            const encTestDir = join(testDir, 'get-cache-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const store1 = new KeyedFileStore(key, 'test', encTestDir);
            await store1.put('key1', 'value1');

            // store2 loads key1 from disk in constructor
            const store2 = new KeyedFileStore(key, 'test', encTestDir);
            expect(store2.get('key1')).toBe('value1');

            // store1 writes key2 to disk — store2 doesn't see it via get()
            // because each key is loaded at construction time, not on every read
            await store1.put('key2', 'value2');
            expect(store2.get('key2')).toBeUndefined();

            // A new instance sees both keys from disk
            const store3 = new KeyedFileStore(key, 'test', encTestDir);
            expect(store3.get('key1')).toBe('value1');
            expect(store3.get('key2')).toBe('value2');
        });
    });

    describe('put', () => {
        it('should store and return true on success', async () => {
            expect(await fileStore.put('key', 'value')).toBe(true);
        });

        it('should overwrite existing values', async () => {
            await fileStore.put('key', 'initial');
            await fileStore.put('key', 'updated');
            expect(fileStore.get<string>('key')).toBe('updated');
        });

        it('should re-read from disk under lock to merge concurrent writes', async () => {
            // This tests the critical withLock behavior: put() re-reads from disk
            // before mutating, so writes from other instances are not lost
            const encTestDir = join(testDir, 'merge-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const store1 = new KeyedFileStore(key, 'test', encTestDir);
            await store1.put('key1', 'from-store1');

            // store2 loads from disk in constructor, sees key1
            const store2 = new KeyedFileStore(key, 'test', encTestDir);

            // store1 writes key2 — this goes to disk
            await store1.put('key2', 'from-store1');

            // store2 writes key3 — withLock re-reads disk first, so it picks up key2
            await store2.put('key3', 'from-store2');

            // Verify store2's file has all three keys
            const store3 = new KeyedFileStore(key, 'test', encTestDir);
            expect(store3.get('key1')).toBe('from-store1');
            expect(store3.get('key2')).toBe('from-store1');
            expect(store3.get('key3')).toBe('from-store2');
        });
    });

    describe('remove', () => {
        it('should return false when removing non-existent key', async () => {
            expect(await fileStore.remove('non-existent')).toBe(false);
        });

        it('should remove existing key and return true', async () => {
            await fileStore.put('key', 'value');
            expect(await fileStore.remove('key')).toBe(true);
            expect(fileStore.get<string>('key')).toBeUndefined();
        });
    });

    describe('clear', () => {
        it('should clear all data from a store', async () => {
            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', 'value2');

            await fileStore.clear();

            expect(fileStore.get<string>('key1')).toBeUndefined();
            expect(fileStore.get<string>('key2')).toBeUndefined();
            expect(fileStore.keys(10)).toHaveLength(0);
        });

        it('should persist cleared state to disk', async () => {
            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', 'value2');
            await fileStore.clear();
            await fileFactory.close();

            const newFactory = new FileStoreFactory(testDir);
            const newStore = newFactory.get(StoreName.public_schemas);

            expect(newStore.get('key1')).toBeUndefined();
            expect(newStore.get('key2')).toBeUndefined();
            expect(newStore.keys(10)).toHaveLength(0);
            await newFactory.close();
        });

        it('should only clear the targeted store, not other stores', async () => {
            const schemaStore = fileFactory.get(StoreName.public_schemas);
            const samStore = fileFactory.get(StoreName.sam_schemas);

            await schemaStore.put('key', 'schema-value');
            await samStore.put('key', 'sam-value');

            await schemaStore.clear();

            expect(schemaStore.get('key')).toBeUndefined();
            expect(samStore.get('key')).toBe('sam-value');
        });
    });

    describe('keys', () => {
        it('should return keys respecting the limit', async () => {
            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', 'value2');
            await fileStore.put('key3', 'value3');

            const allKeys = fileStore.keys(10);
            expect(allKeys).toHaveLength(3);
            expect(allKeys).toContain('key1');
            expect(allKeys).toContain('key2');
            expect(allKeys).toContain('key3');

            expect(fileStore.keys(2)).toHaveLength(2);
            expect(fileStore.keys(0)).toHaveLength(0);
        });
    });

    describe('stats', () => {
        it('should report entries and file size', async () => {
            const store = fileFactory.get(StoreName.public_schemas) as KeyedFileStore;

            const emptyStats = store.stats();
            expect(emptyStats.entries).toBe(0);
            expect(emptyStats.totalSize).toBe(0);

            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', 'value2');

            const stats = store.stats();
            expect(stats.entries).toBe(2);
            expect(stats.totalSize).toBeGreaterThan(emptyStats.totalSize);
        });
    });

    describe('store isolation', () => {
        it('should isolate data between different named stores', async () => {
            const schemaStore = fileFactory.get(StoreName.public_schemas);
            const samStore = fileFactory.get(StoreName.sam_schemas);

            await schemaStore.put('key', 'schema-value');
            await samStore.put('key', 'sam-value');

            expect(schemaStore.get('key')).toBe('schema-value');
            expect(samStore.get('key')).toBe('sam-value');

            await schemaStore.remove('key');
            expect(schemaStore.get('key')).toBeUndefined();
            expect(samStore.get('key')).toBe('sam-value');
        });
    });

    describe('persistence', () => {
        it('should preserve existing data when a fresh instance writes', async () => {
            const encTestDir = join(testDir, 'enc-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const store1 = new KeyedFileStore(key, 'test', encTestDir);
            await store1.put('key1', 'value1');

            // Fresh instance writes key2 — key1 must survive
            const store2 = new KeyedFileStore(key, 'test', encTestDir);
            await store2.put('key2', 'value2');

            expect(store2.get('key1')).toBe('value1');
            expect(store2.get('key2')).toBe('value2');
        });

        it('should persist all operations across factory restarts', async () => {
            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', { nested: 'value2' });
            await fileStore.put('key3', [1, 2, 3]);
            await fileStore.put('to-remove', 'gone');
            await fileStore.remove('to-remove');
            await fileFactory.close();

            const newFactory = new FileStoreFactory(testDir);
            const newStore = newFactory.get(StoreName.public_schemas);

            expect(newStore.get<string>('key1')).toBe('value1');
            expect(newStore.get<{ nested: string }>('key2')).toEqual({ nested: 'value2' });
            expect(newStore.get<number[]>('key3')).toEqual([1, 2, 3]);
            expect(newStore.get('to-remove')).toBeUndefined();
            expect(newStore.keys(10)).toHaveLength(3);
            await newFactory.close();
        });
    });

    describe('atomic writes', () => {
        it('should produce a valid encrypted file on disk after every write', async () => {
            const encTestDir = join(testDir, 'atomic-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const store = new KeyedFileStore(key, 'test', encTestDir);

            for (let i = 0; i < 5; i++) {
                await store.put(`key${i}`, `value${i}`);

                // After every write, the file on disk must be valid encrypted JSON
                const raw = readFileSync(encodedFilePath(encTestDir, 'test', `key${i}`).filePath);
                const decrypted = JSON.parse(decrypt(key, raw));
                expect(decrypted['value']).toBe(`value${i}`);
                expect(store.get(`key${i}`)).toBe(`value${i}`);
            }

            // No leftover temp files
            const files = readdirSync(encTestDir);
            expect(files.filter((f) => f.endsWith('.tmp'))).toHaveLength(0);
        });

        it('should not leave temp files after constructor creates a new store', async () => {
            const encTestDir = join(testDir, 'no-tmp-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const store = new KeyedFileStore(key, 'test', encTestDir);

            expect(readdirSync(encTestDir)).toEqual([]);

            await store.put('key', 'someValue');
            expect(readdirSync(encTestDir)).toEqual([encodedFilePath(encTestDir, 'test', 'key').relPath]);
        });
    });

    describe('recovery', () => {
        it('should recover from corrupted file and allow new writes', async () => {
            const encTestDir = join(testDir, 'recovery-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const corruptedFile = join(encTestDir, 'test.enc');
            writeFileSync(corruptedFile, 'corrupted-not-encrypted-data');

            const store = new KeyedFileStore(key, 'test', encTestDir);

            // Should start empty after recovery
            expect(store.get('anyKey')).toBeUndefined();
            expect(store.keys(10)).toHaveLength(0);

            // Should be fully functional
            await store.put('newKey', 'newValue');
            expect(store.get('newKey')).toBe('newValue');

            // Data persists after reload
            const store2 = new KeyedFileStore(key, 'test', encTestDir);
            expect(store2.get('newKey')).toBe('newValue');
        });

        it('should recover from truncated encrypted file', async () => {
            const encTestDir = join(testDir, 'truncated-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            // Write valid data first
            const store1 = new KeyedFileStore(key, 'test', encTestDir);
            await store1.put('key', 'value');

            // Truncate the file to simulate crash mid-write (pre-atomic-write scenario)
            const filePath = encodedFilePath(encTestDir, 'test', 'key').filePath;
            const original = readFileSync(filePath);
            writeFileSync(filePath, original.subarray(0, 10));

            // Should recover gracefully
            const store2 = new KeyedFileStore(key, 'test', encTestDir);
            expect(store2.get('key')).toBeUndefined();

            await store2.put('recovered', 'yes');
            expect(store2.get('recovered')).toBe('yes');
        });

        it('should not leave temp files after recovery', () => {
            const encTestDir = join(testDir, 'recovery-cleanup-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            writeFileSync(join(encTestDir, 'test.enc'), 'garbage');
            new KeyedFileStore(key, 'test', encTestDir);

            const files = readdirSync(encTestDir);
            expect(files.filter((f) => f.endsWith('.tmp'))).toHaveLength(0);
        });
    });

    describe('concurrent operations', () => {
        it('should serialize concurrent puts and preserve all data', async () => {
            const promises = Array.from({ length: 10 }, (_, i) => fileStore.put(`key${i}`, `value${i}`));

            const results = await Promise.all(promises);
            expect(results.every((r) => r === true)).toBe(true);

            // All 10 keys must exist — none lost to race conditions
            const keys = fileStore.keys(20);
            expect(keys).toHaveLength(10);
            for (let i = 0; i < 10; i++) {
                expect(fileStore.get(`key${i}`)).toBe(`value${i}`);
            }
        });

        it('should handle concurrent put and remove without data corruption', async () => {
            await fileStore.put('keep', 'value');
            await fileStore.put('remove-me', 'gone');

            await Promise.all([
                fileStore.put('new1', 'v1'),
                fileStore.remove('remove-me'),
                fileStore.put('new2', 'v2'),
            ]);

            expect(fileStore.get('keep')).toBe('value');
            expect(fileStore.get('remove-me')).toBeUndefined();
            expect(fileStore.get('new1')).toBe('v1');
            expect(fileStore.get('new2')).toBe('v2');
        });
    });

    describe('multiprocess', () => {
        it('should handle concurrent writes from multiple processes', async () => {
            const encTestDir = join(testDir, 'multiprocess-test');
            mkdirSync(encTestDir, { recursive: true });

            const workerPath = join(process.cwd(), 'tst', 'unit', 'datastore', 'FilestoreWorker.ts');
            const numWorkers = 2;
            const numWrites = 3;
            const execFileAsync = promisify(execFile);

            const workers = Array.from({ length: numWorkers }, (_, i) =>
                execFileAsync(process.execPath, [
                    '--import',
                    'tsx',
                    workerPath,
                    encTestDir,
                    String(i),
                    String(numWrites),
                ]),
            );

            await Promise.all(workers);

            // Verify all writes from all workers are present — no data lost
            const key = encryptionKey(2);
            const store = new KeyedFileStore(key, 'test', encTestDir);

            for (let w = 0; w < numWorkers; w++) {
                for (let k = 0; k < numWrites; k++) {
                    expect(store.get(`worker${w}_key${k}`)).toBe(`worker${w}_value${k}`);
                }
            }

            // No leftover temp files from any process
            const files = readdirSync(encTestDir);
            expect(files.filter((f) => f.endsWith('.tmp'))).toHaveLength(0);
        });
    });

    describe('factory', () => {
        it('should throw error when getting non-existent store', () => {
            expect(() => fileFactory.get('non-existent-store' as StoreName)).toThrow(
                /Store non-existent-store not found/,
            );
        });

        it('should return same store instance for same store name', () => {
            const store1 = fileFactory.get(StoreName.public_schemas);
            const store2 = fileFactory.get(StoreName.public_schemas);
            expect(store1).toBe(store2);
        });

        it('should handle double close gracefully', async () => {
            await fileFactory.close();
            await expect(fileFactory.close()).resolves.not.toThrow();
        });

        it('should clear timers on close', async () => {
            const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
            const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

            await fileFactory.close();

            expect(clearIntervalSpy).toHaveBeenCalled();
            expect(clearTimeoutSpy).toHaveBeenCalled();

            clearIntervalSpy.mockRestore();
            clearTimeoutSpy.mockRestore();
        });

        it('should cleanup old version directories', () => {
            const fileDbRoot = join(testDir, 'filedb');

            // Create old version directories
            mkdirSync(join(fileDbRoot, 'v1'), { recursive: true });
            writeFileSync(join(fileDbRoot, 'v1', 'data.enc'), 'old');

            // Current version should exist from factory constructor
            expect(existsSync(join(fileDbRoot, 'v3'))).toBe(true);
            expect(existsSync(join(fileDbRoot, 'v1'))).toBe(true);

            // Trigger cleanup directly (normally runs after 2min timeout)
            (fileFactory as any).cleanupOldVersions();

            expect(existsSync(join(fileDbRoot, 'v1'))).toBe(false);
            expect(existsSync(join(fileDbRoot, 'v3'))).toBe(true);
        });

        it('should handle cleanup when directory does not exist', async () => {
            await fileFactory.close();
            rmSync(testDir, { recursive: true, force: true });

            const newFactory = new FileStoreFactory(testDir);
            rmSync(join(testDir, 'filedb'), { recursive: true, force: true });
            (newFactory as any).cleanupOldVersions();

            expect(existsSync(join(testDir, 'filedb'))).toBe(false);
            await newFactory.close();
        });
    });

    describe('encryption', () => {
        it('should encrypt data on disk — raw file is not readable JSON', async () => {
            const encTestDir = join(testDir, 'encryption-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const store = new KeyedFileStore(key, 'test', encTestDir);
            await store.put('secret', 'sensitive-data');

            const raw = readFileSync(encodedFilePath(encTestDir, 'test', 'secret').filePath);

            // Raw bytes should not contain the plaintext
            expect(raw.toString('utf8')).not.toContain('sensitive-data');
            expect(raw.toString('utf8')).not.toContain('secret');

            // But decrypting with the correct key should work
            const decrypted = JSON.parse(decrypt(key, raw));
            expect(decrypted['value']).toBe('sensitive-data');
        });
    });

    describe('fileNames caching', () => {
        it('should early-return in recoverFile when file is already cached via put', async () => {
            const encTestDir = join(testDir, 'cache-skip-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const store = new KeyedFileStore(key, 'test', encTestDir);
            await store.put('key1', 'value1');

            const keysToFiles = (store as any).keysToFiles as Map<string, unknown>;
            const mapSetSpy = vi.spyOn(keysToFiles, 'set');

            // keys() calls loadAllFiles → recoverFile for each .enc on disk
            store.keys(10);

            // Map.set not called proves recoverFile early-returned
            expect(mapSetSpy).not.toHaveBeenCalled();
            mapSetSpy.mockRestore();
        });

        it('should early-return in recoverFile when file was loaded in constructor', async () => {
            const encTestDir = join(testDir, 'cache-ctor-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const store1 = new KeyedFileStore(key, 'test', encTestDir);
            await store1.put('x', 'val');

            // Constructor loads existing files from disk into fileNames
            const store2 = new KeyedFileStore(key, 'test', encTestDir);
            const keysToFiles = (store2 as any).keysToFiles as Map<string, unknown>;
            const mapSetSpy = vi.spyOn(keysToFiles, 'set');

            store2.stats();

            expect(mapSetSpy).not.toHaveBeenCalled();
            mapSetSpy.mockRestore();
        });

        it('should process a file not yet in fileNames cache', async () => {
            const encTestDir = join(testDir, 'cache-miss-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            const store1 = new KeyedFileStore(key, 'test', encTestDir);
            await store1.put('before', 'v1');

            const store2 = new KeyedFileStore(key, 'test', encTestDir);

            // Write a new file that store2 doesn't know about yet
            await store1.put('after', 'v2');

            const keysToFiles = (store2 as any).keysToFiles as Map<string, unknown>;
            const sizeBefore = keysToFiles.size;

            store2.keys(10);

            // The uncached file was processed — map grew by 1
            expect(keysToFiles.size).toBe(sizeBefore + 1);
        });
    });

    describe('large data', () => {
        it('should handle realistic schema-sized data', async () => {
            // Simulate a regional schema payload (~1000 resource types, each ~2KB)
            const schemas: Record<string, string> = {};
            for (let i = 0; i < 200; i++) {
                schemas[`AWS::Service${i}::Resource`] = JSON.stringify({
                    typeName: `AWS::Service${i}::Resource`,
                    description: `Resource ${i} schema with properties`,
                    properties: {
                        Name: { type: 'string' },
                        Arn: { type: 'string' },
                        Tags: { type: 'array', items: { type: 'object' } },
                    },
                });
            }

            await fileStore.put('us-east-1', { version: 'v1', region: 'us-east-1', schemas });
            await fileFactory.close();

            // Reload and verify
            const newFactory = new FileStoreFactory(testDir);
            const newStore = newFactory.get(StoreName.public_schemas);
            const result = newStore.get<{ schemas: Record<string, string> }>('us-east-1');

            expect(result).toBeDefined();
            expect(Object.keys(result!.schemas)).toHaveLength(200);
            expect(result!.schemas['AWS::Service0::Resource']).toContain('Service0');
            await newFactory.close();
        });
    });
});

function encodedFilePath(dir: string, store: string, key: string) {
    const filePath = join(dir, `${store}.${stableHashCode(key)}.enc`);
    return {
        filePath,
        relPath: basename(filePath),
    };
}
