import { describe, expect, it, vi } from 'vitest';
import { MultiDataStoreFactoryProvider } from '../../../src/datastore/DataStore';
import { MemoryStoreFactory } from '../../../src/datastore/MemoryStore';

/**
 * Every datastore factory owns a background metrics interval. All of them must be unref'd so the timer
 * never holds the event loop open, and all of them must actually be closed — the memory factory was
 * neither, so its `clearInterval` never ran and it kept emitting after telemetry had shut down.
 */
describe('datastore factory background timers', () => {
    it('should not hold the event loop open with the memory factory metrics interval', async () => {
        const factory = new MemoryStoreFactory();

        const timer = (factory as unknown as { metricsInterval: NodeJS.Timeout }).metricsInterval;
        expect(timer.hasRef()).toBe(false);

        await factory.close();
    });

    it('should stop emitting memory store metrics after close', async () => {
        const factory = new MemoryStoreFactory();
        await factory.close();

        const emit = vi.spyOn((factory as unknown as { telemetry: { histogram: () => void } }).telemetry, 'histogram');
        (factory as unknown as { emitMetrics: () => void }).emitMetrics();

        expect(emit).not.toHaveBeenCalled();
        vi.restoreAllMocks();
    });

    it('should close both the memory and the persisted factory', async () => {
        const provider = new MultiDataStoreFactoryProvider({ isEnabled: () => true } as never);
        const internals = provider as unknown as {
            memoryStoreFactory: MemoryStoreFactory;
            persistedStore: { close: () => Promise<void> };
        };
        const memoryClose = vi.spyOn(internals.memoryStoreFactory, 'close');
        const persistedClose = vi.spyOn(internals.persistedStore, 'close');

        await provider.close();

        expect(memoryClose).toHaveBeenCalled();
        expect(persistedClose).toHaveBeenCalled();
        vi.restoreAllMocks();
        await internals.memoryStoreFactory.close();
    });
});
