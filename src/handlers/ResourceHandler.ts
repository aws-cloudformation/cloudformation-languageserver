import { randomUUID } from 'crypto';
import { RequestHandler, ResponseError, ServerRequestHandler } from 'vscode-languageserver';
import { TopLevelSection } from '../context/CloudFormationEnums';
import { getEntityMap } from '../context/SectionContextBuilder';
import { CloudFormationFileType } from '../document/Document';
import { parseResourceTypeName } from '../resourceState/ResourceStateParser';
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
    ResourceExplorerSearchParams,
    ResourceExplorerSearchResult,
    ResourceExplorerListViewsResult,
    ResourceExplorerListSupportedTypesResult,
} from '../resourceState/ResourceStateTypes';
import { ResourceStackManagementResult } from '../resourceState/StackManagementInfoProvider';
import { ServerComponents } from '../server/ServerComponents';
import { GetStackTemplateParams, GetStackTemplateResult } from '../stacks/StackRequestType';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';
import { EventType } from '../usageTracker/UsageTracker';
import { extractErrorMessage } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

const log = LoggerFactory.getLogger('ResourceHandler');

export function getResourceTypesHandler(
    components: ServerComponents,
): ServerRequestHandler<void, ResourceTypesResult, never, void> {
    return (): ResourceTypesResult => {
        components.usageTracker.track(EventType.DidGetResourceTypes);
        try {
            const resourceTypes = components.resourceStateManager.getResourceTypes();
            return { resourceTypes };
        } catch (error) {
            log.error(error, 'Error getting resource types');
            return { resourceTypes: [] };
        }
    };
}

export function removeResourceTypeHandler(components: ServerComponents): RequestHandler<string, void, void> {
    return (rawParams: string) => {
        const typeName = parseWithPrettyError(parseResourceTypeName, rawParams);
        components.resourceStateManager.removeResourceType(typeName);
    };
}

export function listResourcesHandler(
    components: ServerComponents,
): RequestHandler<ListResourcesParams, ListResourcesResult, void> {
    return async (params: ListResourcesParams): Promise<ListResourcesResult> => {
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
    };
}

export function importResourceStateHandler(
    components: ServerComponents,
): RequestHandler<ResourceStateParams, ResourceStateResult, void> {
    return async (params: ResourceStateParams): Promise<ResourceStateResult> => {
        components.usageTracker.track(EventType.DidImportResources);
        const doc = components.documentManager.get(params.textDocument.uri);
        if (!doc) {
            const msg = `${params.purpose} failed: ${params.textDocument.uri} not found`;
            log.error(msg);
            throw new ResponseError(500, msg); // all open TextDocuments should be registered by protocol
        }

        if (!doc.isTemplate() && doc.cfnFileType !== CloudFormationFileType.Empty) {
            throw new ResponseError(
                400,
                `${params.purpose} failed: ${params.textDocument.uri} is not a valid CloudFormation template`,
            );
        }
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
            throw error;
        }
    };
}

export function searchResourceHandler(
    components: ServerComponents,
): ServerRequestHandler<SearchResourceParams, SearchResourceResult, never, void> {
    return async (params: SearchResourceParams): Promise<SearchResourceResult> => {
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
                    ErrorMessage: extractErrorMessage(error),
                    ErrorStack: error instanceof Error ? error.stack : undefined,
                    Error: error,
                });
                throw error;
            }
        });
    };
}

export function resourceExplorerSearchHandler(
    components: ServerComponents,
): ServerRequestHandler<ResourceExplorerSearchParams, ResourceExplorerSearchResult, never, void> {
    return async (params: ResourceExplorerSearchParams): Promise<ResourceExplorerSearchResult> => {
        const { arexTypeToCfnType, cfnTypeToArexType, extractIdentifierFromArn } =
            await import('../resourceState/ArexToCfnTypeMap');

        // Convert CFN types in query to AREX types
        const queryString = params.queryString.replaceAll(
            /resourcetype:([^\s]+)/gi,
            (_, type: string) => `resourcetype:${cfnTypeToArexType(type) ?? type}`,
        );

        const response = await components.resourceExplorerService.search(queryString, {
            maxResults: params.maxResults,
            nextToken: params.nextToken,
            viewArn: params.viewArn,
        });

        const resources =
            response.Resources?.flatMap((r) => {
                const arexType = r.ResourceType ?? '';
                const cfnType = arexTypeToCfnType(arexType);
                if (!cfnType) {
                    return [];
                }
                const identifier = extractIdentifierFromArn(cfnType, r.Arn ?? '');
                return [
                    {
                        arn: r.Arn ?? '',
                        resourceType: cfnType,
                        region: r.Region ?? '',
                        owningAccountId: r.OwningAccountId,
                        service: r.Service,
                        lastReportedAt: r.LastReportedAt?.toISOString(),
                        identifier,
                    },
                ];
            }) ?? [];

        return {
            resources,
            nextToken: response.NextToken,
            totalCount: response.Count?.TotalResources,
            isComplete: response.Count?.Complete,
            viewArn: response.ViewArn,
        };
    };
}

export function resourceExplorerListViewsHandler(
    components: ServerComponents,
): ServerRequestHandler<void, ResourceExplorerListViewsResult, never, void> {
    return async (): Promise<ResourceExplorerListViewsResult> => {
        const views = await components.resourceExplorerService.listViews();

        if (views.length === 0) {
            // Try to create a default view
            try {
                const newView = await components.resourceExplorerService.createDefaultView();
                if (newView) {
                    return {
                        views: [newView],
                        message:
                            'A Resource Explorer view was not found so one was created. Indexing may take minutes to hours \
                            depending on the number of resources in your account. You may see partial results until full \
                            inventory synchronization completes. Please try a search again later.',
                    };
                }
            } catch {
                // Fall through to return empty views
            }
        }

        return { views };
    };
}

export function resourceExplorerListSupportedTypesHandler(): ServerRequestHandler<
    void,
    ResourceExplorerListSupportedTypesResult,
    never,
    void
> {
    return async (): Promise<ResourceExplorerListSupportedTypesResult> => {
        const { getSearchableResourceTypes } = await import('../resourceState/ArexToCfnTypeMap');
        return { types: getSearchableResourceTypes() };
    };
}
