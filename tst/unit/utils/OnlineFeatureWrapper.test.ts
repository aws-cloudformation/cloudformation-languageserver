import { describe, expect, it, vi } from 'vitest';
import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { OnlineFeatureErrorCode } from '../../../src/utils/errors/OnlineFeatureError';
import { handleLspError } from '../../../src/utils/errors/ErrorUtils';
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

    it('should map AWS errors wrapped by a handler to LSP errors', async () => {
        const guard = { check: vi.fn() };
        const awsError = Object.assign(new Error('Token expired'), { name: 'ExpiredTokenException' });
        const handler = vi.fn(() => handleLspError(awsError, 'Failed to list resources'));

        const wrapped = withOnlineGuard(guard as any, handler as any);

        await expect(wrapped('params', 'token')).rejects.toMatchObject({
            code: OnlineFeatureErrorCode.ExpiredCredentials,
            message: 'AWS credentials are invalid or expired. Please re-authenticate.',
        });
    });

    it('should map network errors wrapped by a handler to LSP errors', async () => {
        const guard = { check: vi.fn() };
        const networkError = Object.assign(new Error('getaddrinfo failed'), { code: 'ENOTFOUND' });
        const handler = vi.fn(() => handleLspError(networkError, 'Failed to list resources'));

        const wrapped = withOnlineGuard(guard as any, handler as any);

        await expect(wrapped('params', 'token')).rejects.toMatchObject({
            code: OnlineFeatureErrorCode.NoInternet,
            message: 'Network error occurred while contacting AWS. Please check your internet connection.',
        });
    });

    it('should preserve a handler InternalError when its cause is not an online feature error', async () => {
        const guard = { check: vi.fn() };
        const handler = vi.fn(() => handleLspError(new Error('local failure'), 'Request failed'));

        const wrapped = withOnlineGuard(guard as any, handler as any);

        await expect(wrapped('params', 'token')).rejects.toMatchObject({
            code: ErrorCodes.InternalError,
            message: 'Request failed: local failure',
        });
    });

    it('should preserve InvalidParams when a handler maps a TypeError', async () => {
        const guard = { check: vi.fn() };
        const handler = vi.fn(() => handleLspError(new TypeError('Invalid parameters'), 'Request failed'));

        const wrapped = withOnlineGuard(guard as any, handler as any);

        await expect(wrapped('params', 'token')).rejects.toMatchObject({
            code: ErrorCodes.InvalidParams,
            message: 'Invalid parameters',
        });
    });

    it('should pass all handler parameters through', async () => {
        const guard = { check: vi.fn() };
        const handler = vi.fn().mockResolvedValue('result');

        const wrapped = withOnlineGuard(guard as any, handler as any);
        await wrapped('params', 'token', 'workDone', 'resultProgress');

        expect(handler).toHaveBeenCalledWith('params', 'token', 'workDone', 'resultProgress');
    });
});
