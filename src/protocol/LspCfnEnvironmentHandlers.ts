import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    ParseCfnEnvironmentFilesParams,
    ParseCfnEnvironmentFilesResult,
    ParseEnvironmentFilesRequest,
} from '../cfnEnvironments/CfnEnvironmentRequestType';

export class LspCfnEnvironmentHandlers {
    constructor(private readonly connection: Connection) {}

    onParseCfnEnvironmentFiles(
        handler: RequestHandler<ParseCfnEnvironmentFilesParams, ParseCfnEnvironmentFilesResult, void>,
    ) {
        this.connection.onRequest(ParseEnvironmentFilesRequest.method, handler);
    }
}
