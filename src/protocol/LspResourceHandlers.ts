import { Connection, ServerRequestHandler } from 'vscode-languageserver';
import {
    ResourceTypesResult,
    ResourceTypesRequest,
    ListResourcesParams,
    ListResourcesResult,
    ListResourcesRequest,
    ResourceStateParams,
    ResourceStateResult,
    ResourceStateRequest,
    RefreshResourceListRequest,
    RefreshResourcesParams,
    RefreshResourcesResult,
    StackMgmtInfoRequest,
    ResourceIdentifier,
} from '../resourceState/ResourceStateTypes';
import { ResourceStackManagementResult } from '../resourceState/StackManagementInfoProvider';

export class LspResourceHandlers {
    constructor(private readonly connection: Connection) {}

    onListResources(handler: ServerRequestHandler<ListResourcesParams, ListResourcesResult, never, void>) {
        this.connection.onRequest(ListResourcesRequest.method, handler);
    }

    onRefreshResourceList(handler: ServerRequestHandler<RefreshResourcesParams, RefreshResourcesResult, never, void>) {
        this.connection.onRequest(RefreshResourceListRequest.method, handler);
    }

    onGetResourceTypes(handler: ServerRequestHandler<void, ResourceTypesResult, never, void>) {
        this.connection.onRequest(ResourceTypesRequest.method, handler);
    }

    onResourceStateImport(handler: ServerRequestHandler<ResourceStateParams, ResourceStateResult, never, void>) {
        this.connection.onRequest(ResourceStateRequest.method, handler);
    }

    onStackMgmtInfo(handler: ServerRequestHandler<ResourceIdentifier, ResourceStackManagementResult, never, void>) {
        this.connection.onRequest(StackMgmtInfoRequest.method, handler);
    }
}
