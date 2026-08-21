import fs from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MultiDataStoreFactoryProvider, StoreName } from '../../../src/datastore/DataStore';
import { FileStoreFactory } from '../../../src/datastore/FileStoreFactory';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';
import { isWindows } from '../../../src/utils/Environment';

/**
 * The two persisted-store backends disagree about whether get() is legal before initialize():
 * FileStoreFactory populates its store map in the constructor, LMDBStoreFactory only in
 * initialize(). Consumers that resolve stores eagerly — SchemaStore does, in its field
 * initialisers — therefore work on one backend and throw on the other, and the throwing case is
 * only reachable when the LMDB backend is selected. Pin both halves, and pin the selection rule,
 * so the asymmetry cannot regress silently again.
 */
describe('datastore factory initialize contract', () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'factory-init-contract-test', `test-${Date.now()}`);
        fs.mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should throw when the LMDB store factory is used before initialize', async () => {
        const factory = new LMDBStoreFactory(testDir);

        expect(() => factory.get(StoreName.public_schemas)).toThrow(/Store public_schemas not found/);

        await factory.close();
    });

    it('should resolve stores on the file store factory without initialize', async () => {
        const factory = new FileStoreFactory(testDir);

        expect(factory.get(StoreName.public_schemas)).toBeDefined();

        await factory.close();
    });

    it('should select the file store when FileDb is enabled, and on Windows regardless of it', async () => {
        const backendOf = (provider: MultiDataStoreFactoryProvider): string =>
            (provider as unknown as { persistedStore: object }).persistedStore.constructor.name;

        const enabled = new MultiDataStoreFactoryProvider({ isEnabled: () => true } as never);
        const disabled = new MultiDataStoreFactoryProvider({ isEnabled: () => false } as never);

        expect(backendOf(enabled)).toBe('FileStoreFactory');
        expect(backendOf(disabled)).toBe(isWindows ? 'FileStoreFactory' : 'LMDBStoreFactory');

        await enabled.close();
        await disabled.close();
    });
});
