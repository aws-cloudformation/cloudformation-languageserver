import { describe, expect, test, vi } from 'vitest';
import { MemoryMonitor } from '../../../src/services/MemoryMonitor';

/**
 * Tests the staged enforcement policy:
 * - below soft limit: nothing happens
 * - soft limit: reclaim (Pyodide worker restart), rate-limited by cooldown
 * - hard limit: forced reclaim, then process exit after consecutive strikes
 */

function makeMonitor(opts: {
    rss?: () => number;
    heap?: () => [number, number];
    softLimitMb?: number;
    hardLimitMb?: number;
    heapSoftFraction?: number;
    heapHardFraction?: number;
    reclaimCooldownMs?: number;
    reclaimHeap?: boolean;
}) {
    const reclaim = vi.fn().mockResolvedValue(undefined);
    const reclaimHeap = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    const monitor = new MemoryMonitor(
        reclaim,
        {
            softLimitMb: opts.softLimitMb ?? 1200,
            hardLimitMb: opts.hardLimitMb ?? 1600,
            // Heap stage defaults off in RSS-focused tests; heap tests opt in
            heapSoftFraction: opts.heapSoftFraction ?? 0,
            heapHardFraction: opts.heapHardFraction ?? 0,
            reclaimCooldownMs: opts.reclaimCooldownMs ?? 0,
            getRssMb: opts.rss ?? (() => 100),
            getHeapMb: opts.heap ?? (() => [100, 512]),
            exit,
        },
        opts.reclaimHeap === false ? undefined : reclaimHeap,
    );
    return { monitor, reclaim, reclaimHeap, exit };
}

