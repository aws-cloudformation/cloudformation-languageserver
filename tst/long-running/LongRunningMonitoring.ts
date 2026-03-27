/* eslint-disable no-console */
const AVG_DURATION_LIMIT_MS = 200;

export type LspTestMetrics = {
    operationsAttempted: number;
    operationsFailed: number;
    averageDuration: number | null;
    minDuration: number | null;
    maxDuration: number | null;
    lastDuration: number | null;
};

const metrics: LspTestMetrics = {
    operationsAttempted: 0,
    operationsFailed: 0,
    averageDuration: null,
    minDuration: null,
    maxDuration: null,
    lastDuration: null,
};

export function recordOperation(duration: number, success: boolean): void {
    metrics.operationsAttempted++;

    if (success) {
        const successfulOps = metrics.operationsAttempted - metrics.operationsFailed;
        metrics.averageDuration =
            metrics.averageDuration === null
                ? duration
                : (metrics.averageDuration * (successfulOps - 1) + duration) / successfulOps;
        metrics.minDuration = metrics.minDuration === null ? duration : Math.min(metrics.minDuration, duration);
        metrics.maxDuration = metrics.maxDuration === null ? duration : Math.max(metrics.maxDuration, duration);
        metrics.lastDuration = duration;
    } else {
        metrics.operationsFailed++;
    }
}

export function checkPerformanceDegradation(): void {
    if (metrics.averageDuration !== null && metrics.averageDuration > AVG_DURATION_LIMIT_MS) {
        throw new Error(
            `Average duration ${metrics.averageDuration.toFixed(1)}ms exceeds limit ${AVG_DURATION_LIMIT_MS}ms`,
        );
    }
}

export function getMetrics(): LspTestMetrics {
    return { ...metrics };
}

export function logProgress() {
    const avgResponseTime = metrics.averageDuration ?? 0;

    console.log('Progress Report');
    console.log(`   Total Operations: ${metrics.operationsAttempted}`);
    console.log(`   Successful: ${metrics.operationsAttempted - metrics.operationsFailed}`);
    console.log(`   Failed: ${metrics.operationsFailed}`);
    console.log(
        `   Success Rate: ${metrics.operationsAttempted > 0 ? (((metrics.operationsAttempted - metrics.operationsFailed) / metrics.operationsAttempted) * 100).toFixed(1) : 0}%`,
    );
    console.log(`   Avg Duration: ${avgResponseTime.toFixed(1)}ms`);
}

export function generateFinalReport(startTime: number): void {
    console.log('Final Test Report');
    console.log('='.repeat(50));

    const runtime = Date.now() - startTime;
    const avgResponseTime = metrics.averageDuration ?? 0;
    const maxResponseTime = metrics.maxDuration ?? 0;
    const minResponseTime = metrics.minDuration ?? 0;
    const lastResponseTime = metrics.lastDuration ?? 0;

    console.log(`Runtime: ${Math.round(runtime / 1000 / 60)} minutes`);
    console.log(`Total Operations: ${metrics.operationsAttempted}`);
    console.log(`Successful: ${metrics.operationsAttempted - metrics.operationsFailed}`);
    console.log(`Failed: ${metrics.operationsFailed}`);
    console.log(
        `Success Rate: ${metrics.operationsAttempted > 0 ? (((metrics.operationsAttempted - metrics.operationsFailed) / metrics.operationsAttempted) * 100).toFixed(2) : 0}%`,
    );
    console.log(`Average Duration: ${avgResponseTime > 0 ? avgResponseTime.toFixed(2) + 'ms' : 'N/A'}`);
    console.log(`Max Duration: ${maxResponseTime > 0 ? maxResponseTime.toFixed(2) + 'ms' : 'N/A'}`);
    console.log(
        `Min Duration: ${minResponseTime !== null && minResponseTime >= 0 ? minResponseTime.toFixed(2) + 'ms' : 'N/A'}`,
    );
    console.log(`Final Duration: ${lastResponseTime > 0 ? lastResponseTime.toFixed(2) + 'ms' : 'N/A'}`);

    console.log('='.repeat(50));
}
