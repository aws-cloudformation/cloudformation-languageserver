import { StructuredTool } from '@langchain/core/tools';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { Closeable, Configurable } from '../server/ServerComponents';
import { DefaultSettings, ISettingsSubscriber, ProfileSettings, SettingsSubscription } from '../settings/Settings';
import { ClientMessage } from '../telemetry/ClientMessage';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';

const logger = LoggerFactory.getLogger('McpTools');

export class McpTools implements Configurable, Closeable {
    private mcpClient?: MultiServerMCPClient;
    private settingsSubscription?: SettingsSubscription;
    private initializationPromise?: Promise<void>;
    private pendingSettingsChange = false;

    constructor(
        private readonly clientMessage: ClientMessage,
        private profile: ProfileSettings = DefaultSettings.profile,
    ) {
        void this.initializeMCP();
    }

    configure(settingsManager: ISettingsSubscriber): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        this.settingsSubscription = settingsManager.subscribe('profile', async (newProfileSettings) => {
            this.profile = newProfileSettings;
            this.pendingSettingsChange = true;

            if (!this.initializationPromise) {
                this.initializationPromise = this.reinitializeMCP();
                await this.initializationPromise;
                this.initializationPromise = undefined;
            }
        });
    }

    private async initializeMCP() {
        this.mcpClient = new MultiServerMCPClient({
            mcpServers: {
                cloudformation: {
                    command: 'uvx',
                    args: ['awslabs.cfn-mcp-server@latest'],
                    env: {
                        AWS_PROFILE: this.profile.profile,
                        AWS_REGION: this.profile.region,
                        FASTMCP_LOG_LEVEL: 'ERROR',
                    },
                },
                awsKnowledge: {
                    url: 'https://knowledge-mcp.global.api.aws',
                },
            },
        });

        try {
            await this.mcpClient.initializeConnections();
            logger.info('Initialized MCP tools');
        } catch (error) {
            logger.error({ error: extractErrorMessage(error) }, 'Failed to initialize MCP tools');
        }
    }

    private async reinitializeMCP() {
        do {
            this.pendingSettingsChange = false;

            if (this.mcpClient) {
                await this.mcpClient.close().catch((error: unknown) => {
                    logger.error({ error }, 'Failed to close MCP client');
                });
            }
            await this.initializeMCP();
        } while (this.pendingSettingsChange);
    }

    async getAllTools(): Promise<StructuredTool[]> {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        return this.mcpClient ? await this.mcpClient.getTools() : [];
    }

    close() {
        return this.mcpClient?.close();
    }
}
