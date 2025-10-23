import { Connection, RequestHandler, NotificationHandler } from 'vscode-languageserver';
import {
    IamCredentialsUpdateRequest,
    BearerCredentialsUpdateRequest,
    IamCredentialsDeleteNotification,
    BearerCredentialsDeleteNotification,
    GetConnectionMetadataRequest,
    ListProfilesRequest,
    UpdateProfileRequest,
    GetSsoTokenRequest,
    InvalidateSsoTokenRequest,
    SsoTokenChangedNotification,
} from '../auth/AuthProtocol';
import {
    GetSsoTokenParams,
    InvalidateSsoTokenParams,
    ListProfilesParams,
    SsoTokenChangedParams,
    UpdateCredentialsParams,
    UpdateCredentialsResult,
    UpdateProfileParams,
} from '../auth/AwsLspAuthTypes';

// Must be kept consistent with https://github.com/aws/language-server-runtimes
export class LspAuthHandlers {
    constructor(private readonly connection: Connection) {}

    // ========================================
    // RECEIVE: Client → Server
    // ========================================
    onIamCredentialsUpdate(handler: RequestHandler<UpdateCredentialsParams, UpdateCredentialsResult, void>) {
        this.connection.onRequest(IamCredentialsUpdateRequest.type, handler);
    }

    onBearerCredentialsUpdate(handler: RequestHandler<UpdateCredentialsParams, void, void>) {
        this.connection.onRequest(BearerCredentialsUpdateRequest.type, handler);
    }

    onIamCredentialsDelete(handler: NotificationHandler<void>) {
        this.connection.onNotification(IamCredentialsDeleteNotification.type, handler);
    }

    onBearerCredentialsDelete(handler: NotificationHandler<void>) {
        this.connection.onNotification(BearerCredentialsDeleteNotification.type, handler);
    }

    // ========================================
    // SEND: Server → Client
    // ========================================
    sendGetConnectionMetadata() {
        return this.connection.sendRequest(GetConnectionMetadataRequest.type);
    }

    sendListProfiles(params: ListProfilesParams) {
        return this.connection.sendRequest(ListProfilesRequest.type, params);
    }

    sendUpdateProfile(params: UpdateProfileParams) {
        return this.connection.sendRequest(UpdateProfileRequest.type, params);
    }

    sendGetSsoToken(params: GetSsoTokenParams) {
        return this.connection.sendRequest(GetSsoTokenRequest.type, params);
    }

    sendInvalidateSsoToken(params: InvalidateSsoTokenParams) {
        return this.connection.sendRequest(InvalidateSsoTokenRequest.type, params);
    }

    // ========================================
    // BIDIRECTIONAL: Either direction
    // ========================================
    onSsoTokenChanged(handler: NotificationHandler<SsoTokenChangedParams>) {
        this.connection.onNotification(SsoTokenChangedNotification.type, handler);
    }

    sendSsoTokenChanged(params: SsoTokenChangedParams) {
        return this.connection.sendNotification(SsoTokenChangedNotification.type, params);
    }
}
