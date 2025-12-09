import { rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataStore, StoreName } from '../../../src/datastore/DataStore';
import { EncryptedFileStore } from '../../../src/datastore/file/EncryptedFileStore';
import { encryptionKey } from '../../../src/datastore/file/Encryption';
import { FileStoreFactory } from '../../../src/datastore/FileStore';

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
            const result = fileStore.get<string>('non-existent-key');
            expect(result).toBeUndefined();
        });

        it('should return the stored value for an existing key', async () => {
            const testKey = 'test-key';
            const testValue = { data: 'test-value' };

            await fileStore.put(testKey, testValue);
            const result = fileStore.get<typeof testValue>(testKey);

            expect(result).toEqual(testValue);
        });

        it('should return values from the correct store', async () => {
            const key = 'same-key';
            const schemaValue = { type: 'schema' };
            const astValue = { type: 'ast' };

            const schemaStore = fileFactory.get(StoreName.public_schemas);
            const astStore = fileFactory.get(StoreName.sam_schemas);

            await schemaStore.put(key, schemaValue);
            await astStore.put(key, astValue);

            const schemaResult = schemaStore.get(key);
            const astResult = astStore.get(key);

            expect(schemaResult).toEqual(schemaValue);
            expect(astResult).toEqual(astValue);
        });
    });

    describe('put', () => {
        it('should store and return true on success', async () => {
            const result = await fileStore.put('key', 'value');
            expect(result).toBe(true);
        });

        it('should overwrite existing values', async () => {
            const key = 'test-key';
            const initialValue = 'initial-value';
            const updatedValue = 'updated-value';

            await fileStore.put(key, initialValue);
            await fileStore.put(key, updatedValue);

            const result = fileStore.get<string>(key);
            expect(result).toBe(updatedValue);
        });
    });

    describe('remove', () => {
        it('should return false when removing non-existent key', async () => {
            const result = await fileStore.remove('non-existent-key');
            expect(result).toBe(false);
        });

        it('should remove existing key and return true', async () => {
            const key = 'test-key';
            const value = 'test-value';

            await fileStore.put(key, value);
            const removeResult = await fileStore.remove(key);
            const getResult = fileStore.get<string>(key);

            expect(removeResult).toBe(true);
            expect(getResult).toBeUndefined();
        });

        it('should only remove from the specified store', async () => {
            const key = 'shared-key';
            const schemaValue = 'schema-value';
            const astValue = 'ast-value';

            const schemaStore = fileFactory.get(StoreName.public_schemas);
            const astStore = fileFactory.get(StoreName.sam_schemas);

            await schemaStore.put(key, schemaValue);
            await astStore.put(key, astValue);

            await schemaStore.remove(key);

            const schemaResult = schemaStore.get<string>(key);
            const astResult = astStore.get<string>(key);

            expect(schemaResult).toBeUndefined();
            expect(astResult).toBe(astValue);
        });
    });

    describe('clear', () => {
        it('should clear all data from a store', async () => {
            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', { data: 'value2' });
            await fileStore.put('key3', 'value3');

            expect(fileStore.get<string>('key1')).toBe('value1');
            expect(fileStore.get<{ data: string }>('key2')).toEqual({ data: 'value2' });
            expect(fileStore.get<string>('key3')).toBe('value3');

            await fileStore.clear();

            expect(fileStore.get<string>('key1')).toBeUndefined();
            expect(fileStore.get<{ data: string }>('key2')).toBeUndefined();
            expect(fileStore.get<string>('key3')).toBeUndefined();

            const keys = fileStore.keys(10);
            expect(keys).toHaveLength(0);
        });

        it('should only clear the specified store', async () => {
            const key = 'shared-key';
            const schemaValue = 'schema-value';
            const astValue = 'ast-value';

            const schemaStore = fileFactory.get(StoreName.public_schemas);
            const astStore = fileFactory.get(StoreName.sam_schemas);

            await schemaStore.put(key, schemaValue);
            await astStore.put(key, astValue);

            await schemaStore.clear();

            expect(schemaStore.get<string>(key)).toBeUndefined();
            expect(astStore.get<string>(key)).toBe(astValue);
        });

        it('should allow putting new data after clearing', async () => {
            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', 'value2');

            await fileStore.clear();

            const newValue = { newData: 'after-clear' };
            await fileStore.put('new-key', newValue);

            expect(fileStore.get<typeof newValue>('new-key')).toEqual(newValue);
            expect(fileStore.get<string>('key1')).toBeUndefined();
            expect(fileStore.get<string>('key2')).toBeUndefined();
        });
    });

    describe('keys', () => {
        it('should return keys from the store', async () => {
            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', 'value2');

            const keys = fileStore.keys(10);
            expect(keys).toHaveLength(2);
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
        });

        it('should respect the limit parameter', async () => {
            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', 'value2');
            await fileStore.put('key3', 'value3');

            const keys = fileStore.keys(2);
            expect(keys).toHaveLength(2);
        });
    });

    describe('close', () => {
        // eslint-disable-next-line vitest/expect-expect
        it('should close factory without error', async () => {
            const schemaStore = fileFactory.get(StoreName.public_schemas);
            const astStore = fileFactory.get(StoreName.sam_schemas);

            await schemaStore.put('key1', 'value1');
            await astStore.put('key1', 'value1');

            await fileFactory.close();
        });
    });

    describe('persistence', () => {
        it('should preserve existing data when put is called on fresh instance', async () => {
            // Test EncryptedFileStore directly to avoid stats() being called
            const encTestDir = join(testDir, 'enc-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            // Session 1: write key1
            const store1 = new EncryptedFileStore(key, 'test', encTestDir);
            await store1.put('key1', 'value1');

            // Session 2: fresh instance, put key2 WITHOUT reading first
            const store2 = new EncryptedFileStore(key, 'test', encTestDir);
            await store2.put('key2', 'value2');

            // Verify both keys exist - key1 should NOT be lost
            expect(store2.get('key1')).toBe('value1');
            expect(store2.get('key2')).toBe('value2');
        });

        it('should persist data across store instances', async () => {
            const key = 'persist-key';
            const value = { data: 'persist-value' };

            await fileStore.put(key, value);
            await fileFactory.close();

            const newFactory = new FileStoreFactory(testDir);
            const newStore = newFactory.get(StoreName.public_schemas);
            const result = newStore.get<typeof value>(key);

            expect(result).toEqual(value);
            await newFactory.close();
        });

        it('should handle multiple keys persisted', async () => {
            await fileStore.put('key1', 'value1');
            await fileStore.put('key2', { nested: 'value2' });
            await fileStore.put('key3', [1, 2, 3]);
            await fileFactory.close();

            const newFactory = new FileStoreFactory(testDir);
            const newStore = newFactory.get(StoreName.public_schemas);

            expect(newStore.get<string>('key1')).toBe('value1');
            expect(newStore.get<{ nested: string }>('key2')).toEqual({ nested: 'value2' });
            expect(newStore.get<number[]>('key3')).toEqual([1, 2, 3]);
            await newFactory.close();
        });
    });

    describe('edge cases', () => {
        it('should handle empty string as key', async () => {
            await fileStore.put('', 'empty-key-value');
            expect(fileStore.get<string>('')).toBe('empty-key-value');
        });

        it('should handle complex objects', async () => {
            const complex = {
                nested: { deep: { value: 'test' } },
                array: [1, 2, { inner: 'value' }],
                null: null,
                boolean: true,
                number: 42,
            };

            await fileStore.put('complex', complex);
            expect(fileStore.get('complex')).toEqual(complex);
        });

        it('should return empty array for keys on empty store', () => {
            const keys = fileStore.keys(10);
            expect(keys).toEqual([]);
        });

        it('should handle clear on empty store', async () => {
            await expect(fileStore.clear()).resolves.not.toThrow();
        });
    });

    describe('recovery', () => {
        it('should recover from corrupted file and allow new writes', async () => {
            const encTestDir = join(testDir, 'recovery-test');
            mkdirSync(encTestDir, { recursive: true });
            const key = encryptionKey(2);

            // Write corrupted data to the file
            const corruptedFile = join(encTestDir, 'test.enc');
            writeFileSync(corruptedFile, 'corrupted-not-encrypted-data');

            // Should not throw, should recover
            const store = new EncryptedFileStore(key, 'test', encTestDir);

            // Should start with empty content after recovery
            expect(store.get('anyKey')).toBeUndefined();

            // Should be able to write new data
            await store.put('newKey', 'newValue');
            expect(store.get('newKey')).toBe('newValue');

            // Verify data persists after reload
            const store2 = new EncryptedFileStore(key, 'test', encTestDir);
            expect(store2.get('newKey')).toBe('newValue');
        });
    });
});
