import { Connection, ServerRequestHandler } from 'vscode-languageserver';
import {
    GetSchemaReadinessRequestType,
    GetSchemaReadinessRequest,
    GetSchemaReadinessResponse,
} from '../schema/SchemaRequestType';

export class LspSchemaHandlers {
    constructor(private readonly connection: Connection) {}

    onGetSchemaReadiness(
        handler: ServerRequestHandler<GetSchemaReadinessRequest, GetSchemaReadinessResponse, never, void>,
    ) {
        this.connection.onRequest(GetSchemaReadinessRequestType.method, handler);
    }
}
