import { LspClient } from '../lsp-client/LspClient';
import { parseStandaloneConfig, parseDuration } from './StandaloneConfig';
import {
    initializeMonitoring,
    logProgress,
    checkPerformanceDegradation,
    generateFinalReport,
} from './StandaloneMonitoring';
import { StandaloneHoverTester } from './testers/StandaloneHoverTester';
import { StandaloneCompletionTester } from './testers/StandaloneCompletionTester';
import { STANDALONE_TEMPLATE_CONFIGS } from './StandaloneTemplates';
import { AwsRegion } from '../../src/utils/Region';
import { WaitFor } from '../../tst/utils/Utils';
import { existsSync } from 'fs';

export class StandaloneTestOrchestrator {
    private client!: LspClient;
    private readonly config = parseStandaloneConfig();
    private startTime!: number;
    private endTime!: number;
    private hoverTester!: StandaloneHoverTester;
    private completionTester!: StandaloneCompletionTester;

    private readonly templates = STANDALONE_TEMPLATE_CONFIGS;

    private readonly testRegions = Object.values(AwsRegion);

    async initialize(): Promise<void> {
        console.log('Starting CloudFormation Language Server Standalone Long-Running Tests');
        console.log(`Duration: ${this.config.duration}`);
        console.log(`Max retries: ${this.config.maxRetries}`);
        console.log(`Response timeout: ${this.config.responseTimeout}ms`);
        console.log(`Standalone path: ${this.config.standalonePath}`);

        // Verify standalone bundle exists
        if (!existsSync(this.config.standalonePath)) {
            throw new Error(`Standalone bundle not found at: ${this.config.standalonePath}`);
        }

        // Initialize LSP client
        this.client = new LspClient({
            serverPath: this.config.standalonePath,
            mode: 'ipc',
            clientId: 'standalone-long-running-test',
            telemetryEnabled: false,
        });

        await this.client.initialize();
        console.log('LSP client initialized');

        // Initialize testers
        this.hoverTester = new StandaloneHoverTester(this.client);
        this.completionTester = new StandaloneCompletionTester(this.client);

        console.log(`Loaded ${this.templates.length} templates`);

        // Wait for full system readiness before loading schemas
        await this.waitForSystemReadiness();

        await this.loadAllRegionSchemas();

        initializeMonitoring();
        console.log('Initialization complete');
    }

    private async waitForSystemReadiness(): Promise<void> {
        console.log('Waiting for full system readiness');
        
        await WaitFor.waitFor(
            async () => {
                const systemStatus = await this.client.getSystemStatus();
                
                if (!systemStatus.schemasReady.ready) {
                    throw new Error(`Schemas not ready: ${systemStatus.schemasReady.reason || 'Unknown reason'}`);
                }
                
                if (!systemStatus.cfnLintReady.ready) {
                    throw new Error(`CfnLint not ready: ${systemStatus.cfnLintReady.reason || 'Unknown reason'}`);
                }
                
                if (!systemStatus.cfnGuardReady.ready) {
                    throw new Error(`CfnGuard not ready: ${systemStatus.cfnGuardReady.reason || 'Unknown reason'}`);
                }
                
                console.log('All system components are ready');
            },
            60_000, // 60 second timeout for full system readiness
            1_000, // Check every 1 second
        );
    }

    async runTests(): Promise<void> {
        console.log('Starting test execution phase');

        const durationMs = parseDuration(this.config.duration);
        this.startTime = Date.now();
        this.endTime = this.startTime + durationMs;

        let cycleCount = 0;
        let successCount = 0;
        let errorCount = 0;
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
                errorCount++;
                console.error(`Test cycle ${cycleCount} failed:`, error);

                // Fail fast if too many errors
                if (errorCount > 10) {
                    throw new Error(`Too many errors (${errorCount}), failing fast`);
                }
            }

            // Brief pause between cycles
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log(`Test execution completed after ${cycleCount} cycles`);
        console.log(`Results: ${successCount} success, ${errorCount} errors`);
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
        // Get current system status to see what's already available
        const systemStatus = await this.client.getSystemStatus();
        const availableRegions = new Set(systemStatus.schemasReady.availableRegions);
        
        // Determine which regions need schema loading
        const unavailableRegions = this.testRegions.filter(region => !availableRegions.has(region));
        const alreadyAvailable = this.testRegions.filter(region => availableRegions.has(region));
        
        console.log(`Schema status: ${alreadyAvailable.length} available, ${unavailableRegions.length} unavailable`);
        console.log(`Available region schemas: ${alreadyAvailable.join(', ')}`);

        if (unavailableRegions.length > 0) {
            console.log(`Loading the following region schemas: ${unavailableRegions.join(', ')}`);
        }

        for (const region of unavailableRegions) {
            //console.log(`Loading schemas for unavailable region: ${region}`);
            await this.switchToRegion(region);
            await this.waitForRegionSchemas(region);
        }

        console.log('Regional schema loading complete');
    }

    private async waitForRegionSchemas(region: string): Promise<void> {
        //console.log(`StandaloneTestOrchestrator: Waiting for ${region} schemas...`);
        try {
            await WaitFor.waitFor(
                async () => {
                    const status = await this.client.checkSchemaReadiness(region);
                    if (!status.schemasReady) {
                        throw new Error(`Region ${region} schemas not ready yet`);
                    }
                    //console.log(`StandaloneTestOrchestrator: ${region} schemas are ready`);
                },
                30_000, // 30 second timeout
                500, // Check every 500ms
            );
        } catch {
            console.warn(`StandaloneTestOrchestrator: Timeout waiting for ${region} schemas, proceeding anyway`);
        }
    }

    private async switchToRegion(region: string): Promise<void> {
        //console.log(`StandaloneTestOrchestrator: Switching to region: ${region}`);
        
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
        
        /*
        // Wait for the settings to actually change
        await WaitFor.waitFor(
            async () => {
                //console.log(`waiting for switch from to ${region}`)
                const systemStatus = await this.client.getSystemStatus();
                const currentRegion = systemStatus.currentSettings?.profile?.region;
                if (currentRegion !== region) {
                    throw new Error(`Region not yet switched: expected ${region}, got ${currentRegion}`);
                }
                //console.log(`StandaloneTestOrchestrator: Successfully switched to region: ${region}`);
            },
            10_000, // 10 second timeout
            200, // Check every 200ms
        );*/
    }

    private async validateLsp(uri: string): Promise<void> {
        await this.hoverTester.testAllScenarios(uri);
        await this.completionTester.testAllScenarios(uri);
    }
}
