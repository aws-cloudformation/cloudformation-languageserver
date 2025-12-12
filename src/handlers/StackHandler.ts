import { ErrorCodes, RequestHandler, ResponseError } from 'vscode-languageserver';
import { ArtifactExporter } from '../artifactexporter/ArtifactExporter';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Parameter, Resource } from '../context/semantic/Entity';
import { parseIdentifiable } from '../protocol/LspParser';
import { Identifiable } from '../protocol/LspTypes';
import { ServerComponents } from '../server/ServerComponents';
import { analyzeCapabilities } from '../stacks/actions/CapabilityAnalyzer';
import { mapChangesToStackChanges } from '../stacks/actions/StackActionOperations';
import {
    parseCreateDeploymentParams,
    parseDeleteChangeSetParams,
    parseListStackResourcesParams,
    parseCreateValidationParams,
    parseDescribeChangeSetParams,
    parseTemplateUriParams,
    parseGetStackEventsParams,
    parseClearStackEventsParams,
    parseDescribeStackParams,
    parseDescribeEventsParams,
} from '../stacks/actions/StackActionParser';
import {
    TemplateUri,
    CreateValidationParams,
    DescribeDeploymentStatusResult,
    DescribeValidationStatusResult,
    GetCapabilitiesResult,
    GetParametersResult,
    GetTemplateArtifactsResult,
    GetStackActionStatusResult,
    GetTemplateResourcesResult,
    CreateDeploymentParams,
    CreateStackActionResult,
    DeleteChangeSetParams,
    DescribeDeletionStatusResult,
} from '../stacks/actions/StackActionRequestType';
import {
    ListStacksParams,
    ListStacksResult,
    ListChangeSetParams,
    ListChangeSetResult,
    ListStackResourcesParams,
    ListStackResourcesResult,
    GetStackEventsParams,
    GetStackEventsResult,
    ClearStackEventsParams,
    DescribeStackParams,
    DescribeStackResult,
    DescribeChangeSetParams,
    DescribeChangeSetResult,
    DescribeEventsParams,
    DescribeEventsResult,
} from '../stacks/StackRequestType';
import { TelemetryService } from '../telemetry/TelemetryService';
import { EventType } from '../usageTracker/UsageTracker';
import { handleLspError } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

export function getParametersHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, GetParametersResult, void> {
    return (rawParams) => {
        return TelemetryService.instance.get('StackHandler').measure('getParameters', () => {
            try {
                const params = parseWithPrettyError(parseTemplateUriParams, rawParams);
                const syntaxTree = components.syntaxTreeManager.getSyntaxTree(params);
                if (syntaxTree) {
                    const parametersMap = getEntityMap(syntaxTree, TopLevelSection.Parameters);
                    if (parametersMap) {
                        const parameters = [...parametersMap.values()].map((context) => context.entity as Parameter);
                        return {
                            parameters,
                        };
                    }
                }

                return {
                    parameters: [],
                };
            } catch (error) {
                handleLspError(error, 'Failed to get parameters');
            }
        });
    };
}

export function getTemplateArtifactsHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, GetTemplateArtifactsResult, void> {
    return (rawParams) => {
        try {
            const params = parseWithPrettyError(parseTemplateUriParams, rawParams);
            const document = components.documentManager.get(params);
            if (!document) {
                throw new Error(`Cannot retrieve file with uri: ${params}`);
            }

            const template = new ArtifactExporter(
                components.s3Service,
                document.documentType,
                document.uri,
                document.contents() ?? '',
            );
            const artifacts = template.getTemplateArtifacts();
            return { artifacts };
        } catch (error) {
            handleLspError(error, 'Failed to get template artifacts');
        }
    };
}

export function createValidationHandler(
    components: ServerComponents,
): RequestHandler<CreateValidationParams, CreateStackActionResult, void> {
    return async (rawParams) => {
        return await TelemetryService.instance.get('StackHandler').measureAsync('createValidation', async () => {
            components.usageTracker.track(EventType.DidValidation);
            try {
                const params = parseWithPrettyError(parseCreateValidationParams, rawParams);
                return await components.validationWorkflowService.start(params);
            } catch (error) {
                handleLspError(error, 'Failed to start validation workflow');
            }
        });
    };
}

export function createDeploymentHandler(
    components: ServerComponents,
): RequestHandler<CreateDeploymentParams, CreateStackActionResult, void> {
    return async (rawParams) => {
        return await TelemetryService.instance.get('StackHandler').measureAsync('createDeployment', async () => {
            components.usageTracker.track(EventType.DidDeployment);
            try {
                const params = parseWithPrettyError(parseCreateDeploymentParams, rawParams);
                return await components.deploymentWorkflowService.start(params);
            } catch (error) {
                handleLspError(error, 'Failed to start deployment workflow');
            }
        });
    };
}

export function getValidationStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, GetStackActionStatusResult, void> {
    return (rawParams) => {
        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.validationWorkflowService.getStatus(params);
        } catch (error) {
            handleLspError(error, 'Failed to get validation status');
        }
    };
}

