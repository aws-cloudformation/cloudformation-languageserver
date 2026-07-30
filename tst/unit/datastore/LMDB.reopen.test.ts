import { randomUUID as v4 } from 'crypto';
import fs from 'fs';
import { join } from 'path';
import { RootDatabase } from 'lmdb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';

type ReopenableFactory = { reopenEnv: () => void; env: RootDatabase | undefined };

describe('LMDB environment reopen', () => {
    let testDir: string;
    let factory: LMDBStoreFactory;

    beforeEach(async () => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-reopen-test', v4());
        fs.mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
        await factory.initialize();
    });

    afterEach(async () => {
        await factory.close();
    });

    it('should close the previous environment so reopening does not leak a handle', async () => {
        const internals = factory as unknown as ReopenableFactory;
        const previousEnv = internals.env as RootDatabase;
        const closePreviousEnv = vi.spyOn(previousEnv, 'close');

        internals.reopenEnv();
        await vi.waitFor(() => expect(closePreviousEnv).toHaveBeenCalledOnce());

        expect(internals.env).not.toBe(previousEnv);
        // `not.toBe` alone also passes when the reference was cleared, which would silently stop
        // metrics and skip shutdown, so assert the replacement is still held.
        expect(internals.env).toBeDefined();
    });

    it('should keep the replacement environment after several reopens', async () => {
        const internals = factory as unknown as ReopenableFactory;
        const store = factory.get(StoreName.public_schemas);
        await store.put('us-east-1', 'schemas');

        for (let attempt = 0; attempt < 5; attempt++) {
            store.get<string>('us-east-1');
            internals.reopenEnv();
            await new Promise((resolve) => setTimeout(resolve, 5));
            expect(internals.env).toBeDefined();
        }

        await expect(store.put('eu-west-1', 'more schemas')).resolves.toBe(true);
        expect(store.get<string>('us-east-1')).toBe('schemas');
    });

    it('should keep stored data readable across a reopen', async () => {
        const store = factory.get(StoreName.public_schemas);
        await store.put('us-east-1', 'schemas');

        (factory as unknown as ReopenableFactory).reopenEnv();

        expect(store.get<string>('us-east-1')).toBe('schemas');
    });

    it('should keep the store writable after a reopen', async () => {
        const store = factory.get(StoreName.public_schemas);

        (factory as unknown as ReopenableFactory).reopenEnv();

        await expect(store.put('us-west-2', 'more schemas')).resolves.toBe(true);
        expect(store.get<string>('us-west-2')).toBe('more schemas');
    });

    it('should tolerate a failure to close the previous environment', () => {
        const internals = factory as unknown as ReopenableFactory;
        const previousEnv = internals.env as RootDatabase;
        vi.spyOn(previousEnv, 'close').mockRejectedValue(new Error('close failed'));

        expect(() => internals.reopenEnv()).not.toThrow();
        expect(internals.env).not.toBe(previousEnv);
    });

    it('should still release the ownership marker when the environment is already gone', async () => {
        const internals = factory as unknown as ReopenableFactory;
        internals.env = undefined;

        await factory.close();

        const markers = fs.readdirSync(join(testDir, 'lmdb', 'markers')).filter((name) => name.startsWith('owner.'));
        expect(markers).toEqual([]);
    });

    it('should not raise an uncaught exception from the pending read transaction reset', async () => {
        const store = factory.get(StoreName.public_schemas);
        await store.put('us-east-1', 'schemas');
        // Leaves lmdb's `setTimeout(resetReadTxn, 0)` pending against the environment being replaced.
        store.get<string>('us-east-1');

        const uncaught: unknown[] = [];
        const onUncaught = (error: unknown) => uncaught.push(error);
        process.on('uncaughtException', onUncaught);

        try {
            (factory as unknown as ReopenableFactory).reopenEnv();
            await new Promise((resolve) => setTimeout(resolve, 25));
        } finally {
            process.off('uncaughtException', onUncaught);
        }

        expect(uncaught).toEqual([]);
    });
});
