import { describe, it, expect } from 'vitest';
import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { classifyAwsError, isClientError, mapAwsErrorToLspError } from '../../../../src/utils/errors/AwsErrorMapper';
import { OnlineFeatureErrorCode } from '../../../../src/utils/errors/OnlineFeatureError';

describe('mapAwsErrorToLspError', () => {
    it('should return ResponseError as-is', () => {
        const error = new ResponseError(ErrorCodes.InvalidRequest, 'test');
        const result = mapAwsErrorToLspError(error);
        expect(result).toBe(error);
    });

    it('should map credential errors to ExpiredCredentials', () => {
        const error = { name: 'ExpiredToken', message: 'Token expired' };
        const result = mapAwsErrorToLspError(error);
        expect(result.code).toBe(OnlineFeatureErrorCode.ExpiredCredentials);
        expect(result.data).toEqual({ retryable: false, requiresReauth: true });
    });

    it('should map 401 status to ExpiredCredentials', () => {
        const error = { $metadata: { httpStatusCode: 401 }, message: 'Unauthorized' };
        const result = mapAwsErrorToLspError(error);
        expect(result.code).toBe(OnlineFeatureErrorCode.ExpiredCredentials);
    });

    it('should map 403 status to AwsServiceError', () => {
        const error = { $metadata: { httpStatusCode: 403 }, message: 'Forbidden' };
        const result = mapAwsErrorToLspError(error);
        expect(result.code).toBe(OnlineFeatureErrorCode.AwsServiceError);
    });

    it('should map network errors to NoInternet', () => {
        const awsNetworkError = { name: 'NetworkingError', message: 'Network failed' };
        const genericNetworkError = Object.assign(new Error('getaddrinfo failed'), { code: 'ENOTFOUND' });

        const awsResult = mapAwsErrorToLspError(awsNetworkError);
        const genericResult = mapAwsErrorToLspError(genericNetworkError);

        expect(awsResult.code).toBe(OnlineFeatureErrorCode.NoInternet);
        expect(awsResult.data).toEqual({ retryable: true, requiresReauth: false });
        expect(genericResult.code).toBe(OnlineFeatureErrorCode.NoInternet);
    });

    it('should map timeout errors to NoInternet', () => {
        const error = { name: 'TimeoutError', message: 'Request timed out' };
        const result = mapAwsErrorToLspError(error);
        expect(result.code).toBe(OnlineFeatureErrorCode.NoInternet);
    });

    it('should map AWS service errors to AwsServiceError', () => {
        const error = { name: 'ValidationException', message: 'Invalid input' };
        const result = mapAwsErrorToLspError(error);
        expect(result.code).toBe(OnlineFeatureErrorCode.AwsServiceError);
        expect(result.message).toContain('Invalid input');
    });

    it('should mark 429 as retryable', () => {
        const error = { $metadata: { httpStatusCode: 429 }, message: 'Too many requests' };
        const result = mapAwsErrorToLspError(error);
        expect(result.code).toBe(OnlineFeatureErrorCode.AwsServiceError);
        expect((result.data as any)?.retryable).toBe(true);
    });

    it('should mark named throttling at HTTP 400 as retryable', () => {
        const error = {
            name: 'Throttling',
            message: 'Rate exceeded',
            $metadata: { httpStatusCode: 400 },
        };

        const result = mapAwsErrorToLspError(error);

        expect(result.code).toBe(OnlineFeatureErrorCode.AwsServiceError);
        expect((result.data as any)?.retryable).toBe(true);
    });

    it('should mark 500 as retryable', () => {
        const error = { $metadata: { httpStatusCode: 500 }, message: 'Internal error' };
        const result = mapAwsErrorToLspError(error);
        expect((result.data as any)?.retryable).toBe(true);
    });

    it('should map unknown errors to AwsServiceError', () => {
        const error = new Error('Unknown error');
        const result = mapAwsErrorToLspError(error);
        expect(result.code).toBe(OnlineFeatureErrorCode.AwsServiceError);
        expect(result.message).toContain('Unknown error');
    });
});

