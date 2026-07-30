import { randomUUID as v4 } from 'crypto';
import fs from 'fs';
import { join } from 'path';
import { open } from 'lmdb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';
import { DiscardReason, StoreMetric } from '../../../src/datastore/Utils';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';

vi.mock('lmdb', async () => {
    const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
    return { ...actual, open: vi.fn().mockImplementation(actual.open) };
});

const mockedOpen = vi.mocked(open);

const OutOfDiskMessage = 'No space left on device: Attempting to write page at position 191807488, size 11976704';

/**
 * `tryOpen()`/`recreateAfterCorruption()` used to wipe the data directory with only a `log.warn`, so
 * startup data loss was invisible in telemetry and its cause was never recorded. These tests pin
 * both the counter and the reason attached to it.
 */
describe('LMDB startup data discard instrumentation', () => {
    let testDir: string;
    let count: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        mockedOpen.mockReset();
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        mockedOpen.mockImplementation(actual.open);

        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-startup-discard-test', v4());
        fs.mkdirSync(testDir, { recursive: true });
        count = vi.spyOn(TelemetryService.instance.get('LMDB.Global'), 'count');
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await new Promise((resolve) => setTimeout(resolve, 50));
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    async function openFactoryWithFirstOpenFailing(error: Error): Promise<LMDBStoreFactory> {
        const actual = await vi.importActual<typeof import('lmdb')>('lmdb');
        mockedOpen
            .mockImplementationOnce(() => {
                throw error;
            })
            .mockImplementation(actual.open);

        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();
        return factory;
    }

    it('should count a discarded database and attribute it to corruption', async () => {
        const factory = await openFactoryWithFirstOpenFailing(new Error('MDB_CORRUPTED: Located page was wrong type'));

        try {
            expect(count).toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.Corrupted}`, 1);
        } finally {
            await factory.close();
        }
    });

    it('should attribute a discard after a key change to an integrity failure, not corruption', async () => {
        // What a hostname change produces: the bytes are intact and the key no longer matches.
        const factory = await openFactoryWithFirstOpenFailing(new Error('MDB_BAD_CHECKSUM: Page checksum mismatch'));

        try {
            expect(count).toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.IntegrityCheckFailed}`, 1);
            expect(count).not.toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.Corrupted}`, 1);
        } finally {
            await factory.close();
        }
    });

    it('should attribute a precautionary wipe after a crash to the prior crash, not corruption', async () => {
        // A crash marker left by the previous run triggers the wipe before any open is attempted.
        const markerDir = join(testDir, 'lmdb', 'markers');
        fs.mkdirSync(markerDir, { recursive: true });
        fs.writeFileSync(join(markerDir, `owner.${process.pid}.opening`), '');

        const factory = new LMDBStoreFactory(testDir);
        await factory.initialize();

        try {
            expect(count).toHaveBeenCalledWith('startup.crashRecovery', 1);
            expect(count).toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.PriorCrash}`, 1);
            expect(count).not.toHaveBeenCalledWith(`${StoreMetric.dataDiscarded}.${DiscardReason.Corrupted}`, 1);
        } finally {
            await factory.close();
        }
    });

    it('should not leave a crash marker behind when the open fails as a JS exception', async () => {
        // The marker detects a C-level abort, which leaves no chance to clean up. A JS exception is
        // the opposite case, and treating it as a crash would wipe the data on the next startup.
        mockedOpen.mockImplementation(() => {
            throw new Error(OutOfDiskMessage);
        });

        const factory = new LMDBStoreFactory(testDir);
        await expect(factory.initialize()).rejects.toThrow('No space left on device');

        const markers = fs.readdirSync(join(testDir, 'lmdb', 'markers')).filter((name) => name.startsWith('owner.'));
        expect(markers).toEqual([]);
    });
});
