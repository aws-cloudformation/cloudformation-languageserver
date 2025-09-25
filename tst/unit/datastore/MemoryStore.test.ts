import { describe, it, expect, beforeEach } from 'vitest';
import { DataStore } from '../../../src/datastore/DataStore';
import { MemoryStoreFactory } from '../../../src/datastore/MemoryStore';

describe('MemoryStore', () => {
    let memoryFactory: MemoryStoreFactory;
    let memoryStore: DataStore;

    beforeEach(() => {
        memoryFactory = new MemoryStoreFactory();
        memoryStore = memoryFactory.getOrCreate('test-store');
    });

    describe('get', () => {
        it('should return undefined for non-existent key', () => {
            const result = memoryStore.get<string>('non-existent-key');
            expect(result).toBeUndefined();
        });

        it('should return the stored value for an existing key', async () => {
            const testKey = 'test-key';
            const testValue = { data: 'test-value' };

            await memoryStore.put(testKey, testValue);
            const result = memoryStore.get<typeof testValue>(testKey);

            expect(result).toEqual(testValue);
        });

        it('should return values from the correct store', async () => {
            const key = 'same-key';
            const schemaValue = { type: 'schema' };
            const astValue = { type: 'ast' };

            const schemaStore = memoryFactory.getOrCreate('schemas');
            const astStore = memoryFactory.getOrCreate('ast');

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
            const result = await memoryStore.put('key', 'value');
            expect(result).toBe(true);
        });

        it('should overwrite existing values', async () => {
            const key = 'test-key';
            const initialValue = 'initial-value';
            const updatedValue = 'updated-value';

            await memoryStore.put(key, initialValue);
            await memoryStore.put(key, updatedValue);

            const result = memoryStore.get<string>(key);
            expect(result).toBe(updatedValue);
        });
    });

    describe('remove', () => {
        it('should return false when removing non-existent key', async () => {
            const result = await memoryStore.remove('non-existent-key');
            expect(result).toBe(false);
        });

        it('should remove existing key and return true', async () => {
            const key = 'test-key';
            const value = 'test-value';

            await memoryStore.put(key, value);
            const removeResult = await memoryStore.remove(key);
            const getResult = memoryStore.get<string>(key);

            expect(removeResult).toBe(true);
            expect(getResult).toBeUndefined();
        });

        it('should only remove from the specified store', async () => {
            const key = 'shared-key';
            const schemaValue = 'schema-value';
            const astValue = 'ast-value';

            const schemaStore = memoryFactory.getOrCreate('schemas');
            const astStore = memoryFactory.getOrCreate('ast');

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
            // Add some test data
            await memoryStore.put('key1', 'value1');
            await memoryStore.put('key2', { data: 'value2' });
            await memoryStore.put('key3', 'value3');

            // Verify data exists
            expect(memoryStore.get<string>('key1')).toBe('value1');
            expect(memoryStore.get<{ data: string }>('key2')).toEqual({ data: 'value2' });
            expect(memoryStore.get<string>('key3')).toBe('value3');

            // Clear the store
            await memoryStore.clear();

            // Verify all data is removed
            expect(memoryStore.get<string>('key1')).toBeUndefined();
            expect(memoryStore.get<{ data: string }>('key2')).toBeUndefined();
            expect(memoryStore.get<string>('key3')).toBeUndefined();

            // Verify keys are empty
            const keys = memoryStore.keys(10);
            expect(keys).toHaveLength(0);
        });

        it('should only clear the specified store', async () => {
            const key = 'shared-key';
            const schemaValue = 'schema-value';
            const astValue = 'ast-value';
            const settingsValue = 'settings-value';

            const schemaStore = memoryFactory.getOrCreate('schemas');
            const astStore = memoryFactory.getOrCreate('ast');
            const settingsStore = memoryFactory.getOrCreate('settings');

            // Add data to multiple stores
            await schemaStore.put(key, schemaValue);
            await astStore.put(key, astValue);
            await settingsStore.put(key, settingsValue);

            // Clear only the schemas store
            await schemaStore.clear();

            // Verify only schemas store is cleared
            expect(schemaStore.get<string>(key)).toBeUndefined();
            expect(astStore.get<string>(key)).toBe(astValue);
            expect(settingsStore.get<string>(key)).toBe(settingsValue);
        });

        it('should allow putting new data after clearing', async () => {
            // Add initial data
            await memoryStore.put('key1', 'value1');
            await memoryStore.put('key2', 'value2');

            // Clear the store
            await memoryStore.clear();

            // Add new data
            const newValue = { newData: 'after-clear' };
            await memoryStore.put('new-key', newValue);

            // Verify new data exists and old data is still gone
            expect(memoryStore.get<typeof newValue>('new-key')).toEqual(newValue);
            expect(memoryStore.get<string>('key1')).toBeUndefined();
            expect(memoryStore.get<string>('key2')).toBeUndefined();
        });

        it('should update factory stats correctly after clearing', async () => {
            const schemaStore = memoryFactory.getOrCreate('schemas');
            const astStore = memoryFactory.getOrCreate('ast');

            // Add data to multiple stores
            await schemaStore.put('key1', 'value1');
            await schemaStore.put('key2', 'value2');
            await astStore.put('key1', 'value1');

            // Verify initial stats (including test-store from beforeEach)
            let stats = memoryFactory.stats() as {
                numStores: number;
                storeNames: string[];
                stores: Record<string, number>;
            };
            expect(stats.numStores).toBe(3); // test-store, schemas, ast
            expect(stats.stores.schemas).toBe(2);
            expect(stats.stores.ast).toBe(1);

            // Clear schemas store
            await schemaStore.clear();

            // Verify updated stats - cleared store still exists but with 0 entries
            stats = memoryFactory.stats() as {
                numStores: number;
                storeNames: string[];
                stores: Record<string, number>;
            };
            expect(stats.numStores).toBe(3); // test-store, schemas, ast
            expect(stats.storeNames).toContain('ast');
            expect(stats.storeNames).toContain('schemas');
            expect(stats.storeNames).toContain('test-store');
            expect(stats.stores.schemas).toBe(0);
            expect(stats.stores.ast).toBe(1);
        });
    });

    describe('keys', () => {
        it('should return keys from the store', async () => {
            await memoryStore.put('key1', 'value1');
            await memoryStore.put('key2', 'value2');

            const keys = memoryStore.keys(10);
            expect(keys).toHaveLength(2);
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
        });

        it('should respect the limit parameter', async () => {
            await memoryStore.put('key1', 'value1');
            await memoryStore.put('key2', 'value2');
            await memoryStore.put('key3', 'value3');

            const keys = memoryStore.keys(2);
            expect(keys).toHaveLength(2);
        });
    });

    describe('stats', () => {
        it('should return stats including test-store for a factory with one store', () => {
            const stats = memoryFactory.stats() as {
                numStores: number;
                storeNames: string[];
                stores: Record<string, number>;
            };

            expect(stats.numStores).toBe(1); // test-store from beforeEach
            expect(stats.storeNames).toEqual(['test-store']);
            expect(stats.stores).toEqual({ 'test-store': 0 });
        });

        it('should return correct stats after adding items', async () => {
            const schemaStore = memoryFactory.getOrCreate('schemas');
            const astStore = memoryFactory.getOrCreate('ast');

            await schemaStore.put('key1', 'value1');
            await schemaStore.put('key2', 'value2');
            await astStore.put('key1', 'value1');

            const stats = memoryFactory.stats() as {
                numStores: number;
                storeNames: string[];
                stores: Record<string, number>;
            };

            expect(stats.numStores).toBe(3); // test-store, schemas, ast
            expect(stats.storeNames).toEqual(['ast', 'schemas', 'test-store']);
            expect(stats.stores).toEqual({
                schemas: 2,
                ast: 1,
                'test-store': 0,
            });
        });

        it('should update stats after removing items', async () => {
            const schemaStore = memoryFactory.getOrCreate('schemas');

            await schemaStore.put('key1', 'value1');
            await schemaStore.put('key2', 'value2');
            await schemaStore.remove('key1');

            const stats = memoryFactory.stats() as {
                numStores: number;
                storeNames: string[];
                stores: Record<string, number>;
            };

            expect(stats.numStores).toBe(2); // test-store, schemas
            expect(stats.storeNames).toEqual(['schemas', 'test-store']);
            expect(stats.stores).toEqual({
                schemas: 1,
                'test-store': 0,
            });
        });
    });

    describe('close', () => {
        it('should close factory without error', async () => {
            const schemaStore = memoryFactory.getOrCreate('schemas');
            const astStore = memoryFactory.getOrCreate('ast');

            await schemaStore.put('key1', 'value1');
            await astStore.put('key1', 'value1');

            await memoryFactory.close();

            // Factory should still report stores exist after close
            const stats = memoryFactory.stats() as {
                numStores: number;
                storeNames: string[];
                stores: Record<string, number>;
            };

            expect(stats.numStores).toBe(3); // test-store, schemas, ast
        });
    });
});