export function getDeploymentStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, GetStackActionStatusResult, void> {
    return (rawParams) => {
        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.deploymentWorkflowService.getStatus(params);
        } catch (error) {
            handleLspError(error, 'Failed to get deployment status');
        }
    };
}

export function describeValidationStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, DescribeValidationStatusResult, void> {
    return (rawParams) => {
        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.validationWorkflowService.describeStatus(params);
        } catch (error) {
            handleLspError(error, 'Failed to describe validation status');
        }
    };
}

export function describeDeploymentStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, DescribeDeploymentStatusResult, void> {
    return (rawParams) => {
        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.deploymentWorkflowService.describeStatus(params);
        } catch (error) {
            handleLspError(error, 'Failed to describe deployment status');
        }
    };
}

export function deleteChangeSetHandler(
    components: ServerComponents,
): RequestHandler<DeleteChangeSetParams, CreateStackActionResult, void> {
    return async (rawParams) => {
        return await TelemetryService.instance.get('StackHandler').measureAsync('deleteChangeSet', async () => {
            try {
                const params = parseWithPrettyError(parseDeleteChangeSetParams, rawParams);
                return await components.changeSetDeletionWorkflowService.start(params);
            } catch (error) {
                handleLspError(error, 'Failed to start change set deletion workflow');
            }
        });
    };
}

export function getChangeSetDeletionStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, GetStackActionStatusResult, void> {
    return (rawParams) => {
        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.changeSetDeletionWorkflowService.getStatus(params);
        } catch (error) {
            handleLspError(error, 'Failed to get change set deletion status');
        }
    };
}

export function describeChangeSetDeletionStatusHandler(
    components: ServerComponents,
): RequestHandler<Identifiable, DescribeDeletionStatusResult, void> {
    return (rawParams) => {
        try {
            const params = parseWithPrettyError(parseIdentifiable, rawParams);
            return components.changeSetDeletionWorkflowService.describeStatus(params);
        } catch (error) {
            handleLspError(error, 'Failed to describe change set deletion status');
        }
    };
}

export function getCapabilitiesHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, GetCapabilitiesResult, void> {
    return async (rawParams) => {
        return await TelemetryService.instance.get('StackHandler').measureAsync('getCapabilities', async () => {
            try {
                const params = parseWithPrettyError(parseTemplateUriParams, rawParams);
                const document = components.documentManager.get(params);
                if (!document) {
                    throw new ResponseError(
                        ErrorCodes.InvalidRequest,
                        `Template body document not available for uri: ${params}`,
                    );
                }

                const capabilities = await analyzeCapabilities(document, components.cfnService);

                return { capabilities };
            } catch (error) {
                handleLspError(error, 'Failed to analyze template capabilities');
            }
        });
    };
}

export function getTemplateResourcesHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, GetTemplateResourcesResult, void> {
    return (rawParams) => {
        try {
            const params = parseWithPrettyError(parseTemplateUriParams, rawParams);
            const syntaxTree = components.syntaxTreeManager.getSyntaxTree(params);
            if (!syntaxTree) return { resources: [] };

            const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
            if (!resourcesMap) return { resources: [] };

            const schemas = components.schemaRetriever.getDefault();
            const resources = [...resourcesMap.values()].flatMap((context) => {
                const resource = context.entity as Resource;
                const resourceType = resource.Type ?? '';
                if (!resourceType) return [];

                const schema = schemas.schemas.get(resourceType);
                const primaryIdentifierKeys = extractPrimaryIdentifierKeys(schema?.primaryIdentifier);
                const primaryIdentifier = primaryIdentifierKeys
                    ? buildPrimaryIdentifierFromMetadata(resource.Metadata?.PrimaryIdentifier, primaryIdentifierKeys)
                    : undefined;

                return [
                    {
                        logicalId: resource.name,
                        type: resourceType,
                        primaryIdentifierKeys,
                        primaryIdentifier,
                    },
                ];
            });

            return { resources };
        } catch (error) {
            handleLspError(error, 'Failed to get template resources');
        }
    };
}

function extractPrimaryIdentifierKeys(primaryIdentifierPaths?: string[]): string[] | undefined {
    return primaryIdentifierPaths
        ?.map((path) => {
            const match = path.match(/\/properties\/(.+)/);
            return match?.[1];
        })
        .filter((key): key is string => key !== undefined);
}

function buildPrimaryIdentifierFromMetadata(
    metadataValue: unknown,
    keys: string[],
): Record<string, string> | undefined {
    if (!metadataValue || keys.length === 0 || typeof metadataValue !== 'string') return undefined;

    const values = metadataValue.split('|').map((v) => v.trim());
    const identifier: Record<string, string> = {};
    for (const [index, key] of keys.entries()) {
        identifier[key] = values[index] || values[0];
    }
    return identifier;
}

