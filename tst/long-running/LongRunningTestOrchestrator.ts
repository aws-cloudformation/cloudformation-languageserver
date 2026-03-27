/* eslint-disable no-console */
import { AwsRegion } from '../../src/utils/Region';
import { DocumentHelper } from '../utils/DocumentHelper';
import { WaitFor } from '../utils/Utils';
import { parseConfig, parseDuration } from './LongRunningConfig';
import { checkPerformanceDegradation, logProgress } from './LongRunningMonitoring';
import { LongRunningTestExtension } from './LongRunningTestExtension';
import { TEMPLATE_CONFIGS, TemplateConfig } from './LongRunningTypes';
import { CompletionTester } from './testers/CompletionTester';
import { HoverTester } from './testers/HoverTester';

const config = parseConfig();
const DURATION_MS = parseDuration(config.duration);
const PROGRESS_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Test all supported regions
const TEST_REGIONS = Object.values(AwsRegion);

let lastProgressLog = Date.now();

export class LongRunningTestOrchestrator {
    public testExtension!: LongRunningTestExtension;
    public startTime!: number;
    private templates: TemplateConfig[] = [];
    private readonly openTemplates: Array<{ template: TemplateConfig; uri: string }> = [];
    private endTime!: number;
    private hoverTester!: HoverTester;
    private completionTester!: CompletionTester;

    constructor() {
        // Timer will be started after preloading
    }

    async initialize(): Promise<void> {
        console.log('Starting CloudFormation Language Server Long-Running Tests');
        console.log(`Duration: ${config.duration} (${DURATION_MS}ms)`);
        console.log(`Max retries: ${config.maxRetries}`);
        console.log(`Response timeout: ${config.responseTimeout}ms`);

        this.testExtension = new LongRunningTestExtension();

        await this.testExtension.ready();

        const testConfig = { maxRetries: config.maxRetries, responseTimeout: config.responseTimeout };
        this.hoverTester = new HoverTester(this.testExtension, testConfig);
        this.completionTester = new CompletionTester(this.testExtension, testConfig);

        this.templates = TEMPLATE_CONFIGS;
        console.log(`Loaded ${this.templates.length} templates`);

        await this.testExtension.loadAllRegionSchemas(TEST_REGIONS);

        console.log('Initialization complete');
    }

    async runTests(): Promise<void> {
        console.log('Starting test execution phase');

        // Start test timer
        this.startTime = Date.now();
        this.endTime = this.startTime + DURATION_MS;

        let cycleCount = 0;

        while (Date.now() < this.endTime) {
            cycleCount++;

            try {
                await this.executeTestCycle();

                checkPerformanceDegradation();

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

    async cleanup(): Promise<void> {
        if (this.testExtension) {
            await this.testExtension.close();
        }
    }

    private async executeTestCycle(): Promise<void> {
        // Open templates once and keep them open
        if (this.openTemplates.length === 0) {
            for (const template of this.templates) {
                const uri = template.name.endsWith('.json')
                    ? await this.testExtension.openJsonTemplate(template.content, template.name)
                    : await this.testExtension.openYamlTemplate(template.content, template.name);

                this.openTemplates.push({ template, uri });
            }
        }

        // Test LSP operations on all regions
        for (const region of TEST_REGIONS) {
            await this.testExtension.switchToRegion(region);

            // Test all open templates for this region
            for (const { uri } of this.openTemplates) {
                await this.validateLsp(uri);
            }
        }
    }

    private async validateLsp(uri: string): Promise<void> {
        const originalContent = this.testExtension.components.documentManager.get(uri)?.contents() ?? '';

        await this.hoverTester.testAllScenarios(uri);
        await this.completionTester.testAllScenarios(uri);

        // Revert template to original content
        const version = Date.now();
        await DocumentHelper.replaceDocumentContent(this.testExtension, uri, version, originalContent);
    }
}
