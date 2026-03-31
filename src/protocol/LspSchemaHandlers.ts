import { Connection, ServerRequestHandler } from 'vscode-languageserver';
import { GetSystemStatusRequestType, GetSystemStatusResponse } from '../system/SystemTypes';

export class LspSystemHandlers {
    constructor(private readonly connection: Connection) {}

    registerSystemStatusHandler(handler: ServerRequestHandler<void, GetSystemStatusResponse, never, void>) {
        this.connection.onRequest(GetSystemStatusRequestType.method, handler);
    }
}
