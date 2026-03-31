import { OperationType, getTesterConfig } from './testers/TesterTypes';

export type StandaloneTestMetrics = {
    operationsAttempted: number;
    operationsFailed: number;
    averageDuration: number | null;
    minDuration: number | null;
    maxDuration: number | null;
    lastDuration: number | null;
};

const createEmptyMetrics = (): StandaloneTestMetrics => ({
    operationsAttempted: 0,
    operationsFailed: 0,
    averageDuration: null,
    minDuration: null,
    maxDuration: null,
    lastDuration: null,
});

const metrics: Record<OperationType, StandaloneTestMetrics> = Object.values(OperationType).reduce(
    (acc, operationType) => {
        acc[operationType] = createEmptyMetrics();
        return acc;
    },
    {} as Record<OperationType, StandaloneTestMetrics>
);

export function recordOperation(duration: number, success: boolean, operationType: OperationType): void {
    const metric = metrics[operationType];
    metric.operationsAttempted++;

    if (success) {
        const successfulOps = metric.operationsAttempted - metric.operationsFailed;
        metric.averageDuration =
            metric.averageDuration === null
                ? duration
                : (metric.averageDuration * (successfulOps - 1) + duration) / successfulOps;
        metric.minDuration = metric.minDuration === null ? duration : Math.min(metric.minDuration, duration);
        metric.maxDuration = metric.maxDuration === null ? duration : Math.max(metric.maxDuration, duration);
        metric.lastDuration = duration;
    } else {
        metric.operationsFailed++;
    }
}

let startTime: number;

export function initializeMonitoring(): void {
    startTime = Date.now();
}

export function logProgress(): void {
    const totalOps = Object.values(metrics).reduce((sum, m) => sum + m.operationsAttempted, 0);
    const totalFailed = Object.values(metrics).reduce((sum, m) => sum + m.operationsFailed, 0);
    const elapsed = Date.now() - startTime;
    const elapsedMinutes = Math.round(elapsed / 60_000);

    console.log('Progress Report');
    console.log(`   Runtime: ${elapsedMinutes} minutes`);
    console.log(`   Total Operations: ${totalOps}`);
    console.log(`   Successful: ${totalOps - totalFailed}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(
        `   Success Rate: ${totalOps > 0 ? (((totalOps - totalFailed) / totalOps) * 100).toFixed(1) : 0}%`,
    );
    
    // Per-operation breakdown
    for (const [operationType, metric] of Object.entries(metrics) as [OperationType, StandaloneTestMetrics][]) {
        if (metric.operationsAttempted > 0) {
            const successRate = ((metric.operationsAttempted - metric.operationsFailed) / metric.operationsAttempted * 100).toFixed(1);
            console.log(`   ${operationType}: ${metric.operationsAttempted} ops, ${metric.operationsFailed} failed (${successRate}% success)`);
        }
    }
}

export function generateFinalReport(testStartTime: number): void {
    const runtime = Date.now() - testStartTime;
    const totalOps = Object.values(metrics).reduce((sum, m) => sum + m.operationsAttempted, 0);
    const totalFailed = Object.values(metrics).reduce((sum, m) => sum + m.operationsFailed, 0);

    console.log('Final Test Report');
    console.log('='.repeat(50));
    console.log(`Runtime: ${Math.round(runtime / 1000 / 60)} minutes`);
    console.log(`Total Operations: ${totalOps}`);
    console.log(`Successful: ${totalOps - totalFailed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(
        `Success Rate: ${totalOps > 0 ? (((totalOps - totalFailed) / totalOps) * 100).toFixed(2) : 0}%`,
    );

    // Per-operation breakdown
    for (const [operationType, metric] of Object.entries(metrics) as [OperationType, StandaloneTestMetrics][]) {
        if (metric.operationsAttempted > 0) {
            console.log(`${operationType}:`);
            console.log(`  Operations: ${metric.operationsAttempted}`);
            console.log(`  Failed: ${metric.operationsFailed}`);
            console.log(`  Avg Duration: ${metric.averageDuration?.toFixed(2) ?? 'N/A'}ms`);
            console.log(`  Max Duration: ${metric.maxDuration?.toFixed(2) ?? 'N/A'}ms`);
            console.log(`  Min Duration: ${metric.minDuration?.toFixed(2) ?? 'N/A'}ms`);
        }
    }
    console.log('='.repeat(50));
}

export function checkPerformanceDegradation(): void {
    for (const [operationType, metric] of Object.entries(metrics) as [OperationType, StandaloneTestMetrics][]) {
        const config = getTesterConfig(operationType);
        
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

    if (heapUsedMB > 1000) {
        // 1GB threshold
        console.warn(`High memory usage detected: ${heapUsedMB}MB heap used`);
    }
}
