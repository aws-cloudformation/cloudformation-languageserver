import { Connection, RequestHandler, NotificationHandler } from 'vscode-languageserver';
import { IamCredentialsUpdateRequest, IamCredentialsDeleteNotification } from '../auth/AuthProtocol';
import { UpdateCredentialsParams, UpdateCredentialsResult } from '../auth/AwsLspAuthTypes';

export class LspAuthHandlers {
    constructor(private readonly connection: Connection) {}

    // ========================================
    // RECEIVE: Client → Server
    // ========================================
    onIamCredentialsUpdate(handler: RequestHandler<UpdateCredentialsParams, UpdateCredentialsResult, void>) {
        this.connection.onRequest(IamCredentialsUpdateRequest.type, handler);
    }

    onIamCredentialsDelete(handler: NotificationHandler<void>) {
        this.connection.onNotification(IamCredentialsDeleteNotification.type, handler);
    }
}