describe('MemoryMonitor', () => {
    test('does nothing below the soft limit', async () => {
        const { monitor, reclaim, exit } = makeMonitor({ rss: () => 800 });

        await monitor.check();

        expect(reclaim).not.toHaveBeenCalled();
        expect(exit).not.toHaveBeenCalled();
    });

    test('reclaims at the soft limit', async () => {
        const { monitor, reclaim, exit } = makeMonitor({ rss: () => 1300 });

        await monitor.check();

        expect(reclaim).toHaveBeenCalledOnce();
        expect(reclaim.mock.calls[0][0]).toContain('soft limit 1200MB');
        expect(exit).not.toHaveBeenCalled();
    });

    test('soft-limit reclaims are rate-limited by the cooldown', async () => {
        const { monitor, reclaim } = makeMonitor({ rss: () => 1300, reclaimCooldownMs: 60_000 });

        await monitor.check();
        await monitor.check();
        await monitor.check();

        expect(reclaim).toHaveBeenCalledOnce();
    });

    test('hard limit forces a reclaim ignoring the cooldown, then exits after consecutive strikes', async () => {
        const { monitor, reclaim, exit } = makeMonitor({ rss: () => 1700, reclaimCooldownMs: 60_000 });

        await monitor.check(); // strike 1 — forced reclaim
        expect(reclaim).toHaveBeenCalledOnce();
        expect(exit).not.toHaveBeenCalled();

        await monitor.check(); // strike 2 — forced reclaim again
        expect(exit).not.toHaveBeenCalled();

        await monitor.check(); // strike 3 — exit
        expect(exit).toHaveBeenCalledWith(1);
    });

    test('hard strikes reset when memory recovers', async () => {
        let rss = 1700;
        const { monitor, exit } = makeMonitor({ rss: () => rss });

        await monitor.check(); // strike 1
        await monitor.check(); // strike 2
        rss = 900; // reclaim worked
        await monitor.check(); // resets strikes
        rss = 1700;
        await monitor.check(); // strike 1 again
        await monitor.check(); // strike 2 again

        expect(exit).not.toHaveBeenCalled();
    });

    test('a reclaim failure does not break the monitor', async () => {
        const reclaim = vi.fn().mockRejectedValue(new Error('worker stuck'));
        const exit = vi.fn();
        const monitor = new MemoryMonitor(reclaim, {
            softLimitMb: 1200,
            hardLimitMb: 1600,
            heapSoftFraction: 0,
            heapHardFraction: 0,
            reclaimCooldownMs: 0,
            getRssMb: () => 1300,
            exit,
        });

        await expect(monitor.check()).resolves.toBeUndefined();
        await expect(monitor.check()).resolves.toBeUndefined();
        expect(reclaim).toHaveBeenCalledTimes(2);
    });

    test('limits of 0 disable the corresponding stage', async () => {
        const { monitor, reclaim, exit } = makeMonitor({ rss: () => 99999, softLimitMb: 0, hardLimitMb: 0 });

        monitor.start(); // no-op when fully disabled
        await monitor.check();

        expect(reclaim).not.toHaveBeenCalled();
        expect(exit).not.toHaveBeenCalled();
        monitor.close();
    });

    test('start/close manage the interval safely and are idempotent', () => {
        const { monitor } = makeMonitor({ rss: () => 100 });

        expect(() => {
            monitor.start();
            monitor.start(); // no double timer
            monitor.close();
            monitor.close(); // no throw
        }).not.toThrow();
    });

    describe('main V8 heap policy (non-Pyodide pool)', () => {
        test('does nothing below the heap soft fraction', async () => {
            const { monitor, reclaimHeap, exit } = makeMonitor({
                heap: () => [300, 512], // ~59%
                heapSoftFraction: 0.85,
                heapHardFraction: 0.95,
            });

            await monitor.check();

            expect(reclaimHeap).not.toHaveBeenCalled();
            expect(exit).not.toHaveBeenCalled();
        });

        test('reclaims rebuildable caches at the heap soft fraction', async () => {
            const { monitor, reclaimHeap, reclaim, exit } = makeMonitor({
                heap: () => [450, 512], // ~88%
                heapSoftFraction: 0.85,
                heapHardFraction: 0.95,
            });

            await monitor.check();

            expect(reclaimHeap).toHaveBeenCalledOnce();
            expect(reclaimHeap.mock.calls[0][0]).toContain('% of V8 limit');
            expect(reclaim).not.toHaveBeenCalled(); // heap pressure never restarts the worker
            expect(exit).not.toHaveBeenCalled();
        });

        test('exits gracefully before V8 aborts after consecutive heap hard strikes', async () => {
            const { monitor, reclaimHeap, exit } = makeMonitor({
                heap: () => [500, 512], // ~98%
                heapSoftFraction: 0.85,
                heapHardFraction: 0.95,
            });

            await monitor.check(); // strike 1 — forced heap reclaim
            expect(reclaimHeap).toHaveBeenCalledOnce();
            expect(exit).not.toHaveBeenCalled();

            await monitor.check(); // strike 2
            expect(exit).not.toHaveBeenCalled();

            await monitor.check(); // strike 3 — exit before the V8 OOM abort
            expect(exit).toHaveBeenCalledWith(1);
        });

        test('heap strikes reset when the heap recovers', async () => {
            let used = 500;
            const { monitor, exit } = makeMonitor({
                heap: () => [used, 512],
                heapSoftFraction: 0.85,
                heapHardFraction: 0.95,
            });

            await monitor.check(); // strike 1
            await monitor.check(); // strike 2
            used = 200; // cache reclaim worked
            await monitor.check(); // resets strikes
            used = 500;
            await monitor.check(); // strike 1 again
            await monitor.check(); // strike 2 again

            expect(exit).not.toHaveBeenCalled();
        });

        test('heap stage is safe without a heap reclaim callback', async () => {
            const { monitor, exit } = makeMonitor({
                heap: () => [450, 512],
                heapSoftFraction: 0.85,
                heapHardFraction: 0.95,
                reclaimHeap: false,
            });

            await expect(monitor.check()).resolves.toBeUndefined();
            expect(exit).not.toHaveBeenCalled();
        });

        test('adapts to the configured V8 limit rather than a fixed MB value', async () => {
            // Same used MB, larger limit → no breach
            const { monitor, reclaimHeap } = makeMonitor({
                heap: () => [450, 1024], // ~44% of a 1GB cap
                heapSoftFraction: 0.85,
                heapHardFraction: 0.95,
            });

            await monitor.check();

            expect(reclaimHeap).not.toHaveBeenCalled();
        });
    });
});
