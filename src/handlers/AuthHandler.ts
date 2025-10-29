import { RequestHandler, NotificationHandler } from 'vscode-languageserver/node';
import { UpdateCredentialsParams, UpdateCredentialsResult, SsoTokenChangedParams } from '../auth/AwsLspAuthTypes';
import { ServerComponents } from '../server/ServerComponents';

export function iamCredentialsUpdateHandler(
    components: ServerComponents,
): RequestHandler<UpdateCredentialsParams, UpdateCredentialsResult, void> {
    return async (params: UpdateCredentialsParams): Promise<UpdateCredentialsResult> => {
        const success = await components.awsCredentials.handleIamCredentialsUpdate(params);
        return { success };
    };
}

export function bearerCredentialsUpdateHandler(
    components: ServerComponents,
): RequestHandler<UpdateCredentialsParams, void, void> {
    return (params: UpdateCredentialsParams) => {
        components.awsCredentials.handleBearerCredentialsUpdate(params);
    };
}

export function iamCredentialsDeleteHandler(components: ServerComponents): NotificationHandler<void> {
    return () => {
        components.awsCredentials.handleIamCredentialsDelete();
    };
}

export function bearerCredentialsDeleteHandler(components: ServerComponents): NotificationHandler<void> {
    return () => {
        components.awsCredentials.handleBearerCredentialsDelete();
    };
}

export function ssoTokenChangedHandler(components: ServerComponents): NotificationHandler<SsoTokenChangedParams> {
    return (params: SsoTokenChangedParams) => {
        components.awsCredentials.handleSsoTokenChanged(params);
    };
}
