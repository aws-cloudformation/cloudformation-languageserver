import { describe, expect, it, vi } from 'vitest';
import { ResponseError } from 'vscode-languageserver';
import { OnlineFeatureErrorCode } from '../../../src/utils/OnlineFeatureError';
import { withOnlineGuard } from '../../../src/utils/OnlineFeatureWrapper';

describe('withOnlineGuard', () => {
    it('should throw when guard check fails', async () => {
        const error = new ResponseError(OnlineFeatureErrorCode.NoInternet, 'No internet');
        const guard = {
            check: vi.fn().mockImplementation(() => {
                throw error;
            }),
        };
        const handler = vi.fn();

        const wrapped = withOnlineGuard(guard as any, handler as any);

        await expect(wrapped('params', 'token')).rejects.toThrow(error);
        expect(handler).not.toHaveBeenCalled();
    });

    it('should map AWS errors to LSP errors', async () => {
        const guard = { check: vi.fn() };
        const awsError = {
            name: 'ExpiredTokenException',
            message: 'Token expired',
        };
        const handler = vi.fn().mockRejectedValue(awsError);

        const wrapped = withOnlineGuard(guard as any, handler as any);

        await expect(wrapped('params', 'token')).rejects.toMatchObject({
            code: OnlineFeatureErrorCode.ExpiredCredentials,
            message: 'AWS credentials are invalid or expired. Please re-authenticate.',
        });
    });

    it('should pass all handler parameters through', async () => {
        const guard = { check: vi.fn() };
        const handler = vi.fn().mockResolvedValue('result');

        const wrapped = withOnlineGuard(guard as any, handler as any);
        await wrapped('params', 'token', 'workDone', 'resultProgress');

        expect(handler).toHaveBeenCalledWith('params', 'token', 'workDone', 'resultProgress');
    });

    it('should detect and transform permission errors', async () => {
        const guard = { check: vi.fn() };
        const permissionError = {
            code: 'AccessDenied',
            message: 'User is not authorized to perform: cloudformation:ListStacks',
        };
        const handler = vi.fn().mockRejectedValue(permissionError);

        const wrapped = withOnlineGuard(guard as any, handler as any);

        await expect(wrapped()).rejects.toMatchObject({
            code: OnlineFeatureErrorCode.AwsServiceError,
            data: {
                errorType: 'permission',
                service: 'aws',
                operation: 'unknown',
                retryable: false,
            },
        });

        // Verify the message contains the original error info (pretty-printed object)
        await expect(wrapped()).rejects.toHaveProperty('message');
        const error = await wrapped().catch((e: any) => e);
        expect(error.message).toContain('AccessDenied');
        expect(error.message).toContain('User is not authorized to perform: cloudformation:ListStacks');
    });
});
