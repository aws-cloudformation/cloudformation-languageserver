import { describe, expect, it, vi } from 'vitest';
import { ResponseError } from 'vscode-languageserver';
import { OnlineFeatureErrorCode } from '../../../src/utils/OnlineFeatureError';
import { withOnlineFeatures } from '../../../src/utils/OnlineFeatureWrapper';

describe('withOnlineFeatures', () => {
    it('should execute operation when prerequisites are met', async () => {
        const guard = { check: vi.fn() };
        const operation = vi.fn().mockResolvedValue('success');

        const result = await withOnlineFeatures(guard as any, operation);

        expect(guard.check).toHaveBeenCalledWith({ requiresInternet: true, requiresAuth: true });
        expect(operation).toHaveBeenCalled();
        expect(result).toBe('success');
    });

    it('should use default prerequisites', async () => {
        const guard = { check: vi.fn() };
        const operation = vi.fn().mockResolvedValue('success');

        await withOnlineFeatures(guard as any, operation);

        expect(guard.check).toHaveBeenCalledWith({ requiresInternet: true, requiresAuth: true });
    });

    it('should allow overriding prerequisites', async () => {
        const guard = { check: vi.fn() };
        const operation = vi.fn().mockResolvedValue('success');

        await withOnlineFeatures(guard as any, operation, { requiresAuth: false });

        expect(guard.check).toHaveBeenCalledWith({ requiresInternet: true, requiresAuth: false });
    });

    it('should throw when prerequisites check fails', async () => {
        const error = new ResponseError(OnlineFeatureErrorCode.NoInternet, 'No internet');
        const guard = {
            check: vi.fn().mockImplementation(() => {
                throw error;
            }),
        };
        const operation = vi.fn();

        await expect(withOnlineFeatures(guard as any, operation)).rejects.toEqual(error);
        expect(operation).not.toHaveBeenCalled();
    });

    it('should map AWS errors to LSP errors', async () => {
        const guard = { check: vi.fn() };
        const awsError = { name: 'ExpiredToken', message: 'Token expired' };
        const operation = vi.fn().mockRejectedValue(awsError);

        await expect(withOnlineFeatures(guard as any, operation)).rejects.toMatchObject({
            code: OnlineFeatureErrorCode.ExpiredCredentials,
        });
    });

    it('should pass through ResponseError', async () => {
        const guard = { check: vi.fn() };
        const error = new ResponseError(-32000, 'Custom error');
        const operation = vi.fn().mockRejectedValue(error);

        await expect(withOnlineFeatures(guard as any, operation)).rejects.toBe(error);
    });
});
