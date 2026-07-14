import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { CredentialsProviderError } from './ErrorClasses';
import { extractErrorCode, extractErrorMessage } from './ErrorUtils';
import { isClientNetworkError } from './GenericErrorMapper';
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
    CredentialsProviderError.name,
    'InvalidSignatureException',
    'SignatureDoesNotMatch',
    'InvalidClientTokenId',
    'UnrecognizedClientException',
    'ExpiredToken',
    'ExpiredTokenException',
]);

const AWS_NETWORK_ERROR_NAMES = new Set(['NetworkingError', 'TimeoutError']);

const PERMISSION_ERROR_NAMES = new Set([
    'AccessDenied',
    'AccessDeniedException',
    'ForbiddenException',
    'NotAuthorizedException',
    'OperationNotPermittedException',
    'UnauthorizedException',
    'UnauthorizedOperation',
]);

const THROTTLING_ERROR_NAMES = new Set([
    'BandwidthLimitExceeded',
    'EC2ThrottledException',
    'ProvisionedThroughputExceededException',
    'RequestLimitExceeded',
    'RequestThrottled',
    'RequestThrottledException',
    'SlowDown',
    'Throttling',
    'ThrottlingException',
    'TooManyRequestsException',
]);

const NOT_FOUND_ERROR_NAMES = new Set([
    'ChangeSetNotFoundException',
    'NoSuchBucket',
    'NoSuchEntity',
    'NoSuchEntityException',
    'NoSuchKey',
    'NotFound',
    'NotFoundException',
    'ResourceNotFoundException',
    'StackNotFoundException',
    'TypeNotFoundException',
]);

const CONFLICT_ERROR_NAMES = new Set([
    'AlreadyExistsException',
    'ConcurrentModificationException',
    'ConflictException',
    'OperationInProgressException',
    'ResourceConflictException',
]);

const VALIDATION_ERROR_NAMES = new Set([
    'BadRequestException',
    'InvalidInputException',
    'InvalidParameterCombination',
    'InvalidParameterException',
    'InvalidParameterValueException',
    'InvalidRequestException',
    'MalformedPolicyDocument',
    'MalformedPolicyDocumentException',
    'SerializationException',
    'UnknownAction',
    'ValidationError',
    'ValidationException',
]);

const KNOWN_AWS_ERROR_NAMES = new Set([
    ...CREDENTIAL_ERROR_NAMES,
    ...AWS_NETWORK_ERROR_NAMES,
    ...PERMISSION_ERROR_NAMES,
    ...THROTTLING_ERROR_NAMES,
    ...NOT_FOUND_ERROR_NAMES,
    ...CONFLICT_ERROR_NAMES,
    ...VALIDATION_ERROR_NAMES,
]);

const VALIDATION_STATUS_CODES = new Set([400, 422]);
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function isErrorLike(error: unknown): error is AwsError {
    return typeof error === 'object' && error !== null && ('name' in error || '$metadata' in error);
}

function hasErrorIdentifier(error: AwsError, identifiers: Set<string>): boolean {
    const code = extractErrorCode(error);
    return (error.name !== undefined && identifiers.has(error.name)) || (code !== undefined && identifiers.has(code));
}

function isAwsError(error: unknown): error is AwsError {
    if (!isErrorLike(error)) {
        return false;
    }

    return '$metadata' in error || hasErrorIdentifier(error, KNOWN_AWS_ERROR_NAMES);
}

function isCredentialError(error: AwsError): boolean {
    return hasErrorIdentifier(error, CREDENTIAL_ERROR_NAMES) || error.$metadata?.httpStatusCode === 401;
}

function isAwsNetworkError(error: AwsError): boolean {
    return hasErrorIdentifier(error, AWS_NETWORK_ERROR_NAMES);
}

function isNetworkError(error: AwsError): boolean {
    return isAwsNetworkError(error) || isClientNetworkError(error);
}

function isRetryableAwsError(error: AwsError): boolean {
    const statusCode = error.$metadata?.httpStatusCode;
    return (
        classifyAwsError(error).category === 'throttling' ||
        (statusCode !== undefined && RETRYABLE_STATUS_CODES.has(statusCode))
    );
}

export type AwsErrorCategory =
    | 'conflict'
    | 'credentials'
    | 'network'
    | 'not_found'
    | 'permissions'
    | 'service'
    | 'throttling'
    | 'unknown'
    | 'validation';

export function classifyAwsError(error: unknown): { category: AwsErrorCategory; httpStatus?: number } {
    if (!isAwsError(error)) {
        return { category: 'unknown' };
    }

    const httpStatus = error.$metadata?.httpStatusCode;

    if (isCredentialError(error)) {
        return { category: 'credentials', httpStatus };
    }
    if (isAwsNetworkError(error)) {
        return { category: 'network', httpStatus };
    }
    if (hasErrorIdentifier(error, PERMISSION_ERROR_NAMES) || httpStatus === 403) {
        return { category: 'permissions', httpStatus };
    }
    if (hasErrorIdentifier(error, THROTTLING_ERROR_NAMES) || httpStatus === 429) {
        return { category: 'throttling', httpStatus };
    }
    if (hasErrorIdentifier(error, NOT_FOUND_ERROR_NAMES) || httpStatus === 404) {
        return { category: 'not_found', httpStatus };
    }
    if (hasErrorIdentifier(error, CONFLICT_ERROR_NAMES) || httpStatus === 409) {
        return { category: 'conflict', httpStatus };
    }
    if (hasErrorIdentifier(error, VALIDATION_ERROR_NAMES) || (httpStatus && VALIDATION_STATUS_CODES.has(httpStatus))) {
        return { category: 'validation', httpStatus };
    }
    if (httpStatus !== undefined) {
        return { category: 'service', httpStatus };
    }

    return { category: 'unknown' };
}

const CLIENT_FAULT_CATEGORIES: ReadonlySet<AwsErrorCategory> = new Set([
    'conflict',
    'credentials',
    'network',
    'not_found',
    'permissions',
    'validation',
]);

export function isClientError(error: unknown): boolean {
    const { category, httpStatus } = classifyAwsError(error);
    if (CLIENT_FAULT_CATEGORIES.has(category)) {
        return true;
    }
    if (category === 'service') {
        return httpStatus !== undefined && httpStatus < 500;
    }
    return category === 'unknown' && isClientNetworkError(error);
}

export function mapAwsErrorToLspError(error: unknown): ResponseError<unknown> {
    if (error instanceof ResponseError) {
        return error;
    }

    if (isErrorLike(error)) {
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
