import { Connection, ServerRequestHandler } from 'vscode-languageserver';
import { RequestHandler } from 'vscode-languageserver/node';
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
    SearchResourceRequest,
    SearchResourceParams,
    SearchResourceResult,
} from '../resourceState/ResourceStateTypes';
import { ResourceStackManagementResult } from '../resourceState/StackManagementInfoProvider';

export class LspResourceHandlers {
    constructor(private readonly connection: Connection) {}

    onListResources(handler: RequestHandler<ListResourcesParams, ListResourcesResult, void>) {
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

    onSearchResource(handler: ServerRequestHandler<SearchResourceParams, SearchResourceResult, never, void>) {
        this.connection.onRequest(SearchResourceRequest.method, handler);
    }
}
