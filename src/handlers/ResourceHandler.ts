import { ServerRequestHandler } from 'vscode-languageserver';
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
} from '../resourceState/ResourceStateTypes';
import { ResourceStackManagementResult } from '../resourceState/StackManagementInfoProvider';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
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
            log.error({ error: extractErrorMessage(error) }, 'Error getting resource types');
            return { resourceTypes: [] };
        }
    };
}

export function listResourcesHandler(
    components: ServerComponents,
): ServerRequestHandler<ListResourcesParams, ListResourcesResult, never, void> {
    return async (params: ListResourcesParams): Promise<ListResourcesResult> => {
        try {
            const resourceTypes = params.resourceTypes;
            if (!resourceTypes || resourceTypes.length === 0) {
                return { resources: [] };
            }

            const resources: ResourceSummary[] = [];

            for (const typeName of resourceTypes) {
                const resourceList = await components.resourceStateManager.listResources(typeName);
                if (resourceList) {
                    resources.push({
                        typeName: resourceList.typeName,
                        resourceIdentifiers: resourceList.resourceIdentifiers,
                    });
                }
            }

            return { resources };
        } catch (error) {
            log.error({ error: extractErrorMessage(error) }, 'Error listing resources');
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

            return await Promise.race([
                components.resourceStateManager.refreshResourceList(params.resourceTypes),
                timeout,
            ]);
        } catch (error) {
            log.error(error, 'Failed to refresh resource list');
            throw new Error(`Failed to refresh resource list: ${extractErrorMessage(error)}`);
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
