/* eslint-disable no-console */
/* eslint-disable vitest/expect-expect */
import { test } from 'vitest';
import { DocumentHelper } from '../utils/DocumentHelper';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';
import { parseConfig, parseDuration } from './LongRunningConfig';
import { checkMemoryUsage, getMetrics, logProgress } from './LongRunningMonitoring';
import { TEMPLATE_CONFIGS, TemplateConfig } from './LongRunningTypes';
import { CompletionTester } from './testers/CompletionTester';
import { HoverTester } from './testers/HoverTester';

const config = parseConfig();
const DURATION_MS = parseDuration(config.duration);
const PROGRESS_INTERVAL = 1 * 60 * 1000; // 1 minute

let lastProgressLog = Date.now();

class LongRunningTest {
    public testExtension!: TestExtension;
    private templates: TemplateConfig[] = [];
    private readonly startTime: number;
    private readonly endTime: number;
    private readonly openTemplates: Array<{ template: TemplateConfig; uri: string }> = [];

    private hoverTester!: HoverTester;
    private completionTester!: CompletionTester;

    constructor() {
        this.startTime = Date.now();
        this.endTime = this.startTime + DURATION_MS;
    }

    async initialize(): Promise<void> {
        console.log('Starting CloudFormation Language Server Long-Running Tests');
        console.log(`Duration: ${config.duration} (${DURATION_MS}ms)`);
        console.log(`Max retries: ${config.maxRetries}`);
        console.log(`Response timeout: ${config.responseTimeout}ms`);

        this.testExtension = new TestExtension();

        await this.testExtension.ready();

        const testConfig = { maxRetries: config.maxRetries, responseTimeout: config.responseTimeout };
        this.hoverTester = new HoverTester(this.testExtension, testConfig);
        this.completionTester = new CompletionTester(this.testExtension, testConfig);

        this.templates = TEMPLATE_CONFIGS;
        console.log(`Loaded ${this.templates.length} templates`);

        console.log('Initialization complete');
    }

    async runTests(): Promise<void> {
        console.log('Starting test execution phase');

        let cycleCount = 0;

        while (Date.now() < this.endTime) {
            cycleCount++;

            try {
                await this.executeTestCycle();

                checkMemoryUsage();

                if (Date.now() - lastProgressLog > PROGRESS_INTERVAL) {
                    logProgress();
                    lastProgressLog = Date.now();
                }

                // Brief pause between cycles
                await WaitFor.waitFor(async () => {}, 5000, 1000);
            } catch (error) {
                console.error('Test cycle failed:', error);
                throw error; // Fail fast
            }
        }

        console.log(`Test execution completed after ${cycleCount} cycles`);

        // Close all files at the end
        for (const { uri } of this.openTemplates) {
            await this.testExtension.closeDocument({ textDocument: { uri } });
        }
    }

    private async executeTestCycle(): Promise<void> {
        if (this.openTemplates.length === 0) {
            for (const template of this.templates) {
                const uri = template.name.endsWith('.json')
                    ? await this.testExtension.openJsonTemplate(template.content, template.name)
                    : await this.testExtension.openYamlTemplate(template.content, template.name);

                this.openTemplates.push({ template, uri });
            }
        }

        // Test LSP operations on all open templates
        for (const { uri } of this.openTemplates) {
            await this.validateLsp(uri);
        }
    }

    private async validateLsp(uri: string): Promise<void> {
        const originalContent = this.testExtension.components.documentManager.get(uri)?.contents() ?? '';

        await this.hoverTester.testAllScenarios(uri);
        await this.completionTester.testAllScenarios(uri);

        // Revert to original content
        const version = Date.now();
        await DocumentHelper.replaceDocumentContent(this.testExtension, uri, version, originalContent);
    }

    generateReport(): void {
        console.log('Final Test Report');
        console.log('='.repeat(50));

        const runtime = Date.now() - this.startTime;
        const metrics = getMetrics();
        const avgResponseTime = metrics.averageDuration ?? 0;
        const maxResponseTime = metrics.maxDuration ?? 0;
        const minResponseTime = metrics.minDuration ?? 0;
        const lastResponseTime = metrics.lastDuration ?? 0;
        const memory = process.memoryUsage();

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
        console.log(`Final Memory Usage: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
        console.log(`Max Memory Usage: ${metrics.maxMemoryMB}MB`);

        console.log('='.repeat(50));
    }
}

test('CloudFormation Language Server Long-Running Test', async () => {
    const longRunningTest = new LongRunningTest();

    try {
        await longRunningTest.initialize();
        await longRunningTest.runTests();
        longRunningTest.generateReport();

        console.log('Long-running tests completed successfully');
    } catch (error) {
        console.error('Long-running tests failed:', error);
        longRunningTest.generateReport();
        throw error; // Re-throw to fail the test
    } finally {
        // Clean up TestExtension
        if (longRunningTest.testExtension) {
            await longRunningTest.testExtension.close();
        }
    }
});
