import { LspClient } from '../lspClient/LspClient';
import { parseConfig, parseDuration } from './Config';
import { initializeMonitoring, logProgress, checkPerformanceDegradation } from './Monitoring';
import { HoverTester } from './testers/HoverTester';
import { CompletionTester } from './testers/CompletionTester';
import { TEMPLATE_CONFIGS } from './Templates';
import { AwsRegion } from '../../src/utils/Region';
import { WaitFor } from '../../tst/utils/Utils';
import { existsSync } from 'fs';

export class TestOrchestrator {
    private client!: LspClient;
    private readonly config = parseConfig();
    private startTime!: number;
    private endTime!: number;
    private hoverTester!: HoverTester;
    private completionTester!: CompletionTester;

    private readonly templates = TEMPLATE_CONFIGS;

    private readonly testRegions = Object.values(AwsRegion);

    async initialize(): Promise<void> {
        console.log('Starting CloudFormation Language Server Long-Running Tests');
        console.log(`Duration: ${this.config.duration}`);
        console.log(`Max retries: ${this.config.maxRetries}`);
        console.log(`Response timeout: ${this.config.responseTimeout}ms`);
        console.log(`Standalone path: ${this.config.path}`);

        // Verify standalone bundle exists
        if (!existsSync(this.config.path)) {
            throw new Error(`Standalone bundle not found at: ${this.config.path}`);
        }

        // Initialize LSP client
        this.client = new LspClient({
            serverPath: this.config.path,
            mode: 'ipc',
            clientId: 'stability-test',
            clientInfo: {
                name: 'CFN LSP Stability Test',
                version: '1.0.0',
            },
            extensionInfo: {
                name: 'aws.cloudformation.lsp.stability-test',
                version: '1.0.0',
            },
            telemetryEnabled: false,
            featureFlags: {},
        });

        await this.client.initialize();
        console.log('LSP client initialized');

        // Initialize testers
        this.hoverTester = new HoverTester(this.client);
        this.completionTester = new CompletionTester(this.client);

        console.log(`Loaded ${this.templates.length} templates`);

        await this.client.waitForExternalServiceInitialization();

        await this.loadAllRegionSchemas();

        initializeMonitoring();
        console.log('Initialization complete');
    }

    async runTests(): Promise<void> {
        console.log('Starting test execution phase');

        const durationMs = parseDuration(this.config.duration);
        this.startTime = Date.now();
        this.endTime = this.startTime + durationMs;

        let cycleCount = 0;
        let successCount = 0;
        let lastProgressLog = Date.now();
        const progressInterval = 5 * 60 * 1000; // 5 minutes

        while (Date.now() < this.endTime) {
            cycleCount++;

            try {
                await this.executeTestCycle();
                successCount++;

                checkPerformanceDegradation();

                if (Date.now() - lastProgressLog > progressInterval) {
                    logProgress();
                    lastProgressLog = Date.now();
                }
            } catch (error) {
                console.error(`Test cycle ${cycleCount} failed:`, error);

                // Fail fast - throw immediately on any error
                throw new Error(`Long-running test failed on cycle ${cycleCount}: ${error}`);
            }

            // Brief pause between cycles
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log(`Test execution completed after ${cycleCount} cycles`);
        console.log(`Results: ${successCount} success, 0 errors`);
    }

    async cleanup(): Promise<void> {
        if (this.client) {
            await this.client.shutdown();
        }
    }

    private async executeTestCycle(): Promise<void> {
        // Test all regions (switch region for each cycle)
        for (const region of this.testRegions) {
            await this.switchToRegion(region);

            // Test all templates for this region
            for (const template of this.templates) {
                const uri = `file:///test/${template.name}`;

                try {
                    await this.client.openDocument(uri, template.content);

                    await this.validateLsp(uri);

                    // Revert document to original state after tests
                    await this.client.updateDocument(uri, 6, template.content);
                } finally {
                    try {
                        await this.client.closeDocument(uri);
                    } catch (error) {
                        console.warn(`Failed to close document ${uri}:`, error);
                    }
                }
            }
        }
    }

    private async loadAllRegionSchemas(): Promise<void> {
        // Check what regions are already available from LspClient
        const alreadyAvailable = [...this.client.getAvailableRegions()];
        const unavailableRegions = this.testRegions.filter((region) => !this.client.getAvailableRegions().has(region));

        console.log(`Schema status: ${alreadyAvailable.length} available, ${unavailableRegions.length} unavailable`);
        console.log(`Available region schemas: ${alreadyAvailable.join(', ')}`);

        if (unavailableRegions.length > 0) {
            console.log(`Loading the following region schemas: ${unavailableRegions.join(', ')}`);
        }

        for (const region of unavailableRegions) {
            await this.switchToRegion(region);
            await this.waitForRegionSchemas(region);
        }

        console.log('Regional schema loading complete');
    }

    private async waitForRegionSchemas(region: string): Promise<void> {
        try {
            await WaitFor.waitFor(
                () => {
                    if (!this.client.getAvailableRegions().has(region)) {
                        throw new Error(`Region ${region} schemas not loaded yet`);
                    }
                },
                30_000, // 30 second timeout
                500, // Check every 500ms
            );
        } catch {
            console.warn(`Timeout waiting for ${region} schemas, proceeding anyway`);
        }
    }

    private async switchToRegion(region: string): Promise<void> {
        // Store the new configuration
        await this.client.changeConfiguration({
            settings: {
                'aws.cloudformation': {
                    profile: {
                        region,
                    },
                },
            },
        });
    }

    private async validateLsp(uri: string): Promise<void> {
        await this.hoverTester.testAllScenarios(uri);
        await this.completionTester.testAllScenarios(uri);
    }
}
