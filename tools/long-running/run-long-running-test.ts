import { TestOrchestrator } from './TestOrchestrator';
import { generateFinalReport } from './Monitoring';

async function main(): Promise<void> {
    const orchestrator = new TestOrchestrator();

    try {
        await orchestrator.initialize();
        await orchestrator.runTests();
        generateFinalReport(Date.now());
    } catch (error) {
        generateFinalReport(Date.now());
        console.error('Standalone test failed:', error);
        throw error;
    } finally {
        await orchestrator.cleanup();
    }
}

void main();
