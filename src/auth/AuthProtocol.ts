import { MessageDirection, NotificationType } from 'vscode-languageserver';
import { RequestType } from 'vscode-languageserver-protocol';
import { UpdateCredentialsParams, UpdateCredentialsResult } from './AwsLspAuthTypes';

export const IamCredentialsUpdateRequest = Object.freeze({
    method: 'aws/credentials/iam/update' as const,
    messageDirection: MessageDirection.clientToServer,
    type: new RequestType<UpdateCredentialsParams, UpdateCredentialsResult, void>('aws/credentials/iam/update'),
} as const);

export const IamCredentialsDeleteNotification = Object.freeze({
    method: 'aws/credentials/iam/delete' as const,
    messageDirection: MessageDirection.clientToServer,
    type: new NotificationType<void>('aws/credentials/iam/delete'),
} as const);
