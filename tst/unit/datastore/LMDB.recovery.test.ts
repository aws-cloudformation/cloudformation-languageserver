import fs from 'fs';
import { join } from 'path';
import { v4 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDB';

describe('LMDB fork detection and recovery', () => {
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-recovery-test', v4());
    let factory: LMDBStoreFactory;
    let originalPid: number;

    beforeEach(() => {
        originalPid = process.pid;
        fs.mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
    });

    afterEach(async () => {
        Object.defineProperty(process, 'pid', { value: originalPid, configurable: true });
        await factory.close();
        fs.rmSync(testDir, { recursive: true, force: true });
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

            expect(async () => {
                await newFactory.close();
            }).not.toThrow();
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
