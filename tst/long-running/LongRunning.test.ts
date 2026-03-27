/* eslint-disable vitest/expect-expect */
import { test } from 'vitest';
import { generateFinalReport } from './LongRunningMonitoring';
import { LongRunningTestOrchestrator } from './LongRunningTestOrchestrator';

test('CloudFormation Language Server Long-Running Test', async () => {
    const orchestrator = new LongRunningTestOrchestrator();

    try {
        await orchestrator.initialize();
        await orchestrator.runTests();
        generateFinalReport(orchestrator.startTime);
    } catch (error) {
        generateFinalReport(orchestrator.startTime);
        throw error; // Re-throw to fail the test
    } finally {
        await orchestrator.cleanup();
    }
});
