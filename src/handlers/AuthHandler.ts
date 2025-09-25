import { RequestHandler, NotificationHandler } from 'vscode-languageserver/node';
import { UpdateCredentialsParams, SsoTokenChangedParams } from '../auth/AwsLspAuthTypes';
import { ServerComponents } from '../server/ServerComponents';

export function iamCredentialsUpdateHandler(
    components: ServerComponents,
): RequestHandler<UpdateCredentialsParams, void, void> {
    return (params: UpdateCredentialsParams) => {
        // AwsCredentials.handleIamCredentialsUpdate already calls settingsManager.updateProfileSettings
        // which will notify all subscribed components via the observable pattern
        components.awsCredentials.handleIamCredentialsUpdate(params);
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
