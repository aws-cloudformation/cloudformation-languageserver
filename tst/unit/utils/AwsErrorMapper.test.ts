import { describe, it, expect } from 'vitest';
import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { mapAwsErrorToLspError } from '../../../src/utils/AwsErrorMapper';
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

    it('should map 403 status to ExpiredCredentials', () => {
        const error = { $metadata: { httpStatusCode: 403 }, message: 'Forbidden' };
        const result = mapAwsErrorToLspError(error);
        expect(result.code).toBe(OnlineFeatureErrorCode.ExpiredCredentials);
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
