import { Logger } from 'pino';
import * as sinon from 'sinon';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryOptions, retryWithExponentialBackoff } from '../../../src/utils/Retry';

describe('retryWithExponentialBackoff', () => {
    const options: RetryOptions = {
        maxRetries: 2,
        initialDelayMs: 2,
        maxDelayMs: 10,
        backoffMultiplier: 1.5,
        jitterFactor: 0.5,
        operationName: 'SomeOperation',
        totalTimeoutMs: 250,
    };

    const mockLog = {} as unknown as Logger;
    const sleepFn = sinon.stub().resolves();

    beforeEach(() => {
        sleepFn.resetHistory();
        mockLog.warn = vi.fn();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should succeed on first attempt', async () => {
        const mockFn = vi.fn().mockResolvedValue('success');

        const result = await retryWithExponentialBackoff(mockFn, options, mockLog, sleepFn);

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
        const mockFn = vi
            .fn()
            .mockRejectedValueOnce(new Error('First failure'))
            .mockRejectedValueOnce(new Error('Second failure'))
            .mockResolvedValue('success');

        const result = await retryWithExponentialBackoff(mockFn, options, mockLog, sleepFn);

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Persistent failure'));

        const promise = retryWithExponentialBackoff(mockFn, options, mockLog);

        await expect(promise).rejects.toThrow('Persistent failure');
        expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should respect total timeout', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
        const promise = retryWithExponentialBackoff(
            mockFn,
            {
                ...options,
                initialDelayMs: 10,
                totalTimeoutMs: 1,
            },
            mockLog,
        );

        try {
            await promise;
        } catch (err) {
            expect(err).instanceof(Error);
            const message = (err as Error).message;
            expect(message).contains('SomeOperation timed out after');
            expect(message).contains('on attempt #2/3. Last error: Failure');
            return;
        }

        throw new Error('Tests have failed');
    });

    it('should apply exponential backoff correctly', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));

        const promise = retryWithExponentialBackoff(
            mockFn,
            {
                ...options,

                maxRetries: 5,
                initialDelayMs: 10,
                maxDelayMs: 100,
                backoffMultiplier: 2.5,
                jitterFactor: 0.01,
                totalTimeoutMs: 10_000,
            },
            mockLog,
            sleepFn,
        );

        await expect(promise).rejects.toThrow('Failure');
        expect(mockFn).toHaveBeenCalledTimes(6);
        expect(sleepFn.callCount).toBe(5);

        expect(checkBounds(sleepFn.args[0][0], 10, 25)).toBe(true);
        expect(checkBounds(sleepFn.args[1][0], 25, 62.5)).toBe(true);
        expect(checkBounds(sleepFn.args[2][0], 62.5, 100)).toBe(true);
        expect(sleepFn.args[3][0]).toBe(100);
        expect(sleepFn.args[4][0]).toBe(100);
    });

    it('should throw error when backoffMultiplier is less than 1', async () => {
        const mockFn = vi.fn().mockResolvedValue('success');

        await expect(
            retryWithExponentialBackoff(mockFn, { ...options, backoffMultiplier: 0.5 }, mockLog, sleepFn),
        ).rejects.toThrow('Backoff multiplier must be greater than or equal to 1');
        expect(mockFn).not.toHaveBeenCalled();
    });

    it('should throw error when totalTimeoutMs is 0 or negative', async () => {
        const mockFn = vi.fn().mockResolvedValue('success');

        await expect(
            retryWithExponentialBackoff(mockFn, { ...options, totalTimeoutMs: 0 }, mockLog, sleepFn),
        ).rejects.toThrow('Total timeout must be greater than 0');

        await expect(
            retryWithExponentialBackoff(mockFn, { ...options, totalTimeoutMs: -100 }, mockLog, sleepFn),
        ).rejects.toThrow('Total timeout must be greater than 0');
        expect(mockFn).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
        const mockFn = vi
            .fn()
            .mockRejectedValueOnce('string error')
            .mockRejectedValueOnce({ message: 'object error' })
            .mockResolvedValue('success');

        const result = await retryWithExponentialBackoff(mockFn, options, mockLog, sleepFn);

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use default options when not provided', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));
        const minimalOptions: RetryOptions = {
            operationName: 'TestOp',
            totalTimeoutMs: 60_000,
        };

        const promise = retryWithExponentialBackoff(mockFn, minimalOptions, mockLog, sleepFn);

        await expect(promise).rejects.toThrow('TestOp failed after 4 attempts');
        expect(mockFn).toHaveBeenCalledTimes(4); // default maxRetries is 3, so 4 attempts
    });

    it('should not add jitter when jitterFactor is 0', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Failure'));

        const promise = retryWithExponentialBackoff(
            mockFn,
            {
                ...options,
                maxRetries: 2,
                initialDelayMs: 10,
                backoffMultiplier: 2,
                jitterFactor: 0,
                maxDelayMs: 1000,
                totalTimeoutMs: 10_000,
            },
            mockLog,
            sleepFn,
        );

        await expect(promise).rejects.toThrow('Failure');
        expect(sleepFn.args[0][0]).toBe(10); // 10 * 2^0 = 10
        expect(sleepFn.args[1][0]).toBe(20); // 10 * 2^1 = 20
    });

    it('should log warnings on retry attempts', async () => {
        const mockFn = vi.fn().mockRejectedValueOnce(new Error('Test error')).mockResolvedValue('success');

        await retryWithExponentialBackoff(mockFn, options, mockLog, sleepFn);

        expect(mockLog.warn).toHaveBeenCalledTimes(1);
        expect(mockLog.warn).toHaveBeenCalledWith(
            expect.stringContaining('SomeOperation attempt 1 failed: Test error'),
        );
    });
});

function checkBounds(value: number, lowerLimit: number, upperLimit: number) {
    if (value > lowerLimit && value < upperLimit) {
        return true;
    }

    throw new Error(`${value} is either lower than ${lowerLimit} or greater than ${upperLimit}`);
}
