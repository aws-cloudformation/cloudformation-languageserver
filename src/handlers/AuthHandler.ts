import { RequestHandler } from 'vscode-languageserver/node';
import { NotificationHandler } from 'vscode-languageserver-protocol';
import { UpdateCredentialsParams, UpdateCredentialsResult } from '../auth/AwsLspAuthTypes';
import { ServerComponents } from '../server/ServerComponents';

export function iamCredentialsUpdateHandler(
    components: ServerComponents,
): RequestHandler<UpdateCredentialsParams, UpdateCredentialsResult, void> {
    return async (params: UpdateCredentialsParams): Promise<UpdateCredentialsResult> => {
        const success = await components.awsCredentials.handleIamCredentialsUpdate(params);
        return { success };
    };
}

export function iamCredentialsDeleteHandler(components: ServerComponents): NotificationHandler<void> {
    return () => {
        components.awsCredentials.handleIamCredentialsDelete();
    };
}
