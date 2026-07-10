import { setImmediate } from 'node:timers/promises';

export async function flushAllPromises() {
    await setImmediate();
}

const defaultTimeoutMs = 100;
const defaultIntervalMs = 5;

export class WaitFor {
    constructor(
        private readonly maxWaitMs: number,
        private readonly delayIntervalMs: number,
        private readonly throwableTypesToExpect: (new (...args: any[]) => Error)[] = [Error],
    ) {}

    async wait(block: () => void | Promise<void>): Promise<void> {
        const start = performance.now();

        while (performance.now() - start <= this.maxWaitMs) {
            try {
                await block();
                return;
            } catch (e) {
                const error = e as Error;
                if (!this.throwableTypesToExpect.some((type) => error instanceof type)) {
                    throw error;
                }
            }
            await flushAllPromises();
            await new Promise((resolve) => setTimeout(resolve, this.delayIntervalMs));
        }

        // The deadline is wall-clock (performance.now). On a loaded runner a scheduling or
        // GC stall can consume the whole budget *after* the awaited condition already became
        // true, so the loop would otherwise throw a stale error for an operation that has in
        // fact completed. Evaluate the condition one final time before giving up: if it now
        // passes we return, and if it genuinely still fails this rethrows the current error.
        await block();
    }

    static async waitFor(
        code: () => void | Promise<void>,
        timeoutMs: number = defaultTimeoutMs,
        intervalMs: number = defaultIntervalMs,
    ): Promise<void> {
        await new WaitFor(timeoutMs, intervalMs).wait(code);
    }
}

export async function waitFor(
    code: () => void | Promise<void>,
    timeoutMs: number = defaultTimeoutMs,
    intervalMs: number = defaultIntervalMs,
): Promise<void> {
    await WaitFor.waitFor(code, timeoutMs, intervalMs);
}