describe('classifyAwsError', () => {
    it.each([
        ['AccessDenied', 'permissions'],
        ['AccessDeniedException', 'permissions'],
        ['UnauthorizedOperation', 'permissions'],
        ['Throttling', 'throttling'],
        ['ThrottlingException', 'throttling'],
        ['TooManyRequestsException', 'throttling'],
        ['ValidationError', 'validation'],
        ['ValidationException', 'validation'],
        ['ResourceNotFoundException', 'not_found'],
        ['TypeNotFoundException', 'not_found'],
        ['ConflictException', 'conflict'],
        ['AlreadyExistsException', 'conflict'],
    ])('should classify %s as %s', (name, category) => {
        expect(classifyAwsError({ name }).category).toBe(category);
    });

    it.each([
        [400, 'validation'],
        [401, 'credentials'],
        [403, 'permissions'],
        [404, 'not_found'],
        [409, 'conflict'],
        [422, 'validation'],
        [429, 'throttling'],
        [500, 'service'],
    ])('should classify HTTP %i as %s', (httpStatusCode, category) => {
        expect(classifyAwsError({ $metadata: { httpStatusCode } }).category).toBe(category);
    });

    it('should use the wire error code when the name is generic', () => {
        const error = { name: 'Error', code: 'RequestLimitExceeded', $metadata: { httpStatusCode: 400 } };

        expect(classifyAwsError(error).category).toBe('throttling');
    });

    it('should classify throttling before generic HTTP 400 validation', () => {
        const error = { name: 'Throttling', $metadata: { httpStatusCode: 400 } };

        expect(classifyAwsError(error).category).toBe('throttling');
    });

    it('should classify a named not-found error before its nonstandard HTTP 400 status', () => {
        const error = { name: 'ResourceNotFoundException', $metadata: { httpStatusCode: 400 } };

        expect(classifyAwsError(error).category).toBe('not_found');
    });

    it('should not classify a generic Node network error as an AWS error', () => {
        const error = Object.assign(new Error('getaddrinfo failed'), { code: 'ENOTFOUND' });

        expect(classifyAwsError(error).category).toBe('unknown');
    });
});

describe('isClientError', () => {
    it('should return true for credential errors', () => {
        expect(isClientError({ name: 'ExpiredToken' })).toBe(true);
        expect(isClientError({ name: 'CredentialsProviderError' })).toBe(true);
    });

    it('should return true for AWS network errors', () => {
        expect(isClientError({ name: 'NetworkingError' })).toBe(true);
        expect(isClientError({ name: 'TimeoutError' })).toBe(true);
    });

    it('should return true for generic client network errors', () => {
        expect(isClientError(Object.assign(new Error('getaddrinfo failed'), { code: 'ENOTFOUND' }))).toBe(true);
    });

    it('should return true for permission errors', () => {
        expect(isClientError({ name: 'AccessDeniedException', $metadata: { httpStatusCode: 403 } })).toBe(true);
    });

    it.each([
        ['ValidationException', 400],
        ['ResourceNotFoundException', 404],
        ['ConflictException', 409],
    ])('should return true for client AWS error %s', (name, httpStatusCode) => {
        expect(isClientError({ name, $metadata: { httpStatusCode } })).toBe(true);
    });

    it('should return false for 5xx service errors', () => {
        expect(isClientError({ $metadata: { httpStatusCode: 500 } })).toBe(false);
        expect(isClientError({ $metadata: { httpStatusCode: 503 } })).toBe(false);
    });

    it.each([
        ['ThrottlingException', 429],
        ['Throttling', 400],
    ])('should return false for throttling error %s at HTTP %i', (name, httpStatusCode) => {
        expect(isClientError({ name, $metadata: { httpStatusCode } })).toBe(false);
    });

    it('should return false for non-AWS errors', () => {
        expect(isClientError(new Error('random'))).toBe(false);
    });
});
