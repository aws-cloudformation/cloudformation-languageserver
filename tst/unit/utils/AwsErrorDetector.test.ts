import { describe, it, expect } from 'vitest';
import { AwsErrorDetector } from '../../../src/utils/AwsErrorDetector';
import { OnlineFeatureErrorCode } from '../../../src/utils/OnlineFeatureError';

describe('AwsErrorDetector', () => {
    const detector = new AwsErrorDetector();

    describe('isPermissionError', () => {
        it('should detect AccessDenied error code', () => {
            const error = { code: 'AccessDenied', message: 'Access denied' };
            expect(detector.isPermissionError(error)).toBe(true);
        });

        it('should detect UnauthorizedOperation error name', () => {
            const error = { name: 'UnauthorizedOperation', message: 'Unauthorized' };
            expect(detector.isPermissionError(error)).toBe(true);
        });

        it('should detect 401 HTTP status code', () => {
            const error = { $metadata: { httpStatusCode: 401 }, message: 'Unauthorized' };
            expect(detector.isPermissionError(error)).toBe(true);
        });

        it('should detect 403 HTTP status code', () => {
            const error = { $metadata: { httpStatusCode: 403 }, message: 'Forbidden' };
            expect(detector.isPermissionError(error)).toBe(true);
        });

        it('should detect permission error in message', () => {
            const error = { name: 'SomeError', message: 'User is not authorized to perform this action' };
            expect(detector.isPermissionError(error)).toBe(true);
        });

        it('should not detect non-permission errors', () => {
            const error = { code: 'ValidationException', message: 'Invalid parameter' };
            expect(detector.isPermissionError(error)).toBe(false);
        });

        it('should not detect non-AWS errors', () => {
            const error = new Error('Network timeout');
            expect(detector.isPermissionError(error)).toBe(false);
        });
    });

    describe('createPermissionError', () => {
        it('should create ResponseError with correct structure', () => {
            const awsError = { code: 'AccessDenied', message: 'Access denied to resource' };
            const result = detector.createPermissionError(awsError, 'cloudformation', 'ListStacks');

            expect(result.code).toBe(OnlineFeatureErrorCode.AwsServiceError);
            expect(result.message).toContain('Access denied to resource');
            expect(result.data).toEqual({
                errorType: 'permission',
                service: 'cloudformation',
                operation: 'ListStacks',
                retryable: false,
            });
        });
    });
});
