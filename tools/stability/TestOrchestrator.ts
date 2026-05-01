import { LspClient } from '../lspClient/LspClient';
import { config, parseDuration } from './Config';
import { initializeMonitoring, logProgress, checkPerformanceDegradation } from './Monitoring';
import { HoverTester } from './testers/HoverTester';
import { CompletionTester } from './testers/CompletionTester';
import { TEST_TEMPLATES } from './Templates';
import { nextDocumentVersion, resetDocumentVersion } from './testers/TesterUtils';
import { AwsRegion } from '../../src/utils/Region';
import { WaitFor } from '../../tst/utils/Utils';
import { existsSync } from 'fs';

export class TestOrchestrator {
    private client!: LspClient;
    private readonly config = config;
    private startTime!: number;
    private endTime!: number;
    private hoverTester!: HoverTester;
    private completionTester!: CompletionTester;

    private readonly templates = TEST_TEMPLATES;

    private readonly testRegions = Object.values(AwsRegion).filter(
        (region) => region !== AwsRegion.ME_SOUTH_1 && region !== AwsRegion.ME_CENTRAL_1,
    );

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

        // Wait for all system components to be ready
        console.log('Waiting for system components to be ready...');
        await WaitFor.waitFor(
            async () => {
                const status = await this.client.getSystemStatus();
                if (
                    !status.settingsReady.ready ||
                    !status.schemasReady.ready ||
                    !status.cfnLintReady.ready ||
                    !status.cfnGuardReady.ready
                ) {
                    throw new Error('System not ready');
                }
            },
            30_000,
            1000,
        );
        console.log('All system components ready');

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
                const uri = `file:///test/${template.fileName}`;

                try {
                    resetDocumentVersion();
                    await this.client.openDocument(uri, template.contents);

                    await this.validateLsp(uri);

                    // Revert document to original state after tests
                    await this.client.updateDocument(uri, nextDocumentVersion(), template.contents);
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
        console.log('Loading schemas for all regions...');

        for (const region of this.testRegions) {
            await this.switchToRegion(region);

            // Wait for schemas to be ready after region switch
            try {
                await WaitFor.waitFor(
                    async () => {
                        const status = await this.client.getSystemStatus();
                        if (!status.schemasReady.ready) {
                            throw new Error(`Schemas not ready for region ${region}`);
                        }
                    },
                    30_000,
                    200,
                );
            } catch (error) {
                console.warn(`Failed to load schemas for region ${region}, continuing anyway:`, error);
            }
        }

        console.log('Regional schema loading complete');
    }

    private async switchToRegion(region: AwsRegion): Promise<void> {
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

        // Wait for settings to be applied with correct region
        await WaitFor.waitFor(
            async () => {
                const status = await this.client.getSystemStatus();
                if (!status.settingsReady.ready) {
                    throw new Error('Settings not ready after region change');
                }
                if (status.currentSettings.profile.region !== region) {
                    throw new Error(
                        `Region not applied: expected ${region}, got ${status.currentSettings.profile.region}`,
                    );
                }
            },
            5000,
            100,
        ); // Reduced timeout and faster polling
    }

    private async validateLsp(uri: string): Promise<void> {
        await this.hoverTester.testAllScenarios(uri);
        await this.completionTester.testAllScenarios(uri);
    }
}
