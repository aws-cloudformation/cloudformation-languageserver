import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { extractErrorMessage } from './Errors';
import { createOnlineFeatureError, OnlineFeatureErrorCode } from './OnlineFeatureError';

type AwsError = {
    name?: string;
    code?: string;
    $metadata?: {
        httpStatusCode?: number;
    };
    message?: string;
};

const CREDENTIAL_ERROR_NAMES = new Set([
    'CredentialsProviderError',
    'InvalidSignatureException',
    'SignatureDoesNotMatch',
    'InvalidClientTokenId',
    'UnrecognizedClientException',
    'ExpiredToken',
    'ExpiredTokenException',
]);

const NETWORK_ERROR_NAMES = new Set([
    'NetworkingError',
    'TimeoutError',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ECONNRESET',
]);

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function isAwsError(error: unknown): error is AwsError {
    return typeof error === 'object' && error !== null && ('name' in error || '$metadata' in error);
}

function isCredentialError(error: AwsError): boolean {
    if (
        (error.name && CREDENTIAL_ERROR_NAMES.has(error.name)) ||
        (error.code && CREDENTIAL_ERROR_NAMES.has(error.code))
    ) {
        return true;
    }

    const statusCode = error.$metadata?.httpStatusCode;
    return statusCode === 401;
}

function isNetworkError(error: AwsError): boolean {
    return (
        (error.name !== undefined && NETWORK_ERROR_NAMES.has(error.name)) ||
        (error.code !== undefined && NETWORK_ERROR_NAMES.has(error.code))
    );
}

function isRetryableAwsError(error: AwsError): boolean {
    const statusCode = error.$metadata?.httpStatusCode;
    return statusCode !== undefined && RETRYABLE_STATUS_CODES.has(statusCode);
}

export function mapAwsErrorToLspError(error: unknown): ResponseError<unknown> {
    if (error instanceof ResponseError) {
        return error;
    }

    if (isAwsError(error)) {
        if (isCredentialError(error)) {
            return createOnlineFeatureError(
                OnlineFeatureErrorCode.ExpiredCredentials,
                'AWS credentials are invalid or expired. Please re-authenticate.',
                { retryable: false, requiresReauth: true },
            );
        }

        if (isNetworkError(error)) {
            return createOnlineFeatureError(
                OnlineFeatureErrorCode.NoInternet,
                'Network error occurred while contacting AWS. Please check your internet connection.',
                { retryable: true, requiresReauth: false },
            );
        }

        return createOnlineFeatureError(
            OnlineFeatureErrorCode.AwsServiceError,
            `AWS service error: ${error.message ?? extractErrorMessage(error)}`,
            { retryable: isRetryableAwsError(error), requiresReauth: false },
        );
    }

    return new ResponseError(ErrorCodes.InternalError, extractErrorMessage(error));
}
