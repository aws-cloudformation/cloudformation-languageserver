import { randomUUID as v4 } from 'crypto';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStoreFactory } from '../../../src/datastore/FileStoreFactory';
import { LMDBStoreFactory } from '../../../src/datastore/LMDBStoreFactory';
import { StoreMetric } from '../../../src/datastore/Utils';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';

/**
 * The report's headline finding is that the store failures are caused by the user's disk, and that
 * nothing in either store measured it: there was no disk-space counter anywhere, and `total.usage`
 * was emitted only by LMDB. These tests pin the metrics that make that visible.
 */
describe('store disk usage metrics', () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'store-disk-metrics-test', v4());
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(testDir, { recursive: true, force: true });
    });

    describe('FileStoreFactory', () => {
        it('should report free disk space alongside its own size', () => {
            const factory = new FileStoreFactory(testDir);
            const histogram = vi.spyOn(TelemetryService.instance.get('FileStore.Global'), 'histogram');

            (factory as unknown as { emitMetrics: () => void }).emitMetrics();

            expect(histogram).toHaveBeenCalledWith(
                StoreMetric.diskAvailableBytes,
                expect.any(Number),
                expect.objectContaining({ unit: 'By' }),
            );
            expect(histogram).toHaveBeenCalledWith(
                StoreMetric.diskTotalBytes,
                expect.any(Number),
                expect.objectContaining({ unit: 'By' }),
            );
            expect(histogram).toHaveBeenCalledWith(
                StoreMetric.diskAvailablePercent,
                expect.any(Number),
                expect.objectContaining({ unit: '%' }),
            );
        });

        it('should emit total.usage, which only LMDB reported before', () => {
            const factory = new FileStoreFactory(testDir);
            const histogram = vi.spyOn(TelemetryService.instance.get('FileStore.Global'), 'histogram');

            (factory as unknown as { emitMetrics: () => void }).emitMetrics();

            expect(histogram).toHaveBeenCalledWith('total.usage', expect.any(Number), { unit: '%' });
        });

        it('should not emit metrics after close', () => {
            const factory = new FileStoreFactory(testDir);
            void factory.close();
            const histogram = vi.spyOn(TelemetryService.instance.get('FileStore.Global'), 'histogram');

            (factory as unknown as { emitMetrics: () => void }).emitMetrics();

            expect(histogram).not.toHaveBeenCalled();
        });
    });

    describe('LMDBStoreFactory', () => {
        let factory: LMDBStoreFactory;

        beforeEach(async () => {
            factory = new LMDBStoreFactory(testDir);
            await factory.initialize();
        });

        afterEach(async () => {
            await factory.close();
        });

        it('should report free disk space alongside its own size', () => {
            const histogram = vi.spyOn(TelemetryService.instance.get('LMDB.Global'), 'histogram');

            (factory as unknown as { emitMetrics: () => void }).emitMetrics();

            expect(histogram).toHaveBeenCalledWith(
                StoreMetric.diskAvailableBytes,
                expect.any(Number),
                expect.objectContaining({ unit: 'By' }),
            );
            expect(histogram).toHaveBeenCalledWith(
                StoreMetric.diskAvailablePercent,
                expect.any(Number),
                expect.objectContaining({ unit: '%' }),
            );
        });

        it('should report usage against the shared datastore budget', () => {
            const histogram = vi.spyOn(TelemetryService.instance.get('LMDB.Global'), 'histogram');

            (factory as unknown as { emitMetrics: () => void }).emitMetrics();

            expect(histogram).toHaveBeenCalledWith('total.usage', expect.any(Number), { unit: '%' });
            expect(histogram).toHaveBeenCalledWith('total.size.bytes', expect.any(Number), { unit: 'By' });
        });
    });
});
