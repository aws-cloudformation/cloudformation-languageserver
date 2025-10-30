import { Connection, ShowMessageRequestParams, RemoteConsole } from 'vscode-languageserver';
import {
    LogMessageParams,
    MessageActionItem,
    ShowMessageParams,
    ShowMessageNotification,
    ShowMessageRequest,
    LogMessageNotification,
} from 'vscode-languageserver-protocol';

export class LspCommunication {
    public readonly console: RemoteConsole;

    constructor(private readonly connection: Connection) {
        this.console = this.connection.console;
    }

    showMessage(params: ShowMessageParams) {
        return this.connection.sendNotification(ShowMessageNotification.method, params);
    }

    showMessageRequest(params: ShowMessageRequestParams): Promise<MessageActionItem | null | undefined> {
        return this.connection.sendRequest<MessageActionItem | null | undefined>(ShowMessageRequest.method, params);
    }

    logMessage(params: LogMessageParams) {
        return this.connection.sendNotification(LogMessageNotification.method, params);
    }

    sendAuthErrorNotification() {
        return this.connection.sendNotification('aws/credentials/authError', {});
    }
}
