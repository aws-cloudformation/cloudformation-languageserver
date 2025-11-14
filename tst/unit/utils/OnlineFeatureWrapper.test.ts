import { describe, expect, it, vi } from 'vitest';
import { ResponseError } from 'vscode-languageserver';
import { OnlineFeatureErrorCode } from '../../../src/utils/OnlineFeatureError';
import { withOnlineGuard } from '../../../src/utils/OnlineFeatureWrapper';

describe('withOnlineGuard', () => {
    it('should check prerequisites before calling handler', async () => {
        const guard = { check: vi.fn() };
        const handler = vi.fn().mockResolvedValue('result');

        const wrapped = withOnlineGuard(guard as any, handler as any);
        const result = await wrapped('params', 'token');

        expect(guard.check).toHaveBeenCalledWith({ requiresInternet: true, requiresAuth: true });
        expect(handler).toHaveBeenCalledWith('params', 'token');
        expect(result).toBe('result');
    });

    it('should allow overriding prerequisites', async () => {
        const guard = { check: vi.fn() };
        const handler = vi.fn().mockResolvedValue('result');

        const wrapped = withOnlineGuard(guard as any, handler as any, { requiresAuth: false });
        await wrapped('params', 'token');

        expect(guard.check).toHaveBeenCalledWith({ requiresInternet: true, requiresAuth: false });
    });

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
});
