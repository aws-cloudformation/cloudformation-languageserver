import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    GetAuthoredResourceTypesRequest,
    GetRelatedResourceTypesRequest,
    InsertRelatedResourcesRequest,
    RelatedResourcesCodeAction,
    ResourceTypeRequest,
    TemplateUri,
} from './RelatedResourcesProtocol';

export class LspRelatedResourcesHandlers {
    constructor(private readonly connection: Connection) {}

    onGetAuthoredResourceTypes(handler: RequestHandler<TemplateUri, string[], void>) {
        this.connection.onRequest(GetAuthoredResourceTypesRequest.method, handler);
    }

    onGetRelatedResourceTypes(handler: RequestHandler<ResourceTypeRequest, string[], void>) {
        this.connection.onRequest(GetRelatedResourceTypesRequest.method, handler);
    }

    onInsertRelatedResources(handler: RequestHandler<InsertRelatedResourcesRequest, RelatedResourcesCodeAction, void>) {
        this.connection.onRequest(InsertRelatedResourcesRequest.method, handler);
    }
}
