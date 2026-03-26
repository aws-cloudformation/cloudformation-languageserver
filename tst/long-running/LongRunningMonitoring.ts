/* eslint-disable no-console */
const MEMORY_LIMIT_MB = 2048;

export interface LspTestMetrics {
    operationsAttempted: number;
    operationsFailed: number;
    averageDuration: number | null;
    minDuration: number | null;
    maxDuration: number | null;
    lastDuration: number | null;
    currentMemoryMB: number;
    maxMemoryMB: number;
    minMemoryMB: number;
}

const metrics: LspTestMetrics = {
    operationsAttempted: 0,
    operationsFailed: 0,
    averageDuration: null,
    minDuration: null,
    maxDuration: null,
    lastDuration: null,
    currentMemoryMB: 0,
    maxMemoryMB: 0,
    minMemoryMB: Number.MAX_VALUE,
};

function getCurrentMemory(): number {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

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

    // Update memory metrics
    const currentMem = getCurrentMemory();
    metrics.currentMemoryMB = currentMem;
    metrics.maxMemoryMB = Math.max(metrics.maxMemoryMB, currentMem);
    metrics.minMemoryMB = Math.min(metrics.minMemoryMB, currentMem);
}

export function checkMemoryUsage(): void {
    const currentMem = getCurrentMemory();
    metrics.currentMemoryMB = currentMem;
    metrics.maxMemoryMB = Math.max(metrics.maxMemoryMB, currentMem);
    metrics.minMemoryMB = Math.min(metrics.minMemoryMB, currentMem);

    if (currentMem > MEMORY_LIMIT_MB) {
        throw new Error(`Memory usage ${currentMem}MB exceeds limit ${MEMORY_LIMIT_MB}MB`);
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
    console.log(`   Memory (Heap): ${metrics.currentMemoryMB}MB`);
    console.log(`   Max Memory: ${metrics.maxMemoryMB}MB`);
}
