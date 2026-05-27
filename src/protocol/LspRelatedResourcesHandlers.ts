import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    AuthoredResource,
    GetAuthoredResourceTypesRequest,
    GetAuthoredResourceTypesRequestV2,
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

    onGetAuthoredResourceTypesV2(handler: RequestHandler<TemplateUri, AuthoredResource[], void>) {
        this.connection.onRequest(GetAuthoredResourceTypesRequestV2.method, handler);
    }

    onGetRelatedResourceTypes(handler: RequestHandler<GetRelatedResourceTypesParams, string[], void>) {
        this.connection.onRequest(GetRelatedResourceTypesRequest.method, handler);
    }

    onInsertRelatedResources(handler: RequestHandler<InsertRelatedResourcesParams, RelatedResourcesCodeAction, void>) {
        this.connection.onRequest(InsertRelatedResourcesRequest.method, handler);
    }
}
