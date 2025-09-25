import { Connection, ServerRequestHandler } from 'vscode-languageserver';
import { ListStacksParams, ListStacksResult, ListStacksRequest } from '../stacks/StackRequestType';

export class LspStackHandlers {
    constructor(private readonly connection: Connection) {}

    onListStacks(handler: ServerRequestHandler<ListStacksParams, ListStacksResult, never, void>) {
        this.connection.onRequest(ListStacksRequest.method, handler);
    }
}
