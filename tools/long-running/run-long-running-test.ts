import { StandaloneTestOrchestrator } from './StandaloneTestOrchestrator';
import { generateFinalReport } from './StandaloneMonitoring';

async function main(): Promise<void> {
    const orchestrator = new StandaloneTestOrchestrator();

    try {
        await orchestrator.initialize();
        await orchestrator.runTests();
        generateFinalReport(Date.now());
    } catch (error) {
        generateFinalReport(Date.now());
        console.error('Standalone test failed:', error);
        process.exit(1);
    } finally {
        await orchestrator.cleanup();
    }
}

main();
