import fs from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiDataStoreFactoryProvider, StoreName } from '../../../src/datastore/DataStore';
import { FileStoreFactory } from '../../../src/datastore/FileStoreFactory';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';
import { LoggerFactory } from '../../../src/telemetry/LoggerFactory';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';
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
        vi.restoreAllMocks();
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
        const enabled = new MultiDataStoreFactoryProvider({ isEnabled: () => true } as never, lmdbAvailable);
        const disabled = new MultiDataStoreFactoryProvider({ isEnabled: () => false } as never, lmdbAvailable);

        expect(backendOf(enabled)).toBe('FileStoreFactory');
        expect(backendOf(disabled)).toBe(isWindows ? 'FileStoreFactory' : 'LMDBStoreFactory');

        await enabled.close();
        await disabled.close();
    });

    it('should fall back to the file store when the LMDB native module cannot be loaded', async () => {
        const cause = Object.assign(new Error("/lib64/libc.so.6: version `GLIBC_2.33' not found"), {
            code: 'ERR_DLOPEN_FAILED',
        });
        const warn = vi.spyOn(LoggerFactory.getLogger('DataStore'), 'warn');
        const errorMetric = vi.spyOn(TelemetryService.instance.get('DataStore'), 'error');

        const provider = new MultiDataStoreFactoryProvider({ isEnabled: () => false } as never, () => ({
            available: false,
            cause,
        }));

        expect(backendOf(provider)).toBe('FileStoreFactory');
        if (!isWindows) {
            expect(warn).toHaveBeenCalledWith(cause, expect.stringContaining('falling back to FileDB'));
            expect(errorMetric).toHaveBeenCalledWith('lmdb.unavailable', cause, undefined, {
                captureErrorAttributes: true,
            });
        }

        await provider.close();
    });

    it('should not probe for LMDB when the file store is selected by flag', async () => {
        const probe = vi.fn(lmdbAvailable);

        const provider = new MultiDataStoreFactoryProvider({ isEnabled: () => true } as never, probe);

        expect(probe).not.toHaveBeenCalled();

        await provider.close();
    });
});

const lmdbAvailable = () => ({ available: true }) as const;

function backendOf(provider: MultiDataStoreFactoryProvider): string {
    return (provider as unknown as { persistedStore: object }).persistedStore.constructor.name;
}
