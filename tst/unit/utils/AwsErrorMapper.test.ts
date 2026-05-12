import { describe, it, expect } from 'vitest';
import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { classifyAwsError, isClientError, mapAwsErrorToLspError } from '../../../src/utils/AwsErrorMapper';
import { OnlineFeatureErrorCode } from '../../../src/utils/OnlineFeatureError';

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
        const error = { name: 'NetworkingError', message: 'Network failed' };
        const result = mapAwsErrorToLspError(error);
        expect(result.code).toBe(OnlineFeatureErrorCode.NoInternet);
        expect(result.data).toEqual({ retryable: true, requiresReauth: false });
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
    it('should classify AccessDenied as permissions', () => {
        const error = { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } };
        const result = classifyAwsError(error);
        expect(result.category).toBe('permissions');
    });

    it('should classify AccessDeniedException as permissions', () => {
        const error = { name: 'AccessDeniedException', $metadata: { httpStatusCode: 403 } };
        const result = classifyAwsError(error);
        expect(result.category).toBe('permissions');
    });
});

describe('isClientError', () => {
    it('should return true for credential errors', () => {
        expect(isClientError({ name: 'ExpiredToken' })).toBe(true);
        expect(isClientError({ name: 'CredentialsProviderError' })).toBe(true);
    });

    it('should return true for network errors', () => {
        expect(isClientError({ name: 'NetworkingError' })).toBe(true);
        expect(isClientError({ name: 'TimeoutError' })).toBe(true);
    });

    it('should return true for permission errors', () => {
        expect(isClientError({ name: 'AccessDeniedException', $metadata: { httpStatusCode: 403 } })).toBe(true);
    });

    it('should return true for 4xx service errors', () => {
        expect(isClientError({ name: 'ValidationException', $metadata: { httpStatusCode: 400 } })).toBe(true);
    });

    it('should return false for 5xx service errors', () => {
        expect(isClientError({ $metadata: { httpStatusCode: 500 } })).toBe(false);
        expect(isClientError({ $metadata: { httpStatusCode: 503 } })).toBe(false);
    });

    it('should return false for throttling errors', () => {
        expect(isClientError({ name: 'ThrottlingException', $metadata: { httpStatusCode: 429 } })).toBe(false);
    });

    it('should return false for non-AWS errors', () => {
        expect(isClientError(new Error('random'))).toBe(false);
    });
});
