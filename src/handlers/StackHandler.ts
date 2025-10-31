import { ErrorCodes, RequestHandler, ResponseError } from 'vscode-languageserver';
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
    parseGetStackOutputsParams,
} from '../stacks/actions/StackActionParser';
import {
    TemplateUri,
    CreateValidationParams,
    DescribeDeploymentStatusResult,
    DescribeValidationStatusResult,
    GetCapabilitiesResult,
    GetParametersResult,
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
    GetStackOutputsParams,
    GetStackOutputsResult,
    DescribeChangeSetParams,
    DescribeChangeSetResult,
} from '../stacks/StackRequestType';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

const log = LoggerFactory.getLogger('StackHandler');

export function getParametersHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, GetParametersResult, void> {
    return (rawParams) => {
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
            handleStackActionError(error, 'Failed to get parameters');
        }
    };
}

export function createValidationHandler(
    components: ServerComponents,
): RequestHandler<CreateValidationParams, CreateStackActionResult, void> {
    return async (rawParams) => {
        try {
            const params = parseWithPrettyError(parseCreateValidationParams, rawParams);
            return await components.validationWorkflowService.start(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to start validation workflow');
        }
    };
}

export function createDeploymentHandler(
    components: ServerComponents,
): RequestHandler<CreateDeploymentParams, CreateStackActionResult, void> {
    return async (rawParams) => {
        try {
            const params = parseWithPrettyError(parseCreateDeploymentParams, rawParams);
            return await components.deploymentWorkflowService.start(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to start deployment workflow');
        }
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
            handleStackActionError(error, 'Failed to get validation status');
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
            handleStackActionError(error, 'Failed to get deployment status');
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
            handleStackActionError(error, 'Failed to describe validation status');
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
            handleStackActionError(error, 'Failed to describe deployment status');
        }
    };
}

export function deleteChangeSetHandler(
    components: ServerComponents,
): RequestHandler<DeleteChangeSetParams, CreateStackActionResult, void> {
    return async (rawParams) => {
        try {
            const params = parseWithPrettyError(parseDeleteChangeSetParams, rawParams);
            return await components.changeSetDeletionWorkflowService.start(params);
        } catch (error) {
            handleStackActionError(error, 'Failed to start change set deletion workflow');
        }
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
            handleStackActionError(error, 'Failed to get change set deletion status');
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
            handleStackActionError(error, 'Failed to describe change set deletion status');
        }
    };
}

export function getCapabilitiesHandler(
    components: ServerComponents,
): RequestHandler<TemplateUri, GetCapabilitiesResult, void> {
    return async (rawParams) => {
        try {
            const params = parseWithPrettyError(parseTemplateUriParams, rawParams);
            const document = components.documentManager.get(params);
            if (!document) {
                throw new ResponseError(ErrorCodes.InvalidRequest, 'Template body document not available');
            }

            const capabilities = await analyzeCapabilities(document, components.cfnService);

            return { capabilities };
        } catch (error) {
            handleStackActionError(error, 'Failed to analyze template capabilities');
        }
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
            handleStackActionError(error, 'Failed to get template resources');
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
        try {
            if (params.statusToInclude?.length && params.statusToExclude?.length) {
                throw new Error('Cannot specify both statusToInclude and statusToExclude');
            }
            return await components.stackManager.listStacks(
                params.statusToInclude,
                params.statusToExclude,
                params.loadMore,
            );
        } catch (error) {
            log.error(error, 'Error listing stacks');
            return { stacks: [], nextToken: undefined };
        }
    };
}

export function listChangeSetsHandler(
    components: ServerComponents,
): RequestHandler<ListChangeSetParams, ListChangeSetResult, void> {
    return async (params: ListChangeSetParams): Promise<ListChangeSetResult> => {
        try {
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
        } catch {
            return { changeSets: [] };
        }
    };
}

export function listStackResourcesHandler(
    components: ServerComponents,
): RequestHandler<ListStackResourcesParams, ListStackResourcesResult, void> {
    return async (rawParams): Promise<ListStackResourcesResult> => {
        try {
            const params = parseWithPrettyError(parseListStackResourcesParams, rawParams);
            const response = await components.cfnService.listStackResources({
                StackName: params.stackName,
                NextToken: params.nextToken,
            });
            return {
                resources: response.StackResourceSummaries ?? [],
                nextToken: response.NextToken,
            };
        } catch (error) {
            log.error(error, 'Error listing stack resources');
            return { resources: [] };
        }
    };
}

export function describeChangeSetHandler(
    components: ServerComponents,
): RequestHandler<DescribeChangeSetParams, DescribeChangeSetResult, void> {
    return async (rawParams: DescribeChangeSetParams): Promise<DescribeChangeSetResult> => {
        const params = parseWithPrettyError(parseDescribeChangeSetParams, rawParams);

        const result = await components.cfnService.describeChangeSet({
            ChangeSetName: params.changeSetName,
            IncludePropertyValues: true,
            StackName: params.stackName,
        });

        return {
            changeSetName: params.changeSetName,
            stackName: params.stackName,
            status: result.Status ?? '',
            creationTime: result.CreationTime?.toISOString(),
            description: result.Description,
            changes: mapChangesToStackChanges(result.Changes),
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
            handleStackActionError(error, 'Failed to get stack events');
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
            handleStackActionError(error, 'Failed to clear stack events');
        }
    };
}

export function getStackOutputsHandler(
    components: ServerComponents,
): RequestHandler<GetStackOutputsParams, GetStackOutputsResult, void> {
    return async (rawParams): Promise<GetStackOutputsResult> => {
        try {
            const params = parseWithPrettyError(parseGetStackOutputsParams, rawParams);
            const response = await components.cfnService.describeStacks({ StackName: params.stackName });
            const outputs = response.Stacks?.[0]?.Outputs ?? [];
            return { outputs };
        } catch (error) {
            handleStackActionError(error, 'Failed to get stack outputs');
        }
    };
}

function handleStackActionError(error: unknown, contextMessage: string): never {
    if (error instanceof ResponseError) {
        throw error;
    }
    if (error instanceof TypeError) {
        throw new ResponseError(ErrorCodes.InvalidParams, error.message);
    }
    throw new ResponseError(ErrorCodes.InternalError, `${contextMessage}: ${extractErrorMessage(error)}`);
}
