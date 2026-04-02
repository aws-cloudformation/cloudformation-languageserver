import { recordOperation } from '../Monitoring';
import { WaitFor } from '../../../tst/utils/Utils';
import { OperationType, getTesterConfig } from './TesterTypes';

const RETRY_INTERVAL_MS = 250;

export async function retryOperationWithPerformance<T>(
    operation: () => Promise<T>,
    validate: (result: T) => void,
    operationType: OperationType,
): Promise<void> {
    const config = getTesterConfig(operationType);
    let responseTime: number = 0;

    await WaitFor.waitFor(
        async () => {
            const startTime = performance.now();
            const result = await operation();
            responseTime = performance.now() - startTime;
            validate(result);
        },
        config.retryTimeoutMs,
        RETRY_INTERVAL_MS,
    );

    recordOperation(responseTime, operationType);
}
