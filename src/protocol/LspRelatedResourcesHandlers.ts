import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    GetAuthoredResourceTypesRequest,
    GetRelatedResourceTypesParams,
    GetRelatedResourceTypesRequest,
    InsertRelatedResourcesParams,
    InsertRelatedResourcesRequest,
    RelatedResourcesCodeAction,
    TemplateUri,
} from './RelatedResourcesProtocol';

export class LspRelatedResourcesHandlers {
    constructor(private readonly connection: Connection) {}

    onGetAuthoredResourceTypes(handler: RequestHandler<TemplateUri, string[], void>) {
        this.connection.onRequest(GetAuthoredResourceTypesRequest.method, handler);
    }

    onGetRelatedResourceTypes(handler: RequestHandler<GetRelatedResourceTypesParams, string[], void>) {
        this.connection.onRequest(GetRelatedResourceTypesRequest.method, handler);
    }

    onInsertRelatedResources(handler: RequestHandler<InsertRelatedResourcesParams, RelatedResourcesCodeAction, void>) {
        this.connection.onRequest(InsertRelatedResourcesRequest.method, handler);
    }
}
