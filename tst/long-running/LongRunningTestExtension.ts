import { DidChangeConfigurationParams } from 'vscode-languageserver';
import { ConfigurationParams, ConfigurationItem } from 'vscode-languageserver-protocol';
import { getRemotePublicSchemas } from '../../src/schema/GetSchemaTask';
import { SchemaRetriever } from '../../src/schema/SchemaRetriever';
import { AwsRegion } from '../../src/utils/Region';
import { getTestPrivateSchemas, samFileType, SamSchemaFiles } from '../utils/SchemaUtils';
import { TestExtension, TestExtensionConfig } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';

export class LongRunningTestExtension extends TestExtension {
    private currentWorkspaceConfig: Record<string, unknown>[] = [{}];

    constructor(config: TestExtensionConfig = {}) {
        super({
            ...config,
            schemaRetrieverFactory: (schemaStore) =>
                new SchemaRetriever(
                    schemaStore,
                    getRemotePublicSchemas,
                    () => Promise.resolve(getTestPrivateSchemas()),
                    () => Promise.resolve(samFileType(Object.values(SamSchemaFiles))),
                ),
        });

        // Override workspace/configuration handler to return stored config
        this.clientConnection.onRequest('workspace/configuration', (params: ConfigurationParams) => {
            // Extract the specific configuration section requested
            if (params?.items?.length > 0) {
                const results = params.items.map((item: ConfigurationItem) => {
                    if (item.section === 'aws.cloudformation') {
                        // Return just the CloudFormation config part
                        const fullConfig = this.currentWorkspaceConfig[0] ?? {};
                        return fullConfig['aws.cloudformation'] ?? {};
                    }
                    return {};
                });
                return results;
            }
            return this.currentWorkspaceConfig;
        });
    }

    // Additional helpers

    override changeConfiguration(params: DidChangeConfigurationParams) {
        // Store the new configuration
        if (params.settings) {
            const currentConfig = this.currentWorkspaceConfig[0] ?? {};
            this.currentWorkspaceConfig = [{ ...currentConfig, ...params.settings }];
        }
        return super.changeConfiguration(params);
    }

    async loadAllRegionSchemas(regions: AwsRegion[]): Promise<void> {
        // Switch to each region and wait for schemas to be downloaded
        for (const region of regions) {
            await this.changeConfiguration({
                settings: {
                    'aws.cloudformation': {
                        profile: {
                            region,
                        },
                    },
                },
            });

            await WaitFor.waitFor(() => {
                const schemas = this.components.schemaStore.getPublicSchemas(region);
                if (!schemas) {
                    throw new Error(`Regional schemas not loaded for ${region}`);
                }
            }, 10000); // Longer timeout for schema downloads
        }
    }

    async switchToRegion(region: AwsRegion): Promise<void> {
        await this.changeConfiguration({
            settings: {
                'aws.cloudformation': {
                    profile: {
                        region,
                    },
                },
            },
        });

        const schemas = this.components.schemaStore.getPublicSchemas(region);
        if (!schemas) {
            throw new Error(`Expected preloaded schemas for ${region} but none found`);
        }
    }
}
