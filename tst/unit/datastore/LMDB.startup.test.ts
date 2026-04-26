import fs from 'fs';
import { join } from 'path';
import { open } from 'lmdb';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StoreName } from '../../../src/datastore/DataStore';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';

vi.mock('lmdb', async () => {
    const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
    return {
        ...actual,
        open: vi.fn().mockImplementation(actual.open),
    };
});

const mockedOpen = vi.mocked(open);

describe('LMDB startup corruption recovery', () => {
    let testDir: string;

    beforeEach(async () => {
        mockedOpen.mockReset();
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        mockedOpen.mockImplementation(actual.open);
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-startup-recovery-test', `test-${Date.now()}`);
        fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should recover when createEnv fails with corruption on startup', async () => {
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');

        // First call throws, second call (after delete) succeeds
        mockedOpen
            .mockImplementationOnce(() => {
                throw new Error('MDB_CORRUPTED: Located page was wrong type');
            })
            .mockImplementation(actual.open);

        const factory = new LMDBStoreFactory(testDir);
        const store = factory.get(StoreName.public_schemas);

        await store.put('key', 'value');
        expect(store.get('key')).toBe('value');

        await factory.close();
    });

    it('should recover when openDB fails with corruption on startup', async () => {
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        let callCount = 0;

        // open() succeeds but returns an env whose openDB throws on first call
        mockedOpen.mockImplementation((config: any) => {
            const env = actual.open(config);
            if (callCount === 0) {
                callCount++;
                const origOpenDB = env.openDB.bind(env);
                env.openDB = () => {
                    env.openDB = origOpenDB;
                    throw new Error('MDB_CORRUPTED: Located page was wrong type');
                };
            }
            return env;
        });

        const factory = new LMDBStoreFactory(testDir);
        const store = factory.get(StoreName.public_schemas);

        await store.put('key', 'value');
        expect(store.get('key')).toBe('value');

        await factory.close();
    });

    it('should delete the version directory during env recovery', async () => {
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        const versionDir = join(testDir, 'lmdb', 'v5');

        fs.mkdirSync(versionDir, { recursive: true });
        fs.writeFileSync(join(versionDir, 'dummy'), 'data');

        mockedOpen
            .mockImplementationOnce(() => {
                throw new Error('MDB_CORRUPTED: Located page was wrong type');
            })
            .mockImplementation(actual.open);

        const factory = new LMDBStoreFactory(testDir);

        // The dummy file should be gone (directory was deleted and recreated)
        expect(fs.existsSync(join(versionDir, 'dummy'))).toBe(false);

        await factory.close();
    });
});
