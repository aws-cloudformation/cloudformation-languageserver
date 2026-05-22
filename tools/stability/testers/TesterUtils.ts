import { recordOperation } from '../Monitoring';
import { WaitFor } from '../../../tst/utils/Utils';
import { OperationType, TESTER_CONFIG } from './TesterTypes';

const RETRY_INTERVAL_MS = 250;

let documentVersion = 1;

export function nextDocumentVersion(): number {
    return ++documentVersion;
}

export function resetDocumentVersion(): void {
    documentVersion = 1;
}

export async function retryOperationWithPerformance<T>(
    operation: () => Promise<T>,
    validate: (result: T) => void,
    operationType: OperationType,
): Promise<void> {
    const config = TESTER_CONFIG[operationType];
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
