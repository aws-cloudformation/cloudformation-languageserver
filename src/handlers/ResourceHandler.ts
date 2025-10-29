import { randomUUID } from 'crypto';
import { ServerRequestHandler } from 'vscode-languageserver';
import { RequestHandler } from 'vscode-languageserver/node';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import {
    ResourceTypesResult,
    ListResourcesParams,
    ListResourcesResult,
    RefreshResourcesParams,
    RefreshResourcesResult,
    ResourceStateParams,
    ResourceStateResult,
    ResourceSummary,
    ResourceIdentifier,
    SearchResourceParams,
    SearchResourceResult,
} from '../resourceState/ResourceStateTypes';
import { ResourceStackManagementResult } from '../resourceState/StackManagementInfoProvider';
import { ServerComponents } from '../server/ServerComponents';
import { GetStackTemplateParams, GetStackTemplateResult } from '../stacks/StackRequestType';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';
import { extractErrorMessage } from '../utils/Errors';

const log = LoggerFactory.getLogger('ResourceHandler');

export function getResourceTypesHandler(
    components: ServerComponents,
): ServerRequestHandler<void, ResourceTypesResult, never, void> {
    return (): ResourceTypesResult => {
        try {
            const resourceTypes = components.resourceStateManager.getResourceTypes();
            return { resourceTypes };
        } catch (error) {
            log.error(error, 'Error getting resource types');
            return { resourceTypes: [] };
        }
    };
}

export function listResourcesHandler(
    components: ServerComponents,
): RequestHandler<ListResourcesParams, ListResourcesResult, void> {
    return async (params: ListResourcesParams): Promise<ListResourcesResult> => {
        try {
            const resourceRequests = params.resources;
            if (!resourceRequests || resourceRequests.length === 0) {
                return { resources: [] };
            }

            const resources: ResourceSummary[] = [];

            for (const request of resourceRequests) {
                const resourceList = await components.resourceStateManager.listResources(
                    request.resourceType,
                    request.nextToken,
                );
                if (resourceList) {
                    resources.push({
                        typeName: resourceList.typeName,
                        resourceIdentifiers: resourceList.resourceIdentifiers,
                        nextToken: resourceList.nextToken,
                    });
                }
            }

            return { resources };
        } catch (error) {
            log.error(error, 'Error listing resources');
            return { resources: [] };
        }
    };
}

export function importResourceStateHandler(
    components: ServerComponents,
): ServerRequestHandler<ResourceStateParams, ResourceStateResult, never, void> {
    return async (params: ResourceStateParams): Promise<ResourceStateResult> => {
        return await components.resourceStateImporter.importResourceState(params);
    };
}

export function refreshResourceListHandler(
    components: ServerComponents,
): ServerRequestHandler<RefreshResourcesParams, RefreshResourcesResult, never, void> {
    return async (params: RefreshResourcesParams): Promise<RefreshResourcesResult> => {
        try {
            const timeout = new Promise<never>((resolve, reject) =>
                setTimeout(() => reject(new Error('Resource list refresh timed out')), 30_000),
            );

            const resourceTypes = params.resources.map((r) => r.resourceType);
            return await Promise.race([components.resourceStateManager.refreshResourceList(resourceTypes), timeout]);
        } catch (error) {
            log.error(error, 'Failed to refresh resource list');
            throw new Error(`Failed to refresh resource list: ${extractErrorMessage(error)}`);
        }
    };
}

export function searchResourceHandler(
    components: ServerComponents,
): ServerRequestHandler<SearchResourceParams, SearchResourceResult, never, void> {
    return async (params: SearchResourceParams): Promise<SearchResourceResult> => {
        try {
            const result = await components.resourceStateManager.searchResourceByIdentifier(
                params.resourceType,
                params.identifier,
            );
            return {
                found: result.found,
                resource: result.resourceList
                    ? {
                          typeName: result.resourceList.typeName,
                          resourceIdentifiers: result.resourceList.resourceIdentifiers,
                          nextToken: result.resourceList.nextToken,
                      }
                    : undefined,
            };
        } catch (error) {
            log.error(error, 'Failed to search resource');
            return { found: false };
        }
    };
}

export function getStackMgmtInfo(
    components: ServerComponents,
): ServerRequestHandler<ResourceIdentifier, ResourceStackManagementResult, never, void> {
    return async (id) => {
        return await components.stackManagementInfoProvider.getResourceManagementState(id);
    };
}

export function getManagedResourceStackTemplateHandler(
    components: ServerComponents,
): RequestHandler<GetStackTemplateParams, GetStackTemplateResult | undefined, void> {
    const telemetry = TelemetryService.instance.get('ResourceHandler');

    return async (params, _token) => {
        return await telemetry.measureAsync('getManagedResourceStackTemplate', async () => {
            try {
                const template = await components.cfnService.getTemplate({ StackName: params.stackName });
                if (!template) {
                    return;
                }

                let lineNumber: number | undefined;

                if (params.primaryIdentifier) {
                    const resources = await components.cfnService.describeStackResources({
                        StackName: params.stackName,
                    });
                    const resource = resources.StackResources?.find(
                        (r) => r.PhysicalResourceId === params.primaryIdentifier,
                    );

                    if (!resource?.LogicalResourceId) {
                        throw new Error(
                            `Resource with PhysicalResourceId ${params.primaryIdentifier} not found in stack ${params.stackName}`,
                        );
                    }

                    const logicalId = resource.LogicalResourceId;
                    const tempUri = `temp://${randomUUID()}.template`;

                    try {
                        components.syntaxTreeManager.add(tempUri, template);

                        const syntaxTree = components.syntaxTreeManager.getSyntaxTree(tempUri);
                        if (syntaxTree) {
                            const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
                            const resourceContext = resourcesMap?.get(logicalId);
                            if (resourceContext) {
                                lineNumber = resourceContext.startPosition.row;
                            }
                        }
                    } finally {
                        components.syntaxTreeManager.deleteSyntaxTree(tempUri);
                    }
                }

                return {
                    templateBody: template,
                    lineNumber,
                };
            } catch (error) {
                log.error({
                    Handler: 'GetManagedResourceStackTemplateHandler',
                    StackName: params.stackName,
                    ErrorMessage: error instanceof Error ? error.message : String(error),
                    ErrorStack: error instanceof Error ? error.stack : undefined,
                    Error: error,
                });
                throw error;
            }
        });
    };
}
