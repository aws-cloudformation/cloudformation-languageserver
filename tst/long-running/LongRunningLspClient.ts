import { WaitFor } from '../utils/Utils';
import { recordOperation } from './LongRunningMonitoring';

export async function executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number,
    responseTimeout: number,
): Promise<T> {
    let result: T;
    let responseTime: number;

    try {
        await WaitFor.waitFor(
            async () => {
                const startTime = performance.now();
                result = await operation();
                responseTime = performance.now() - startTime;

                if (result === undefined) {
                    throw new Error(`${operationName} should return a result (not undefined)`);
                }
                if (responseTime > responseTimeout) {
                    throw new Error(`${operationName} response time ${responseTime}ms exceeds ${responseTimeout}ms`);
                }
            },
            maxRetries * 1000,
            1000,
        );

        recordOperation(responseTime!, true);
        return result!;
    } catch (error) {
        recordOperation(0, false);
        throw new Error(
            `${operationName} failed after retries: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}
