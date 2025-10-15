import { MessageType, ShowMessageRequestParams } from 'vscode-languageserver';
import { LspCommunication } from '../protocol/LspCommunication';

export class ClientMessage {
    constructor(private readonly client: LspCommunication) {}

    showMessageNotification(type: MessageType, message: string) {
        return this.client.showMessage({
            type,
            message,
        });
    }

    showMessageRequest(params: ShowMessageRequestParams) {
        return this.client.showMessageRequest(params);
    }

    logMessageNotification(type: MessageType, message: string) {
        return this.client.logMessage({
            type,
            message,
        });
    }
}
