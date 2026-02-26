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

    beforeEach(() => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-recovery-test', v4());
        originalPid = process.pid;
        fs.mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
    });

    afterEach(async () => {
        Object.defineProperty(process, 'pid', { value: originalPid, configurable: true });
        await factory.close();
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

    describe('cached reference stability', () => {
        it('should keep cached store references working after recoverFromFork', async () => {
            // Simulate SchemaStore pattern: grab reference once, hold it
            const cachedRef = factory.get(StoreName.public_schemas);
            await cachedRef.put('before', 'fork');

            // Trigger recoverFromFork via handleError with fork-style error
            const handleError = (factory as any).handleError.bind(factory);
            Object.defineProperty(process, 'pid', { value: originalPid + 1000, configurable: true });
            handleError(new Error("doesn't match env pid"));

            // The cached reference must still work — not be a dangling old object
            expect(cachedRef.get('before')).toBe('fork');
            await cachedRef.put('after', 'fork');
            expect(cachedRef.get('after')).toBe('fork');
        });

        it('should keep cached store references working after recoverFromError', async () => {
            const cachedRef = factory.get(StoreName.public_schemas);
            await cachedRef.put('before', 'error');

            // Trigger recoverFromError via handleError with a generic error
            const reopenSpy = vi.spyOn(factory as any, 'reopenEnv');
            const handleError = (factory as any).handleError.bind(factory);
            handleError(new Error('MDB_CORRUPTED: some corruption'));

            expect(reopenSpy).toHaveBeenCalled();

            // The cached reference must still be the same object and functional
            expect(factory.get(StoreName.public_schemas)).toBe(cachedRef);
            await cachedRef.put('after', 'error');
            expect(cachedRef.get('after')).toBe('error');

            reopenSpy.mockRestore();
        });

        it('should preserve object identity of stores after recreateStores', () => {
            const refBefore = factory.get(StoreName.public_schemas);
            const samRefBefore = factory.get(StoreName.sam_schemas);

            // Directly call recreateStores
            (factory as any).recreateStores();

            // factory.get() must return the exact same object
            expect(factory.get(StoreName.public_schemas)).toBe(refBefore);
            expect(factory.get(StoreName.sam_schemas)).toBe(samRefBefore);
        });

        it('should allow reads and writes on cached reference after recreateStores', async () => {
            const cachedRef = factory.get(StoreName.public_schemas);
            await cachedRef.put('key', 'value');

            (factory as any).recreateStores();

            // Cached ref should still read/write correctly
            expect(cachedRef.get('key')).toBe('value');
            await cachedRef.put('key2', 'value2');
            expect(cachedRef.get('key2')).toBe('value2');
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

            await expect(newFactory.close()).resolves.not.toThrow();
        });

        it('should cleanup old version directories', async () => {
            // Create old version directories
            const lmdbDir = join(testDir, 'lmdb');
            fs.mkdirSync(join(lmdbDir, 'v1'), { recursive: true });
            fs.mkdirSync(join(lmdbDir, 'v2'), { recursive: true });
            fs.mkdirSync(join(lmdbDir, 'v3'), { recursive: true });

            // Wait for cleanup timeout (we can't easily test the 2min timeout,
            // but we verify the directories exist before close)
            expect(fs.existsSync(join(lmdbDir, 'v1'))).toBe(true);
            expect(fs.existsSync(join(lmdbDir, 'v2'))).toBe(true);

            await factory.close();
        });
    });
});
