import { WaitFor } from '../../utils/Utils';
import { recordOperation } from '../LongRunningMonitoring';
import { TesterConfig } from '../LongRunningTypes';

export interface Tester {
    testAllScenarios(uri: string): Promise<void>;
}

export async function executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: TesterConfig,
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
                if (responseTime > config.responseTimeout) {
                    throw new Error(
                        `${operationName} response time ${responseTime}ms exceeds ${config.responseTimeout}ms`,
                    );
                }
            },
            config.maxRetries * 1000,
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
