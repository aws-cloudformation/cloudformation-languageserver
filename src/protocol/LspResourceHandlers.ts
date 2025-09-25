import { Connection, ServerRequestHandler } from 'vscode-languageserver';
import {
    GetResourceTypesResult,
    GetResourceTypesRequest,
    ListResourcesParams,
    ListResourcesResult,
    ListResourcesRequest,
    ResourceStateImportParams,
    ResourceStateImportResult,
    ResourceStateImportRequest,
    RefreshResourceListRequest,
    RefreshResourceListParams,
    RefreshResourceListResult,
} from '../resourceState/ResourceStateTypes';

export class LspResourceHandlers {
    constructor(private readonly connection: Connection) {}

    onListResources(handler: ServerRequestHandler<ListResourcesParams, ListResourcesResult, never, void>) {
        this.connection.onRequest(ListResourcesRequest.method, handler);
    }

    onRefreshResourceList(
        handler: ServerRequestHandler<RefreshResourceListParams, RefreshResourceListResult, never, void>,
    ) {
        this.connection.onRequest(RefreshResourceListRequest.method, handler);
    }

    onGetResourceTypes(handler: ServerRequestHandler<void, GetResourceTypesResult, never, void>) {
        this.connection.onRequest(GetResourceTypesRequest.method, handler);
    }

    onResourceStateImport(
        handler: ServerRequestHandler<ResourceStateImportParams, ResourceStateImportResult, never, void>,
    ) {
        this.connection.onRequest(ResourceStateImportRequest.method, handler);
    }
}
