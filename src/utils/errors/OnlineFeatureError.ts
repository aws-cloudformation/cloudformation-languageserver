import { ResponseError } from 'vscode-languageserver';

export enum OnlineFeatureErrorCode {
    NoInternet = -32_001,
    NoAuthentication = -32_002,
    ExpiredCredentials = -32_003,
    AwsServiceError = -32_004,
}

export interface OnlineFeatureErrorData {
    retryable: boolean;
    requiresReauth: boolean;
}

export function createOnlineFeatureError(
    code: OnlineFeatureErrorCode,
    message: string,
    data?: Partial<OnlineFeatureErrorData>,
): ResponseError<OnlineFeatureErrorData> {
    return new ResponseError(code, message, {
        retryable: data?.retryable ?? false,
        requiresReauth: data?.requiresReauth ?? false,
    });
}