export function listStacksHandler(
    components: ServerComponents,
): RequestHandler<ListStacksParams, ListStacksResult, void> {
    return async (params: ListStacksParams): Promise<ListStacksResult> => {
        return await TelemetryService.instance.get('StackHandler').measureAsync('listStacks', async () => {
            if (params.statusToInclude?.length && params.statusToExclude?.length) {
                throw new Error('Cannot specify both statusToInclude and statusToExclude');
            }
            return await components.stackManager.listStacks(
                params.statusToInclude,
                params.statusToExclude,
                params.loadMore,
            );
        });
    };
}

export function listChangeSetsHandler(
    components: ServerComponents,
): RequestHandler<ListChangeSetParams, ListChangeSetResult, void> {
    return async (params: ListChangeSetParams): Promise<ListChangeSetResult> => {
        return await TelemetryService.instance.get('StackHandler').measureAsync('listChangeSets', async () => {
            const result = await components.cfnService.listChangeSets(params.stackName, params.nextToken);
            return {
                changeSets: result.changeSets.map((cs) => ({
                    changeSetName: cs.ChangeSetName ?? '',
                    status: cs.Status ?? '',
                    creationTime: cs.CreationTime?.toISOString(),
                    description: cs.Description,
                })),
                nextToken: result.nextToken,
            };
        });
    };
}

export function listStackResourcesHandler(
    components: ServerComponents,
): RequestHandler<ListStackResourcesParams, ListStackResourcesResult, void> {
    return async (rawParams): Promise<ListStackResourcesResult> => {
        const params = parseWithPrettyError(parseListStackResourcesParams, rawParams);
        const response = await components.cfnService.listStackResources({
            StackName: params.stackName,
            NextToken: params.nextToken,
        });
        return {
            resources: response.StackResourceSummaries ?? [],
            nextToken: response.NextToken,
        };
    };
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment,
@typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument,
@typescript-eslint/no-unsafe-call */
export function describeChangeSetHandler(
    components: ServerComponents,
): RequestHandler<DescribeChangeSetParams, DescribeChangeSetResult, void> {
    return async (rawParams: DescribeChangeSetParams): Promise<DescribeChangeSetResult> => {
        const params = parseWithPrettyError(parseDescribeChangeSetParams, rawParams);

        const result = (await components.cfnService.describeChangeSet({
            ChangeSetName: params.changeSetName,
            IncludePropertyValues: true,
            StackName: params.stackName,
        })) as any; // TODO: Remove 'as any' once SDK is released

        return {
            changeSetName: params.changeSetName,
            stackName: params.stackName,
            status: result.Status ?? '',
            creationTime: result.CreationTime?.toISOString(),
            description: result.Description,
            changes: mapChangesToStackChanges(result.Changes),
            deploymentMode: result.DeploymentMode,
        };
    };
}

export function getStackEventsHandler(
    components: ServerComponents,
): RequestHandler<GetStackEventsParams, GetStackEventsResult, void> {
    return async (rawParams): Promise<GetStackEventsResult> => {
        try {
            const params = parseWithPrettyError(parseGetStackEventsParams, rawParams);
            if (params.refresh) {
                const result = await components.stackEventManager.refresh(params.stackName);
                return { events: result.events, nextToken: undefined, gapDetected: result.gapDetected };
            }
            return await components.stackEventManager.fetchEvents(params.stackName, params.nextToken);
        } catch (error) {
            handleLspError(error, 'Failed to get stack events');
        }
    };
}

export function clearStackEventsHandler(
    components: ServerComponents,
): RequestHandler<ClearStackEventsParams, void, void> {
    return (rawParams): void => {
        try {
            parseWithPrettyError(parseClearStackEventsParams, rawParams);
            components.stackEventManager.clear();
        } catch (error) {
            handleLspError(error, 'Failed to clear stack events');
        }
    };
}

export function describeStackHandler(
    components: ServerComponents,
): RequestHandler<DescribeStackParams, DescribeStackResult, void> {
    return async (rawParams): Promise<DescribeStackResult> => {
        try {
            const params = parseWithPrettyError(parseDescribeStackParams, rawParams);
            const response = await components.cfnService.describeStacks({ StackName: params.stackName });
            const stack = response.Stacks?.[0];
            return { stack };
        } catch (error) {
            handleLspError(error, 'Failed to describe stack');
        }
    };
}

export function describeEventsHandler(
    components: ServerComponents,
): RequestHandler<DescribeEventsParams, DescribeEventsResult, void> {
    return async (rawParams): Promise<DescribeEventsResult> => {
        try {
            const params = parseWithPrettyError(parseDescribeEventsParams, rawParams);

            const response = await components.cfnService.describeEvents({
                StackName: params.stackName,
                ChangeSetName: params.changeSetName,
                OperationId: params.operationId,
                FailedEventsOnly: params.failedEventsOnly,
                NextToken: params.nextToken,
            });

            return {
                events: response.OperationEvents ?? [],
                nextToken: response.NextToken,
            };
        } catch (error) {
            handleLspError(error, 'Failed to describe events');
        }
    };
}
