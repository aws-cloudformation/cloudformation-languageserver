/* eslint-disable vitest/valid-expect */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithExponentialBackoff, RetryOptions } from '../../../src/utils/Retry';

describe('retryWithExponentialBackoff', () => {
    const mockLog = {
        warn: vi.fn(),
    } as any;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
        const mockFn = vi.fn().mockResolvedValue('success');
        const options: RetryOptions = { maxRetries: 3 };

        const result = await retryWithExponentialBackoff(mockFn, options, mockLog);

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
        const mockFn = vi
            .fn()
            .mockRejectedValueOnce(new Error('First failure'))
            .mockRejectedValueOnce(new Error('Second failure'))
            .mockResolvedValue('success');

        const options: RetryOptions = { maxRetries: 3, initialDelayMs: 100 };

        const promise = retryWithExponentialBackoff(mockFn, options, mockLog);

        // Let the first attempt fail and start the first delay
        await vi.runOnlyPendingTimersAsync();
        // Let the second attempt fail and start the second delay
        await vi.runOnlyPendingTimersAsync();
        // Let the third attempt succeed
        await vi.runOnlyPendingTimersAsync();

        const result = await promise;

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Persistent failure'));
        const options: RetryOptions = { maxRetries: 2, initialDelayMs: 100 };

        const promise = expect(retryWithExponentialBackoff(mockFn, options, mockLog)).rejects.toThrow(
            'Operation failed after 3 attempts',
        );

        await vi.advanceTimersByTimeAsync(300);
        await promise;

        expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should respect total timeout', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
        const options: RetryOptions = {
            maxRetries: 10,
            initialDelayMs: 1000,
            totalTimeoutMs: 2000,
            operationName: 'TestOperation',
        };

        const startTime = 1000;
        vi.spyOn(Date, 'now')
            .mockReturnValueOnce(startTime) // Initial call
            .mockReturnValueOnce(startTime + 2500); // Timeout check

        const promise = retryWithExponentialBackoff(mockFn, options, mockLog);

        await expect(promise).rejects.toThrow('TestOperation timed out after 2000ms');
    });

    it('should apply exponential backoff correctly', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
        const options: RetryOptions = {
            maxRetries: 3,
            initialDelayMs: 100,
            backoffMultiplier: 2,
            maxDelayMs: 1000,
        };

        const promise: Promise<void> = expect(retryWithExponentialBackoff(mockFn, options, mockLog)).rejects.toThrow();

        await vi.advanceTimersByTimeAsync(1000);
        await promise;

        expect(mockFn).toHaveBeenCalledTimes(4);
    });

    it('should handle non-Error exceptions', async () => {
        const mockFn = vi.fn().mockRejectedValue('String error');
        const options: RetryOptions = { maxRetries: 1, initialDelayMs: 100 };

        const promise: Promise<void> = expect(retryWithExponentialBackoff(mockFn, options, mockLog)).rejects.toThrow(
            'Operation failed after 2 attempts. Last error: String error',
        );

        await vi.advanceTimersByTimeAsync(200);
        await promise;
    });

    it('should use default options when not provided', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
        const options: RetryOptions = {};

        const promise: Promise<void> = expect(retryWithExponentialBackoff(mockFn, options, mockLog)).rejects.toThrow(
            'Operation failed after 4 attempts',
        );

        await vi.advanceTimersByTimeAsync(8000);
        await promise;

        expect(mockFn).toHaveBeenCalledTimes(4);
    });
});
