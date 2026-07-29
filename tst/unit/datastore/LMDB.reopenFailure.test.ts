import { randomUUID as v4 } from 'crypto';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { open, RootDatabase } from 'lmdb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';

vi.mock('lmdb', async () => {
    const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
    return { ...actual, open: vi.fn().mockImplementation(actual.open) };
});

const mockedOpen = vi.mocked(open);

type Internals = { env: RootDatabase | undefined; reopenEnv: () => unknown };

/**
 * Reopening the environment replaces the handle, and the replacement is assigned to `this.env` before
 * its stores are opened. If opening a store then throws, both the previous handle and the half-open
 * replacement are left with no reference able to close them — every failed recovery leaks an
 * environment handle and a reader slot, and `maxReaders` is finite.
 */
describe('LMDB failed reopen', () => {
    let testDir: string;
    let factory: LMDBStoreFactory;

    beforeEach(async () => {
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        mockedOpen.mockReset();
        mockedOpen.mockImplementation(actual.open);

        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-reopen-failure', v4());
        mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
        await factory.initialize();
    });

    afterEach(async () => {
        await factory.close();
        rmSync(testDir, { recursive: true, force: true });
    });

    it('should close both the previous handle and the half-open replacement', async () => {
        const internals = factory as unknown as Internals;
        const previousEnv = internals.env as RootDatabase;
        const previousClose = vi.spyOn(previousEnv, 'close');

        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        // Reuse the config the factory already opened with, so the replacement env is configured
        // identically and the mock needs no parameter of its own.
        const [openConfig] = mockedOpen.mock.calls[0];
        let replacementCloses = 0;
        mockedOpen.mockImplementationOnce(() => {
            const env = actual.open(openConfig);
            const realClose = env.close.bind(env);
            env.close = async () => {
                replacementCloses++;
                return await realClose();
            };
            env.openDB = () => {
                throw new Error('MDB_CORRUPTED: Located page was wrong type');
            };
            return env;
        });

        expect(() => internals.reopenEnv()).toThrow('MDB_CORRUPTED');

        await vi.waitFor(() => {
            expect(previousClose).toHaveBeenCalled();
            expect(replacementCloses).toBe(1);
        });
    });

    it('should still close the previous handle on a successful reopen', async () => {
        const internals = factory as unknown as Internals;
        const previousEnv = internals.env as RootDatabase;
        const previousClose = vi.spyOn(previousEnv, 'close');

        internals.reopenEnv();

        await vi.waitFor(() => expect(previousClose).toHaveBeenCalledOnce());
        expect(internals.env).toBeDefined();
        expect(internals.env).not.toBe(previousEnv);
    });
});
