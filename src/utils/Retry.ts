import { Logger } from 'pino';

export type RetryOptions = {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    jitterFactor?: number;
    operationName?: string;
    totalTimeoutMs?: number;
};

function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

function checkTotalTimeout(startTime: number, totalTimeoutMs: number | undefined, operationName: string): void {
    if (totalTimeoutMs !== undefined && Date.now() - startTime > totalTimeoutMs) {
        throw new Error(`${operationName} timed out after ${totalTimeoutMs}ms`);
    }
}

function calculateNextDelay(
    currentDelay: number,
    jitterFactor: number,
    backoffMultiplier: number,
    maxDelayMs: number,
): number {
    const nextDelay = currentDelay * backoffMultiplier;
    const jitter = jitterFactor > 0 ? Math.random() * jitterFactor * nextDelay : 0;
    return Math.min(nextDelay + jitter, maxDelayMs);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
    log: Logger,
): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const initialDelayMs = options.initialDelayMs ?? 1000;
    const maxDelayMs = options.maxDelayMs ?? 30_000;
    const backoffMultiplier = options.backoffMultiplier ?? 2;
    const jitterFactor = options.jitterFactor ?? 0;
    const operationName = options.operationName ?? 'Operation';
    const totalTimeoutMs = options.totalTimeoutMs;

    let lastError: Error = new Error('No attempts made');
    let currentDelay = initialDelayMs;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        checkTotalTimeout(startTime, totalTimeoutMs, operationName);

        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxRetries) {
                throw new Error(
                    `${operationName} failed after ${maxRetries + 1} attempts. Last error: ${lastError.message}`,
                );
            }

            log.warn(
                `${operationName} attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${currentDelay}ms...`,
            );

            await sleep(currentDelay);
            currentDelay = calculateNextDelay(currentDelay, jitterFactor, backoffMultiplier, maxDelayMs);
        }
    }

    throw lastError;
}
