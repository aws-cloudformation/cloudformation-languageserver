import { OperationType, TESTER_CONFIG } from './testers/TesterTypes';

export type TestMetrics = {
    operations: number;
    averageDuration: number | null;
    minDuration: number | null;
    maxDuration: number | null;
    lastDuration: number | null;
};

const createEmptyMetrics = (): TestMetrics => ({
    operations: 0,
    averageDuration: null,
    minDuration: null,
    maxDuration: null,
    lastDuration: null,
});

const metrics: Record<OperationType, TestMetrics> = {} as Record<OperationType, TestMetrics>;
for (const operationType of Object.values(OperationType)) {
    metrics[operationType] = createEmptyMetrics();
}

export function recordOperation(duration: number, operationType: OperationType): void {
    const metric = metrics[operationType];
    metric.operations++;

    metric.averageDuration =
        metric.averageDuration === null
            ? duration
            : (metric.averageDuration * (metric.operations - 1) + duration) / metric.operations;
    metric.minDuration = metric.minDuration === null ? duration : Math.min(metric.minDuration, duration);
    metric.maxDuration = metric.maxDuration === null ? duration : Math.max(metric.maxDuration, duration);
    metric.lastDuration = duration;
}

let startTime: number;

export function initializeMonitoring(): void {
    startTime = Date.now();
}

export function logProgress(): void {
    const totalOps = Object.values(metrics).reduce((sum, m) => sum + m.operations, 0);
    const elapsed = Date.now() - startTime;
    const elapsedMinutes = Math.round(elapsed / 60_000);

    console.log('Progress Report');
    console.log(`   Runtime: ${elapsedMinutes} minutes`);
    console.log(`   Total Operations: ${totalOps}`);
    console.log(`   Operations: ${totalOps}`);

    // Per-operation breakdown
    for (const [operationType, metric] of Object.entries(metrics) as [OperationType, TestMetrics][]) {
        if (metric.operations > 0) {
            console.log(`   ${operationType}: ${metric.operations} operations`);
        }
    }
}

export function generateFinalReport(): void {
    const runtime = Date.now() - startTime;

    console.log('Final Test Report');
    console.log('='.repeat(50));
    console.log(`Runtime: ${Math.round(runtime / 1000 / 60)} minutes`);

    // Per-operation breakdown
    for (const [operationType, metric] of Object.entries(metrics) as [OperationType, TestMetrics][]) {
        if (metric.operations > 0) {
            console.log(`${operationType}:`);
            console.log(`  Operations: ${metric.operations}`);
            console.log(`  Avg Duration: ${metric.averageDuration?.toFixed(2) ?? 'N/A'}ms`);
            console.log(`  Max Duration: ${metric.maxDuration?.toFixed(2) ?? 'N/A'}ms`);
            console.log(`  Min Duration: ${metric.minDuration?.toFixed(2) ?? 'N/A'}ms`);
        }
    }
    console.log('='.repeat(50));
}

export function checkPerformanceDegradation(): void {
    for (const [operationType, metric] of Object.entries(metrics) as [OperationType, TestMetrics][]) {
        const config = TESTER_CONFIG[operationType];

        if (metric.averageDuration !== null && metric.averageDuration > config.avgDurationLimitMs) {
            throw new Error(
                `${operationType} average duration ${metric.averageDuration.toFixed(1)}ms exceeds limit ${config.avgDurationLimitMs}ms`,
            );
        }

        if (metric.maxDuration !== null && metric.maxDuration > config.maxDurationLimitMs) {
            throw new Error(
                `${operationType} max duration ${metric.maxDuration.toFixed(1)}ms exceeds limit ${config.maxDurationLimitMs}ms`,
            );
        }
    }

    // Basic memory check
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    if (heapUsedMB > 2000) {
        // 2GB threshold
        console.warn(`High memory usage detected: ${heapUsedMB}MB heap used`);
    }
}
