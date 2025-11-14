import fs from 'fs';
import path, { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataStore, StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDB';

describe('LMDB', () => {
    let lmdbFactory: LMDBStoreFactory;
    let lmdbStore: DataStore;
    const testDir = join(path.join(process.cwd(), 'tmp-tst'), 'lmdb');

    beforeEach(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        lmdbFactory = new LMDBStoreFactory(testDir);
        lmdbStore = lmdbFactory.get(StoreName.public_schemas);
    });

    afterEach(async () => {
        await lmdbFactory.close();

        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('get', () => {
        it('should return undefined for missing value', () => {
            const result = lmdbStore.get<string>('some-key');
            expect(result).toBeUndefined();
        });

        it('should return the stored value for an existing key', async () => {
            const testKey = 'test-key';
            const testValue = { data: 'test-value' };

            await lmdbStore.put(testKey, testValue);
            expect(lmdbStore.get<typeof testValue>(testKey)).toEqual(testValue);
        });
    });

    describe('put', () => {
        it('should store and return true on success', async () => {
            const result = await lmdbStore.put('key', 'value');
            expect(result).toBe(true);
        });

        it('should overwrite existing values', async () => {
            const key = 'test-key';
            const initialValue = 'initial-value';
            const updatedValue = 'updated-value';

            await lmdbStore.put(key, initialValue);
            await lmdbStore.put(key, updatedValue);

            const result = lmdbStore.get<string>(key);
            expect(result).toBe(updatedValue);
        });
    });

    describe('remove', () => {
        it('should remove existing key and return true', async () => {
            const key = 'test-key';
            const value = 'test-value';

            await lmdbStore.put(key, value);
            const removeResult = await lmdbStore.remove(key);
            const getResult = lmdbStore.get<string>(key);

            expect(removeResult).toBe(true);
            expect(getResult).toBeUndefined();
        });

        it('should only remove from the specified store', async () => {
            const key = 'shared-key';
            const schemaValue = 'schema-value';
            const astValue = 'ast-value';

            const schemaStore = lmdbFactory.get(StoreName.public_schemas);
            const astStore = lmdbFactory.get(StoreName.sam_schemas);

            await schemaStore.put(key, schemaValue);
            await astStore.put(key, astValue);

            await schemaStore.remove(key);

            const schemaResult = schemaStore.get<string>(key);
            const astResult = astStore.get<string>(key);

            expect(schemaResult).toBeUndefined();
            expect(astResult).toBe(astValue);
        });
    });

    describe('keys', () => {
        it('should return keys from the store', async () => {
            await lmdbStore.put('key1', 'value1');
            await lmdbStore.put('key2', 'value2');

            const keys = lmdbStore.keys(10);
            expect(keys).toHaveLength(2);
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
        });

        it('should respect the limit parameter', async () => {
            await lmdbStore.put('key1', 'value1');
            await lmdbStore.put('key2', 'value2');
            await lmdbStore.put('key3', 'value3');

            const keys = lmdbStore.keys(2);
            expect(keys).toHaveLength(2);
        });
    });

    describe('clear', () => {
        it('should clear an empty store without error', async () => {
            await expect(lmdbStore.clear()).resolves.not.toThrow();
        });

        it('should clear all data from a store', async () => {
            // Add some test data
            await lmdbStore.put('key1', 'value1');
            await lmdbStore.put('key2', { data: 'value2' });
            await lmdbStore.put('key3', 'value3');

            // Verify data exists
            expect(lmdbStore.get<string>('key1')).toBe('value1');
            expect(lmdbStore.get<{ data: string }>('key2')).toEqual({ data: 'value2' });
            expect(lmdbStore.get<string>('key3')).toBe('value3');

            // Clear the store
            await lmdbStore.clear();

            // Verify all data is removed
            expect(lmdbStore.get<string>('key1')).toBeUndefined();
            expect(lmdbStore.get<{ data: string }>('key2')).toBeUndefined();
            expect(lmdbStore.get<string>('key3')).toBeUndefined();

            // Verify keys are empty
            const keys = lmdbStore.keys(10);
            expect(keys).toHaveLength(0);
        });

        it('should only clear the specified store', async () => {
            const key = 'shared-key';
            const schemaValue = 'schema-value';
            const astValue = 'ast-value';

            const schemaStore = lmdbFactory.get(StoreName.public_schemas);
            const astStore = lmdbFactory.get(StoreName.sam_schemas);

            // Add data to multiple stores
            await schemaStore.put(key, schemaValue);
            await astStore.put(key, astValue);

            // Clear only the schemas store
            await schemaStore.clear();

            // Verify only schemas store is cleared
            expect(schemaStore.get<string>(key)).toBeUndefined();
            expect(astStore.get<string>(key)).toBe(astValue);
        });

        it('should allow putting new data after clearing', async () => {
            // Add initial data
            await lmdbStore.put('key1', 'value1');
            await lmdbStore.put('key2', 'value2');

            // Clear the store
            await lmdbStore.clear();

            // Add new data
            const newValue = { newData: 'after-clear' };
            await lmdbStore.put('new-key', newValue);

            // Verify new data exists and old data is still gone
            expect(lmdbStore.get<typeof newValue>('new-key')).toEqual(newValue);
            expect(lmdbStore.get<string>('key1')).toBeUndefined();
            expect(lmdbStore.get<string>('key2')).toBeUndefined();
        });
    });

    describe('persistence', () => {
        it('should persist data between instances', async () => {
            const key = 'persistence-test';
            const value = { data: 'should-persist' };

            // Store data in first instance
            await lmdbStore.put(key, value);
            // Close the factory, not individual stores
            await lmdbFactory.close();

            // Create new instance that should load from the same files
            const newFactory = new LMDBStoreFactory(testDir);
            const newStore = newFactory.get(StoreName.public_schemas);
            const result = newStore.get<typeof value>(key);

            expect(result).toEqual(value);

            await newFactory.close();
        });
    });
});
