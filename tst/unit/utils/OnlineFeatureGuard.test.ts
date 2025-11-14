import { describe, expect, it } from 'vitest';
import { OnlineFeatureErrorCode } from '../../../src/utils/OnlineFeatureError';
import { OnlineFeatureGuard } from '../../../src/utils/OnlineFeatureGuard';

describe('OnlineFeatureGuard', () => {
    it('should pass when both internet and auth are available', () => {
        const onlineStatus = { isOnline: true };
        const awsCredentials = { credentialsAvailable: () => true };
        const guard = new OnlineFeatureGuard(onlineStatus as any, awsCredentials as any);

        expect(() => guard.check({ requiresInternet: true, requiresAuth: true })).not.toThrow();
    });

    it('should throw NoInternet when internet is required but not available', () => {
        const onlineStatus = { isOnline: false };
        const awsCredentials = { credentialsAvailable: () => true };
        const guard = new OnlineFeatureGuard(onlineStatus as any, awsCredentials as any);

        expect(() => guard.check({ requiresInternet: true, requiresAuth: true })).toThrow(
            expect.objectContaining({ code: OnlineFeatureErrorCode.NoInternet }),
        );
    });

    it('should throw NoAuthentication when auth is required but not available', () => {
        const onlineStatus = { isOnline: true };
        const awsCredentials = { credentialsAvailable: () => false };
        const guard = new OnlineFeatureGuard(onlineStatus as any, awsCredentials as any);

        expect(() => guard.check({ requiresInternet: true, requiresAuth: true })).toThrow(
            expect.objectContaining({ code: OnlineFeatureErrorCode.NoAuthentication }),
        );
    });

    it('should pass when internet is not required and not available', () => {
        const onlineStatus = { isOnline: false };
        const awsCredentials = { credentialsAvailable: () => true };
        const guard = new OnlineFeatureGuard(onlineStatus as any, awsCredentials as any);

        expect(() => guard.check({ requiresInternet: false, requiresAuth: true })).not.toThrow();
    });

    it('should pass when auth is not required and not available', () => {
        const onlineStatus = { isOnline: true };
        const awsCredentials = { credentialsAvailable: () => false };
        const guard = new OnlineFeatureGuard(onlineStatus as any, awsCredentials as any);

        expect(() => guard.check({ requiresInternet: true, requiresAuth: false })).not.toThrow();
    });

    it('should check internet before auth', () => {
        const onlineStatus = { isOnline: false };
        const awsCredentials = { credentialsAvailable: () => false };
        const guard = new OnlineFeatureGuard(onlineStatus as any, awsCredentials as any);

        expect(() => guard.check({ requiresInternet: true, requiresAuth: true })).toThrow(
            expect.objectContaining({ code: OnlineFeatureErrorCode.NoInternet }),
        );
    });
});
