import { randomUUID as v4 } from 'crypto';
import { mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { RootDatabase } from 'lmdb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreName } from '../../../src/datastore/DataStore';
import { encryptionKey } from '../../../src/datastore/file/Encryption';
import { KeyedFileStore } from '../../../src/datastore/file/KeyedFileStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';
import { resolveCommitError } from '../../../src/datastore/lmdb/CommitError';
import { LocalFile } from '../../../src/utils/LocalFile';

const OutOfDisk = () => Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });

/**
 * A failed write must leave the in-memory view matching disk, for the same reason `remove` and `clear`
 * must: a value this session serves but never persisted is read back as the old value by the next one,
 * and nothing reconciles the two. Observed on a real full disk before this ordering was fixed.
 */
describe('KeyedFileStore put durability', () => {
    let dir: string;

    beforeEach(() => {
        dir = join(process.cwd(), 'node_modules', '.cache', 'put-durability', v4());
        mkdirSync(dir, { recursive: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(dir, { recursive: true, force: true });
    });

    function store() {
        return new KeyedFileStore(
            encryptionKey(3),
            'test',
            dir,
            () => {},
            () => {},
        );
    }

    it('should keep serving the last persisted value when the write fails', async () => {
        const live = store();
        await live.put('region', 'ORIGINAL');

        vi.spyOn(LocalFile.prototype, 'write').mockRejectedValue(OutOfDisk());
        await expect(live.put('region', 'REPLACEMENT')).rejects.toThrow('no space left on device');

        expect(live.get('region')).toBe('ORIGINAL');
        // What the next session reads must agree with what this one reports.
        expect(store().get('region')).toBe('ORIGINAL');
    });

    it('should still commit the value when the write succeeds', async () => {
        const live = store();
        await live.put('region', 'PERSISTED');

        expect(live.get('region')).toBe('PERSISTED');
        expect(store().get('region')).toBe('PERSISTED');
    });
});

describe('resolveCommitError bounds its wait', () => {
    it('should give up on a commitError that never settles rather than hanging the caller', async () => {
        const error = Object.assign(new Error('Commit failed (see commitError for details)'), {
            commitError: new Promise(() => {}),
        });

        await expect(resolveCommitError(error)).resolves.toBeUndefined();
    });

    it('should still return a cause that settles', async () => {
        const cause = OutOfDisk();
        const error = Object.assign(new Error('Commit failed (see commitError for details)'), {
            commitError: Promise.reject(cause),
        });

        await expect(resolveCommitError(error)).resolves.toBe(cause);
    });
});

describe('LMDBStoreFactory shutdown and recovery', () => {
    let dir: string;
    let factory: LMDBStoreFactory;

    beforeEach(async () => {
        dir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-shutdown', v4());
        mkdirSync(dir, { recursive: true });
        factory = new LMDBStoreFactory(dir);
        await factory.initialize();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(dir, { recursive: true, force: true });
    });

    function markers(): ReadonlyArray<string> {
        return readdirSync(join(dir, 'lmdb', 'markers')).filter((name) => name.startsWith('owner.'));
    }

    it('should return from close even when the environment never finishes closing', async () => {
        // lmdb flushes outstanding writes before releasing the handle, which never completes on a full
        // disk. An unbounded wait here wedges the LSP shutdown request.
        const env = (factory as unknown as { env: RootDatabase }).env;
        vi.spyOn(env, 'close').mockImplementation(() => new Promise<void>(() => {}));

        await expect(factory.close()).resolves.toBeUndefined();
    }, 15000);

    it('should release the ownership marker even when closing the environment fails', async () => {
        const env = (factory as unknown as { env: RootDatabase }).env;
        vi.spyOn(env, 'close').mockRejectedValue(new Error('close failed'));

        await factory.close();

        expect(markers()).toEqual([]);
    });

    it('should keep working normally when the environment closes cleanly', async () => {
        const store = factory.get(StoreName.public_schemas);
        await store.put('us-east-1', 'schemas');

        await factory.close();

        expect(markers()).toEqual([]);
    });
});
