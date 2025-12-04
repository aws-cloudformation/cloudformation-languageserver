import { Logger } from 'pino';
import { extractErrorMessage } from './Errors';

export type RetryOptions = {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    jitterFactor?: number;
    operationName: string;
    totalTimeoutMs: number;
};

function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

function calculateDelay(
    attempt: number,
    initialDelayMs: number,
    jitterFactor: number,
    backoffMultiplier: number,
    maxDelayMs: number,
): number {
    // 1. Exponential Backoff: initial * 2^0, initial * 2^1, etc.
    const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

    // 2. Cap at Max Delay
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

    // 3. Add Jitter (randomized percentage of the current delay), capped at maxDelayMs
    const jitter = jitterFactor > 0 ? Math.random() * jitterFactor * cappedDelay : 0;

    return Math.min(cappedDelay + jitter, maxDelayMs);
}

export async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
    log: Logger,
    sleepFn: (ms: number) => Promise<void> = (ms: number) => {
        return sleep(ms);
    },
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelayMs = 1000,
        maxDelayMs = 5000,
        backoffMultiplier = 2,
        jitterFactor = 0.1,
        operationName,
        totalTimeoutMs,
    } = options;

    if (backoffMultiplier < 1) {
        throw new Error('Backoff multiplier must be greater than or equal to 1');
    }

    if (totalTimeoutMs <= 0) {
        throw new Error('Total timeout must be greater than 0');
    }

    let lastError: Error | undefined = undefined;
    const startTime = performance.now();

    // If maxRetries is 3, we run: 0 (initial), 1, 2, 3. Total 4 attempts.
    const attempts = maxRetries + 1;
    for (let attemptIdx = 0; attemptIdx < attempts; attemptIdx++) {
        if (attemptIdx > 0 && performance.now() - startTime >= totalTimeoutMs) {
            const message = `${operationName} timed out after ${performance.now() - startTime}ms, on attempt #${attemptIdx + 1}/${attempts}`;
            const errorMsg = lastError ? `${message}. Last error: ${lastError.message}` : message;
            throw new Error(errorMsg);
        }

        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(extractErrorMessage(error));
            if (attemptIdx === attempts - 1) {
                throw new Error(`${operationName} failed after ${attempts} attempts. Last error: ${lastError.message}`);
            }

            const delay = calculateDelay(attemptIdx, initialDelayMs, jitterFactor, backoffMultiplier, maxDelayMs);
            log.warn(
                `${operationName} attempt ${attemptIdx + 1} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`,
            );

            await sleepFn(delay);
        }
    }

    throw new Error('Something went wrong, this is not reachable');
}
