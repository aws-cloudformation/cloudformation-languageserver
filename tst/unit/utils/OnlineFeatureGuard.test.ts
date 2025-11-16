import { describe, expect, it } from 'vitest';
import { AwsCredentials } from '../../../src/auth/AwsCredentials';
import { OnlineStatus } from '../../../src/services/OnlineStatus';
import { OnlineFeatureErrorCode } from '../../../src/utils/OnlineFeatureError';
import { OnlineFeatureGuard } from '../../../src/utils/OnlineFeatureGuard';

describe('OnlineFeatureGuard', () => {
    it('should pass when both internet and auth are available', async () => {
        const onlineStatus = { checkNow: () => Promise.resolve(true) } as OnlineStatus;
        const awsCredentials = { credentialsAvailable: () => true } as AwsCredentials;
        const guard = new OnlineFeatureGuard(onlineStatus, awsCredentials);

        await expect(guard.check({ requiresInternet: true, requiresAuth: true })).resolves.not.toThrow();
    });

    it('should throw NoInternet when internet is required but not available', async () => {
        const onlineStatus = { checkNow: () => Promise.resolve(false) } as OnlineStatus;
        const awsCredentials = { credentialsAvailable: () => true } as AwsCredentials;
        const guard = new OnlineFeatureGuard(onlineStatus, awsCredentials);

        await expect(guard.check({ requiresInternet: true, requiresAuth: true })).rejects.toThrow(
            expect.objectContaining({ code: OnlineFeatureErrorCode.NoInternet }),
        );
    });

    it('should throw NoAuthentication when auth is required but not available', async () => {
        const onlineStatus = { checkNow: () => Promise.resolve(true) } as OnlineStatus;
        const awsCredentials = { credentialsAvailable: () => false } as AwsCredentials;
        const guard = new OnlineFeatureGuard(onlineStatus, awsCredentials);

        await expect(guard.check({ requiresInternet: true, requiresAuth: true })).rejects.toThrow(
            expect.objectContaining({ code: OnlineFeatureErrorCode.NoAuthentication }),
        );
    });

    it('should pass when internet is not required and not available', async () => {
        const onlineStatus = { checkNow: () => Promise.resolve(false) } as OnlineStatus;
        const awsCredentials = { credentialsAvailable: () => true } as AwsCredentials;
        const guard = new OnlineFeatureGuard(onlineStatus, awsCredentials);

        await expect(guard.check({ requiresInternet: false, requiresAuth: true })).resolves.not.toThrow();
    });

    it('should pass when auth is not required and not available', async () => {
        const onlineStatus = { checkNow: () => Promise.resolve(true) } as OnlineStatus;
        const awsCredentials = { credentialsAvailable: () => false } as AwsCredentials;
        const guard = new OnlineFeatureGuard(onlineStatus, awsCredentials);

        await expect(guard.check({ requiresInternet: true, requiresAuth: false })).resolves.not.toThrow();
    });

    it('should check internet before auth', async () => {
        const onlineStatus = { checkNow: () => Promise.resolve(false) } as OnlineStatus;
        const awsCredentials = { credentialsAvailable: () => false } as AwsCredentials;
        const guard = new OnlineFeatureGuard(onlineStatus, awsCredentials);

        await expect(guard.check({ requiresInternet: true, requiresAuth: true })).rejects.toThrow(
            expect.objectContaining({ code: OnlineFeatureErrorCode.NoInternet }),
        );
    });
});
