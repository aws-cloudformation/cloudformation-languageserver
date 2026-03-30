import { Connection, ServerRequestHandler } from 'vscode-languageserver';
import {
    SchemaReadinessRequestType,
    SchemaReadinessRequest,
    SchemaReadinessResponse,
} from '../schema/SchemaRequestType';

export class LspSchemaHandlers {
    constructor(private readonly connection: Connection) {}

    onGetSchemaReadiness(handler: ServerRequestHandler<SchemaReadinessRequest, SchemaReadinessResponse, never, void>) {
        this.connection.onRequest(SchemaReadinessRequestType.method, handler);
    }
}
