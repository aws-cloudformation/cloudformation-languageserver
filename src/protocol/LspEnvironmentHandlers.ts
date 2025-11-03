import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    ParseEnvironmentFilesParams,
    ParseEnvironmentFilesResult,
    ParseEnvironmentFilesRequest,
} from '../environments/environmentRequestType';

export class LspEnvironmentHandlers {
    constructor(private readonly connection: Connection) {}

    onParseEnvironmentFiles(handler: RequestHandler<ParseEnvironmentFilesParams, ParseEnvironmentFilesResult, void>) {
        this.connection.onRequest(ParseEnvironmentFilesRequest.method, handler);
    }
}
