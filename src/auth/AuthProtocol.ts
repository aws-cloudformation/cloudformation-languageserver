import {
    MessageDirection,
    ProtocolRequestType,
    ProtocolNotificationType,
    ProtocolRequestType0,
} from 'vscode-languageserver';
import {
    UpdateCredentialsParams,
    ConnectionMetadata,
    ListProfilesParams,
    ListProfilesResult,
    UpdateProfileParams,
    UpdateProfileResult,
    GetSsoTokenParams,
    GetSsoTokenResult,
    InvalidateSsoTokenParams,
    InvalidateSsoTokenResult,
    SsoTokenChangedParams,
} from './AwsLspAuthTypes';

// AWS Credential Requests
export const IamCredentialsUpdateRequest = Object.freeze({
    method: 'aws/credentials/iam/update' as const,
    messageDirection: MessageDirection.clientToServer,
    type: new ProtocolRequestType<UpdateCredentialsParams, void, never, void, void>('aws/credentials/iam/update'),
} as const);

export const BearerCredentialsUpdateRequest = Object.freeze({
    method: 'aws/credentials/token/update' as const,
    messageDirection: MessageDirection.clientToServer,
    type: new ProtocolRequestType<UpdateCredentialsParams, void, never, void, void>('aws/credentials/token/update'),
} as const);

export const GetConnectionMetadataRequest = Object.freeze({
    method: 'aws/credentials/getConnectionMetadata' as const,
    messageDirection: MessageDirection.serverToClient,
    type: new ProtocolRequestType0<ConnectionMetadata | null, never, void, void>(
        'aws/credentials/getConnectionMetadata',
    ),
} as const);

// AWS Credential Notifications
export const IamCredentialsDeleteNotification = Object.freeze({
    method: 'aws/credentials/iam/delete' as const,
    messageDirection: MessageDirection.clientToServer,
    type: new ProtocolNotificationType<void, void>('aws/credentials/iam/delete'),
} as const);

export const BearerCredentialsDeleteNotification = Object.freeze({
    method: 'aws/credentials/token/delete' as const,
    messageDirection: MessageDirection.clientToServer,
    type: new ProtocolNotificationType<void, void>('aws/credentials/token/delete'),
} as const);

// AWS Identity Requests
export const ListProfilesRequest = Object.freeze({
    method: 'aws/identity/listProfiles' as const,
    messageDirection: MessageDirection.serverToClient,
    type: new ProtocolRequestType<ListProfilesParams, ListProfilesResult | null, never, void, void>(
        'aws/identity/listProfiles',
    ),
} as const);

export const UpdateProfileRequest = Object.freeze({
    method: 'aws/identity/updateProfile' as const,
    messageDirection: MessageDirection.serverToClient,
    type: new ProtocolRequestType<UpdateProfileParams, UpdateProfileResult | null, never, void, void>(
        'aws/identity/updateProfile',
    ),
} as const);

export const GetSsoTokenRequest = Object.freeze({
    method: 'aws/identity/getSsoToken' as const,
    messageDirection: MessageDirection.serverToClient,
    type: new ProtocolRequestType<GetSsoTokenParams, GetSsoTokenResult | null, never, void, void>(
        'aws/identity/getSsoToken',
    ),
} as const);

export const InvalidateSsoTokenRequest = Object.freeze({
    method: 'aws/identity/invalidateSsoToken' as const,
    messageDirection: MessageDirection.serverToClient,
    type: new ProtocolRequestType<InvalidateSsoTokenParams, InvalidateSsoTokenResult | null, never, void, void>(
        'aws/identity/invalidateSsoToken',
    ),
} as const);

// AWS Identity Notifications
export const SsoTokenChangedNotification = Object.freeze({
    method: 'aws/identity/ssoTokenChanged' as const,
    messageDirection: MessageDirection.both,
    type: new ProtocolNotificationType<SsoTokenChangedParams, void>('aws/identity/ssoTokenChanged'),
} as const);
