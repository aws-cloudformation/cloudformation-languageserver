import { BaseMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { DocumentManager } from '../document/DocumentManager';
import { AwsClient } from '../services/AwsClient';
import { RelationshipSchemaService } from '../services/RelationshipSchemaService';
import { getFilteredScannedResources, formatScannedResourcesForAI } from '../services/ResourceScanService';
import { SettingsConfigurable, ISettingsSubscriber } from '../settings/ISettingsSubscriber';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Closeable } from '../utils/Closeable';
import { extractErrorMessage } from '../utils/Errors';
import { toString } from '../utils/String';
import { Agent } from './Agent';
import { LLMConfig } from './llm/LLMConfig';
import { McpTools } from './McpTools';
import { Prompts } from './Prompts';

const logger = LoggerFactory.getLogger('CfnAI');

export class CfnAI implements SettingsConfigurable, Closeable {
    private readonly llmConfig: LLMConfig;
    private agent?: Agent;
    private mcpTools?: McpTools;

    constructor(
        private readonly documentManager: DocumentManager,
        private readonly awsClient: AwsClient,
    ) {
        this.llmConfig = new LLMConfig();
    }

    configure(settingsManager: ISettingsSubscriber): void {
        this.mcpTools?.configure(settingsManager);
    }

    private initializeIfConfigured(): void {
        if (this.agent === undefined) {
            const config = this.llmConfig.get();
            if (config !== undefined) {
                this.agent = new Agent(config);
                this.mcpTools = new McpTools();
            }
        }
    }

    private async getToolsWithFallback(): Promise<StructuredTool[]> {
        try {
            return (await this.mcpTools?.getAllTools()) ?? [];
        } catch (error) {
            logger.warn({ error: extractErrorMessage(error) }, 'Failed to get MCP tools, continuing without tools');
            return [];
        }
    }

    describeTemplate(templateFile: unknown) {
        return this.runWithAgent(async (agent) => {
            const document = this.documentManager.getByName(toString(templateFile));
            if (!document?.isTemplate()) {
                throw new Error(`Template not found ${toString(templateFile)}`);
            }

            return await agent.execute(
                await Prompts.describeTemplate(document.contents()),
                await this.getToolsWithFallback(),
            );
        });
    }

    optimizeTemplate(templateFile: unknown) {
        return this.runWithAgent(async (agent) => {
            const document = this.documentManager.getByName(toString(templateFile));
            if (!document?.isTemplate()) {
                throw new Error(`Template not found ${toString(templateFile)}`);
            }

            return await agent.execute(
                await Prompts.optimizeTemplate(document.contents()),
                await this.getToolsWithFallback(),
            );
        });
    }

    analyzeDiagnostic(uri: string, diagnostics: unknown) {
        return this.runWithAgent(async (agent) => {
            const document = this.documentManager.get(uri);
            if (!document?.isTemplate()) {
                return;
            }

            return await agent.execute(
                await Prompts.analyzeDiagnostic(document.contents(), diagnostics),
                await this.getToolsWithFallback(),
            );
        });
    }

    generateTemplate(userInput: string) {
        return this.runWithAgent(async (agent) => {
            return await agent.execute(await Prompts.generateTemplate(userInput), await this.getToolsWithFallback());
        });
    }

    recommendRelatedResources(templateFile: unknown) {
        return this.runWithAgent(async (agent) => {
            const document = this.documentManager.getByName(toString(templateFile));
            if (!document?.isTemplate()) {
                throw new Error(`Template not found ${toString(templateFile)}`);
            }

            const templateContent = document.contents();

            const relationshipService = RelationshipSchemaService.getInstance();
            const resourceTypes = relationshipService.extractResourceTypesFromTemplate(templateContent);
            const relationshipContext = relationshipService.getRelationshipContext(resourceTypes);

            let scannedResourcesInfo: string | undefined;
            let hasResourceScan = false;

            try {
                const filteredResources = await getFilteredScannedResources(
                    this.awsClient,
                    resourceTypes,
                    relationshipService,
                );
                if (filteredResources) {
                    scannedResourcesInfo = formatScannedResourcesForAI(filteredResources);
                    hasResourceScan = true;
                    logger.info(`Found ${filteredResources.totalCount} related resources in account`);
                } else {
                    logger.info('No resource scan available');
                }
            } catch (error) {
                logger.warn({ error: extractErrorMessage(error) }, 'Failed to get resource scan data');
            }

            return await agent.execute(
                await Prompts.recommendRelatedResources(
                    templateContent,
                    relationshipContext,
                    scannedResourcesInfo,
                    hasResourceScan,
                ),
                await this.getToolsWithFallback(),
            );
        });
    }

    private runWithAgent(
        operation: (agent: Agent) => Promise<BaseMessage | undefined>,
    ): Promise<BaseMessage | undefined> {
        this.initializeIfConfigured();
        if (!this.agent) {
            throw new Error('Agent not configured');
        }

        return operation(this.agent);
    }

    close() {
        return this.mcpTools?.close();
    }
}
