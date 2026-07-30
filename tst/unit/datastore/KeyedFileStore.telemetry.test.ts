import { randomUUID as v4 } from 'crypto';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptionKey } from '../../../src/datastore/file/Encryption';
import { KeyedFileStore } from '../../../src/datastore/file/KeyedFileStore';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';
import { LocalFile } from '../../../src/utils/LocalFile';

const StoreScope = 'FileStore.test';

describe('KeyedFileStore error telemetry', () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'keyed-file-store-telemetry', v4());
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(testDir, { recursive: true, force: true });
    });

    function createStore(): KeyedFileStore {
        return new KeyedFileStore(encryptionKey(2), 'test', testDir, vi.fn(), vi.fn());
    }

    it('should report a directory scan failure that is caught during startup', () => {
        rmSync(testDir, { recursive: true, force: true });
        const errorMetric = vi.spyOn(TelemetryService.instance.get(StoreScope), 'error');

        expect(createStore).not.toThrow();

        expect(errorMetric).toHaveBeenCalledWith(
            'files.scan.error',
            expect.objectContaining({ code: 'ENOENT' }),
            undefined,
            { captureErrorAttributes: true },
        );
    });

    it('should report a corrupt-file recovery failure that does not stop startup', () => {
        writeFileSync(join(testDir, 'test.corrupt.enc'), 'corrupt');
        const recoveryError = Object.assign(new Error('file is busy'), { code: 'EBUSY' });
        vi.spyOn(LocalFile.prototype, 'unsafeRemove').mockImplementation(() => {
            throw recoveryError;
        });
        const errorMetric = vi.spyOn(TelemetryService.instance.get(StoreScope), 'error');

        expect(createStore).not.toThrow();

        expect(errorMetric).toHaveBeenCalledWith('file.recovery.error', recoveryError, undefined, {
            captureErrorAttributes: true,
        });
    });
});
