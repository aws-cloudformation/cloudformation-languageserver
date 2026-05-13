import { randomUUID as v4 } from 'crypto';
import fs from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataStore, StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';

describe('LMDB close guard', () => {
    let factory: LMDBStoreFactory;
    let store: DataStore;
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-close-guard-tests', v4());

    beforeEach(() => {
        fs.mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
        store = factory.get(StoreName.public_schemas);
    });

    afterEach(async () => {
        await factory.close();
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should reject put after close', async () => {
        await factory.close();
        await expect(store.put('key', 'value')).rejects.toThrow('Database is closed');
    });

    it('should reject remove after close', async () => {
        await factory.close();
        await expect(store.remove('key')).rejects.toThrow('Database is closed');
    });

    it('should reject clear after close', async () => {
        await factory.close();
        await expect(store.clear()).rejects.toThrow('Database is closed');
    });

    it('should reject get after close', async () => {
        await factory.close();
        expect(() => store.get('key')).toThrow('Database is closed');
    });

    it('should reject keys after close', async () => {
        await factory.close();
        expect(() => store.keys(10)).toThrow('Database is closed');
    });

    it('should allow operations before close', async () => {
        await store.put('key', 'value');
        expect(store.get('key')).toBe('value');
    });

    it('should wait for in-flight operations before closing', async () => {
        const putPromise = store.put('key', 'value');

        const closePromise = factory.close();

        await expect(putPromise).resolves.toBe(true);
        await expect(closePromise).resolves.toBeUndefined();
    });

    it('should handle concurrent puts then close', async () => {
        const puts = Array.from({ length: 10 }, (_, i) => store.put(`key-${i}`, `value-${i}`));

        const closePromise = factory.close();

        const results = await Promise.allSettled(puts);
        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        expect(fulfilled.length).toBeGreaterThan(0);

        await closePromise;
    });

    it('should handle double close gracefully', async () => {
        await factory.close();
        await expect(factory.close()).resolves.not.toThrow();
    });
});
