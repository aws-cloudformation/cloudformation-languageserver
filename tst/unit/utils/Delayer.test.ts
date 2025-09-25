import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { Delayer } from '../../../src/utils/Delayer';

// Helper function to create a safe mock executor that handles its own rejections
function createSafeMockExecutor<T>(returnValue: T): MockedFunction<() => Promise<T>> {
    const mockFn = vi.fn(() => Promise.resolve(returnValue));

    // Override the mock to return a promise that handles its own rejections
    mockFn.mockImplementation(() => {
        const promise = Promise.resolve(returnValue);
        // Add a catch handler to prevent unhandled rejections
        promise.catch(() => {
            // Silently handle any rejections
        });
        return promise;
    });

    return mockFn;
}

// Helper function to create a delayer request that handles its own cancellation
function createSafeDelayRequest<T>(delayer: Delayer<T>, key: string, executor: () => Promise<T>): Promise<T> {
    const promise = delayer.delay(key, executor);
    // Immediately add a catch handler to prevent unhandled rejections
    promise.catch(() => {
        // Expected cancellation, ignore
    });
    return promise;
}

describe('Delayer', () => {
    let delayer: Delayer<string>;

    beforeEach(() => {
        vi.useFakeTimers();
        delayer = new Delayer<string>(100); // 100ms delay for testing
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('constructor', () => {
        it('should create delayer with default delay', () => {
            const defaultDelayer = new Delayer<string>();
            expect(defaultDelayer.getDelayMs()).toBe(500);
        });

        it('should create delayer with custom delay', () => {
            const customDelayer = new Delayer<string>(1000);
            expect(customDelayer.getDelayMs()).toBe(1000);
        });
    });

    describe('delay method - basic functionality', () => {
        it('should execute request after delay', async () => {
            const mockExecutor = vi.fn<() => Promise<string>>().mockResolvedValue('result');

            const promise = delayer.delay('key1', mockExecutor);

            expect(mockExecutor).not.toHaveBeenCalled();
            expect(delayer.getPendingCount()).toBe(1);
            expect(delayer.hasPending('key1')).toBe(true);

            vi.advanceTimersByTime(100);

            const result = await promise;
            expect(result).toBe('result');
            expect(mockExecutor).toHaveBeenCalledTimes(1);
            expect(delayer.getPendingCount()).toBe(0);
            expect(delayer.hasPending('key1')).toBe(false);
        });

        it('should handle multiple keys independently', async () => {
            const mockExecutor1 = vi.fn<() => Promise<string>>().mockResolvedValue('result1');
            const mockExecutor2 = vi.fn<() => Promise<string>>().mockResolvedValue('result2');

            const promise1 = delayer.delay('key1', mockExecutor1);
            const promise2 = delayer.delay('key2', mockExecutor2);

            expect(delayer.getPendingCount()).toBe(2);
            expect(delayer.getPendingKeys()).toEqual(expect.arrayContaining(['key1', 'key2']));
            expect(delayer.hasPending('key1')).toBe(true);
            expect(delayer.hasPending('key2')).toBe(true);

            vi.advanceTimersByTime(100);

            const [result1, result2] = await Promise.all([promise1, promise2]);
            expect(result1).toBe('result1');
            expect(result2).toBe('result2');
            expect(mockExecutor1).toHaveBeenCalledTimes(1);
            expect(mockExecutor2).toHaveBeenCalledTimes(1);
            expect(delayer.getPendingCount()).toBe(0);
        });

        it('should handle executor errors', async () => {
            const error = new Error('Execution failed');
            const mockExecutor = vi.fn<() => Promise<string>>().mockRejectedValue(error);

            const promise = delayer.delay('key1', mockExecutor);
            vi.advanceTimersByTime(100);

            await expect(promise).rejects.toThrow('Execution failed');
            expect(mockExecutor).toHaveBeenCalledTimes(1);
            expect(delayer.getPendingCount()).toBe(0);
        });

        it('should handle non-Error rejections', async () => {
            const mockExecutor = vi.fn<() => Promise<string>>().mockRejectedValue('string error');

            const promise = delayer.delay('key1', mockExecutor);
            vi.advanceTimersByTime(100);

            await expect(promise).rejects.toThrow('string error');
            expect(delayer.getPendingCount()).toBe(0);
        });

        it('should handle undefined rejections', async () => {
            const mockExecutor = vi.fn<() => Promise<string>>().mockRejectedValue(undefined);

            const promise = delayer.delay('key1', mockExecutor);
            vi.advanceTimersByTime(100);

            await expect(promise).rejects.toThrow('undefined');
            expect(delayer.getPendingCount()).toBe(0);
        });
    });

    describe('utility methods', () => {
        it('should track pending requests correctly', () => {
            expect(delayer.getPendingCount()).toBe(0);
            expect(delayer.getPendingKeys()).toEqual([]);
            expect(delayer.hasPending('key1')).toBe(false);

            void delayer.delay('key1', () => Promise.resolve('result1'));
            void delayer.delay('key2', () => Promise.resolve('result2'));

            expect(delayer.getPendingCount()).toBe(2);
            expect(delayer.getPendingKeys()).toEqual(expect.arrayContaining(['key1', 'key2']));
            expect(delayer.hasPending('key1')).toBe(true);
            expect(delayer.hasPending('key2')).toBe(true);
            expect(delayer.hasPending('key3')).toBe(false);
        });

        it('should return correct delay time', () => {
            expect(delayer.getDelayMs()).toBe(100);

            const customDelayer = new Delayer<string>(250);
            expect(customDelayer.getDelayMs()).toBe(250);
        });

        it('should handle getPendingKeys when empty', () => {
            expect(delayer.getPendingKeys()).toEqual([]);
        });

        it('should handle hasPending for non-existent keys', () => {
            expect(delayer.hasPending('non-existent')).toBe(false);
        });
    });

    describe('cancellation - state management only', () => {
        it('should remove pending requests when cancelled', () => {
            const mockExecutor1 = createSafeMockExecutor('result1');
            const mockExecutor2 = createSafeMockExecutor('result2');

            void createSafeDelayRequest(delayer, 'key1', mockExecutor1);
            void createSafeDelayRequest(delayer, 'key2', mockExecutor2);

            expect(delayer.getPendingCount()).toBe(2);
            expect(delayer.hasPending('key1')).toBe(true);

            delayer.cancel('key1');

            expect(delayer.getPendingCount()).toBe(1);
            expect(delayer.hasPending('key1')).toBe(false);
            expect(delayer.hasPending('key2')).toBe(true);
        });

        it('should remove all pending requests when cancelAll is called', () => {
            const mockExecutor1 = createSafeMockExecutor('result1');
            const mockExecutor2 = createSafeMockExecutor('result2');
            const mockExecutor3 = createSafeMockExecutor('result3');

            void createSafeDelayRequest(delayer, 'key1', mockExecutor1);
            void createSafeDelayRequest(delayer, 'key2', mockExecutor2);
            void createSafeDelayRequest(delayer, 'key3', mockExecutor3);

            expect(delayer.getPendingCount()).toBe(3);

            delayer.cancelAll();

            expect(delayer.getPendingCount()).toBe(0);
            expect(delayer.getPendingKeys()).toEqual([]);
            expect(delayer.hasPending('key1')).toBe(false);
            expect(delayer.hasPending('key2')).toBe(false);
            expect(delayer.hasPending('key3')).toBe(false);
        });

        it('should handle cancelling non-existent key gracefully', () => {
            expect(delayer.getPendingCount()).toBe(0);

            // Should not throw
            expect(() => delayer.cancel('non-existent')).not.toThrow();

            expect(delayer.getPendingCount()).toBe(0);
        });

        it('should handle cancelAll when no requests are pending', () => {
            expect(delayer.getPendingCount()).toBe(0);

            // Should not throw
            expect(() => delayer.cancelAll()).not.toThrow();

            expect(delayer.getPendingCount()).toBe(0);
        });
    });

    describe('timer management', () => {
        it('should clear timers when requests are cancelled', () => {
            const mockExecutor = createSafeMockExecutor('result');

            void createSafeDelayRequest(delayer, 'key1', mockExecutor);
            expect(delayer.getPendingCount()).toBe(1);

            // Cancel should clear both request and timer
            delayer.cancel('key1');
            expect(delayer.getPendingCount()).toBe(0);

            // Advancing time should not execute anything
            vi.advanceTimersByTime(200);
            expect(mockExecutor).not.toHaveBeenCalled();
        });

        it('should clear all timers when cancelAll is called', () => {
            const mockExecutor1 = createSafeMockExecutor('result1');
            const mockExecutor2 = createSafeMockExecutor('result2');

            void createSafeDelayRequest(delayer, 'key1', mockExecutor1);
            void createSafeDelayRequest(delayer, 'key2', mockExecutor2);
            expect(delayer.getPendingCount()).toBe(2);

            // CancelAll should clear all requests and timers
            delayer.cancelAll();
            expect(delayer.getPendingCount()).toBe(0);

            // Advancing time should not execute anything
            vi.advanceTimersByTime(200);
            expect(mockExecutor1).not.toHaveBeenCalled();
            expect(mockExecutor2).not.toHaveBeenCalled();
        });
    });

    describe('debouncing behavior - functional tests', () => {
        it('should only execute the latest executor after multiple requests', async () => {
            const mockExecutor1 = createSafeMockExecutor('result1');
            const mockExecutor2 = createSafeMockExecutor('result2');
            const mockExecutor3 = createSafeMockExecutor('final-result');

            // Make multiple rapid requests using safe delay requests
            void createSafeDelayRequest(delayer, 'key1', mockExecutor1);
            void createSafeDelayRequest(delayer, 'key1', mockExecutor2);
            const finalPromise = createSafeDelayRequest(delayer, 'key1', mockExecutor3);

            // Only one request should be pending
            expect(delayer.getPendingCount()).toBe(1);

            // Advance time to trigger execution
            vi.advanceTimersByTime(100);

            // Only the last request should execute
            const result = await finalPromise;
            expect(result).toBe('final-result');
            expect(mockExecutor1).not.toHaveBeenCalled();
            expect(mockExecutor2).not.toHaveBeenCalled();
            expect(mockExecutor3).toHaveBeenCalledTimes(1);
        });

        it('should reset timer on new request', async () => {
            const mockExecutor1 = createSafeMockExecutor('result1');
            const mockExecutor2 = createSafeMockExecutor('result2');

            void createSafeDelayRequest(delayer, 'key1', mockExecutor1);

            // Advance time partially
            vi.advanceTimersByTime(50);

            // Make new request - should reset timer
            const promise2 = createSafeDelayRequest(delayer, 'key1', mockExecutor2);

            // Advance remaining time from first request
            vi.advanceTimersByTime(50);

            // Neither executor should have run yet (timer was reset)
            expect(mockExecutor1).not.toHaveBeenCalled();
            expect(mockExecutor2).not.toHaveBeenCalled();

            // Advance full delay time for second request
            vi.advanceTimersByTime(50);

            // Second executor should run
            const result = await promise2;
            expect(result).toBe('result2');
            expect(mockExecutor1).not.toHaveBeenCalled();
            expect(mockExecutor2).toHaveBeenCalledTimes(1);
        });
    });

    describe('concurrent execution prevention', () => {
        it('should prevent concurrent executions for the same key', async () => {
            vi.useRealTimers(); // Use real timers for this test

            let execution1Started = false;
            let execution1Completed = false;
            let execution2Started = false;
            let execution2Completed = false;

            const mockExecutor1 = vi.fn<() => Promise<string>>().mockImplementation(async () => {
                execution1Started = true;
                // Simulate a long-running operation (longer than the delay)
                await new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), 150);
                });
                execution1Completed = true;
                return 'result1';
            });

            const mockExecutor2 = vi.fn<() => Promise<string>>().mockImplementation(async () => {
                execution2Started = true;
                await new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), 50);
                });
                execution2Completed = true;
                return 'result2';
            });

            const delayer = new Delayer<string>(100); // 100ms delay

            // Start first request
            const promise1 = delayer.delay('key1', mockExecutor1);

            // Wait for delay to pass and execution to start
            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 120);
            });
            expect(execution1Started).toBe(true);
            expect(execution1Completed).toBe(false);
            expect(delayer.getRunningCount()).toBe(1);

            // Start second request while first is still running
            const promise2 = delayer.delay('key1', mockExecutor2);

            // Second request should not start immediately
            expect(execution2Started).toBe(false);
            expect(delayer.getRunningCount()).toBe(1); // Still only 1 running

            // Wait for first request to complete
            const result1 = await promise1;
            expect(result1).toBe('result1');
            expect(execution1Completed).toBe(true);

            // Now second request should execute
            const result2 = await promise2;
            expect(result2).toBe('result2');
            expect(execution2Completed).toBe(true);

            // Verify execution order: executor1 completed before executor2 started
            expect(mockExecutor1).toHaveBeenCalledTimes(1);
            expect(mockExecutor2).toHaveBeenCalledTimes(1);
            expect(delayer.getRunningCount()).toBe(0);
            expect(delayer.getPendingCount()).toBe(0);

            vi.useFakeTimers(); // Restore fake timers
        });

        it('should track running requests correctly', async () => {
            vi.useRealTimers();

            const mockExecutor = vi.fn<() => Promise<string>>().mockImplementation(async () => {
                await new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), 100);
                });
                return 'result';
            });

            const delayer = new Delayer<string>(50);

            expect(delayer.getRunningCount()).toBe(0);
            expect(delayer.hasRunning('key1')).toBe(false);

            const promise = delayer.delay('key1', mockExecutor);

            // Wait for delay to pass and execution to start
            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 60);
            });

            expect(delayer.getRunningCount()).toBe(1);
            expect(delayer.hasRunning('key1')).toBe(true);
            expect(delayer.getRunningKeys()).toEqual(['key1']);

            await promise;

            // Give a small delay for cleanup to complete
            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 10);
            });

            expect(delayer.getRunningCount()).toBe(0);
            expect(delayer.hasRunning('key1')).toBe(false);
            expect(delayer.getRunningKeys()).toEqual([]);

            vi.useFakeTimers();
        });
    });

    describe('edge cases', () => {
        it('should handle requests with different delay times', async () => {
            const shortDelayer = new Delayer<string>(50);
            const longDelayer = new Delayer<string>(150);

            const mockExecutor1 = vi.fn<() => Promise<string>>().mockResolvedValue('short');
            const mockExecutor2 = vi.fn<() => Promise<string>>().mockResolvedValue('long');

            const shortPromise = shortDelayer.delay('key1', mockExecutor1);
            const longPromise = longDelayer.delay('key1', mockExecutor2);

            // Advance time partially
            vi.advanceTimersByTime(75);

            // Short should execute
            const shortResult = await shortPromise;
            expect(shortResult).toBe('short');
            expect(mockExecutor1).toHaveBeenCalledTimes(1);
            expect(mockExecutor2).not.toHaveBeenCalled();

            // Advance more time
            vi.advanceTimersByTime(100);

            // Long should execute
            const longResult = await longPromise;
            expect(longResult).toBe('long');
            expect(mockExecutor2).toHaveBeenCalledTimes(1);
        });

        it('should handle edge case with no timer', () => {
            const mockExecutor = createSafeMockExecutor('result');
            void createSafeDelayRequest(delayer, 'key1', mockExecutor);

            // Manually clear timer to test edge case
            (delayer as any).timers.clear();

            // Should not throw
            expect(() => delayer.cancel('key1')).not.toThrow();
        });

        it('should handle edge case with no pending request', () => {
            // Manually add a timer without a request to test edge case
            const timer = setTimeout(() => {}, 100);
            (delayer as any).timers.set('key1', timer);

            // Should not throw
            expect(() => delayer.cancel('key1')).not.toThrow();

            clearTimeout(timer);
        });
    });
});
