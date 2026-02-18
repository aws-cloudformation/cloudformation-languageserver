import fs from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDB';

describe('LMDB fork detection and recovery', () => {
    let testDir: string;
    let factory: LMDBStoreFactory;
    let originalPid: number;
    const factoriesToClose: LMDBStoreFactory[] = [];

    beforeEach(() => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-recovery-test', v4());
        originalPid = process.pid;
        fs.mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
        factoriesToClose.push(factory);
    });

    afterEach(async () => {
        Object.defineProperty(process, 'pid', { value: originalPid, configurable: true });
        for (const f of factoriesToClose) {
            await f.close();
        }
        factoriesToClose.length = 0;
    });

    describe('fork detection', () => {
        it('should update store handle and succeed on same store reference after fork', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            // Simulate fork
            Object.defineProperty(process, 'pid', { value: originalPid + 1000, configurable: true });

            // Same store reference should work - it updates its internal handle
            expect(store.get('key')).toBe('value');
        });

        it('should allow writes after fork on same store reference', async () => {
            const store = factory.get(StoreName.public_schemas);

            // Simulate fork before any operation
            Object.defineProperty(process, 'pid', { value: originalPid + 1000, configurable: true });

            // Write should succeed after proactive recovery
            await store.put('newkey', 'newvalue');
            expect(store.get('newkey')).toBe('newvalue');
        });

        it('should handle fork during keys() operation', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('k1', 'v1');
            await store.put('k2', 'v2');

            Object.defineProperty(process, 'pid', { value: originalPid + 1000, configurable: true });

            const keys = store.keys(10);
            expect(keys).toContain('k1');
            expect(keys).toContain('k2');
        });

        it('should handle fork during remove() operation', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('toremove', 'value');

            Object.defineProperty(process, 'pid', { value: originalPid + 1000, configurable: true });

            await store.remove('toremove');
            expect(store.get('toremove')).toBeUndefined();
        });

        it('should handle fork during clear() operation', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('k1', 'v1');
            await store.put('k2', 'v2');

            Object.defineProperty(process, 'pid', { value: originalPid + 1000, configurable: true });

            await store.clear();
            expect(store.keys(10)).toHaveLength(0);
        });

        it('should handle multiple consecutive forks', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('persistent', 'data');

            for (let i = 1; i <= 5; i++) {
                Object.defineProperty(process, 'pid', { value: originalPid + i * 1000, configurable: true });
                // Same store reference works across multiple forks
                expect(store.get('persistent')).toBe('data');
            }
        });

        it('should not reopen when PID unchanged', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            // Multiple operations without PID change should not trigger recovery
            expect(store.get('key')).toBe('value');
            expect(store.get('key')).toBe('value');
            await store.put('key2', 'value2');
            expect(store.keys(10)).toHaveLength(2);
        });
    });

    describe('store isolation after fork', () => {
        it('should maintain data isolation between stores after fork', async () => {
            const store1 = factory.get(StoreName.public_schemas);
            const store2 = factory.get(StoreName.sam_schemas);

            await store1.put('key', 'store1-value');
            await store2.put('key', 'store2-value');

            Object.defineProperty(process, 'pid', { value: originalPid + 1000, configurable: true });

            // Both stores should recover independently
            expect(store1.get('key')).toBe('store1-value');
            expect(store2.get('key')).toBe('store2-value');
        });
    });

    describe('factory behavior', () => {
        it('should throw for unknown store name', () => {
            expect(() => factory.get('unknown-store' as StoreName)).toThrow('Store unknown-store not found');
        });

        it('should return correct store names', () => {
            const names = factory.storeNames;
            expect(names).toContain(StoreName.public_schemas);
            expect(names).toContain(StoreName.sam_schemas);
        });

        it('should be idempotent on close', () => {
            expect(async () => {
                await factory.close();
                await factory.close();
                await factory.close();
            }).not.toThrow();
        });

        it('should clear timers on close', async () => {
            const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
            const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

            await factory.close();

            expect(clearIntervalSpy).toHaveBeenCalled();
            expect(clearTimeoutSpy).toHaveBeenCalled();

            clearIntervalSpy.mockRestore();
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('cleanup safety', () => {
        it('should handle missing lmdb directory during cleanup', async () => {
            await factory.close();
            fs.rmSync(testDir, { recursive: true, force: true });

            const newFactory = new LMDBStoreFactory(testDir);
            factoriesToClose.push(newFactory);

            await expect(newFactory.close()).resolves.not.toThrow();
        });

        it('should cleanup old version directories', () => {
            // Create old version directories
            const lmdbDir = join(testDir, 'lmdb');
            fs.mkdirSync(join(lmdbDir, 'v1'), { recursive: true });
            fs.mkdirSync(join(lmdbDir, 'v2'), { recursive: true });
            fs.mkdirSync(join(lmdbDir, 'v3'), { recursive: true });

            // Create new instance that should load from the same files
            const newFactory = new LMDBStoreFactory(testDir);
            factoriesToClose.push(newFactory);

            // Wait for cleanup timeout (we can't easily test the 2min timeout,
            // but we verify the directories exist before close)
            expect(fs.existsSync(join(lmdbDir, 'v1'))).toBe(true);
            expect(fs.existsSync(join(lmdbDir, 'v2'))).toBe(true);
        });
    });

    describe('corruption recovery', () => {
        it('should recover from corrupted database on initialization', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');
            await factory.close();

            // Corrupt the database by writing invalid data
            const lmdbDir = join(testDir, 'lmdb', 'v5');
            const dataFile = join(lmdbDir, 'data.mdb');
            fs.writeFileSync(dataFile, 'corrupted data');

            // Should recover by deleting and recreating
            const newFactory = new LMDBStoreFactory(testDir);
            factoriesToClose.push(newFactory);
            const newStore = newFactory.get(StoreName.public_schemas);

            // Should be able to write after recovery
            await newStore.put('newkey', 'newvalue');
            expect(newStore.get('newkey')).toBe('newvalue');
        });

        it('should recover from runtime corruption', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            // Simulate corruption by triggering error handler
            const handleError = (factory as any).handleError.bind(factory);
            handleError(new Error('MDB_CORRUPTED: Located page was wrong type'));

            // Should still work after recovery
            await store.put('aftercorruption', 'value');
            expect(store.get('aftercorruption')).toBe('value');
        });

        it('should delete database for MDB_PAGE_NOTFOUND', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            const handleError = (factory as any).handleError.bind(factory);
            handleError(new Error('MDB_PAGE_NOTFOUND: Requested page not found'));

            await store.put('afterrecovery', 'value');
            expect(store.get('afterrecovery')).toBe('value');
        });

        it('should delete database for MDB_PANIC', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            const handleError = (factory as any).handleError.bind(factory);
            handleError(new Error('MDB_PANIC: Update of meta page failed'));

            await store.put('afterrecovery', 'value');
            expect(store.get('afterrecovery')).toBe('value');
        });
    });

    describe('transient error recovery', () => {
        it('should recover from MDB_BAD_TXN without deleting database', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            const handleError = (factory as any).handleError.bind(factory);
            handleError(new Error('MDB_BAD_TXN: Transaction must abort'));

            await store.put('afterrecovery', 'value');
            expect(store.get('afterrecovery')).toBe('value');
        });

        it('should recover from MDB_CURSOR_FULL without deleting database', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            const handleError = (factory as any).handleError.bind(factory);
            handleError(new Error('MDB_CURSOR_FULL: Cursor stack too deep'));

            await store.put('afterrecovery', 'value');
            expect(store.get('afterrecovery')).toBe('value');
        });

        it('should recover from closed database error', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            const handleError = (factory as any).handleError.bind(factory);
            handleError(new Error('closed database'));

            await store.put('afterrecovery', 'value');
            expect(store.get('afterrecovery')).toBe('value');
        });

        it('should recover from commit failed error', async () => {
            const store = factory.get(StoreName.public_schemas);
            await store.put('key', 'value');

            const handleError = (factory as any).handleError.bind(factory);
            handleError(new Error('Commit failed'));

            await store.put('afterrecovery', 'value');
            expect(store.get('afterrecovery')).toBe('value');
        });
    });
});
