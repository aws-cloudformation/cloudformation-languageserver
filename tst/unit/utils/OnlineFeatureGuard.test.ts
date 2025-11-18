import { describe, expect, it } from 'vitest';
import { AwsCredentials } from '../../../src/auth/AwsCredentials';
import { OnlineFeatureErrorCode } from '../../../src/utils/OnlineFeatureError';
import { OnlineFeatureGuard } from '../../../src/utils/OnlineFeatureGuard';

describe('OnlineFeatureGuard', () => {
    it('should pass when auth is available', () => {
        const awsCredentials = { credentialsAvailable: () => true } as AwsCredentials;
        const guard = new OnlineFeatureGuard(awsCredentials);

        expect(() => guard.check()).not.toThrow();
    });

    it('should throw NoAuthentication when auth is required but not available', () => {
        const awsCredentials = { credentialsAvailable: () => false } as AwsCredentials;
        const guard = new OnlineFeatureGuard(awsCredentials);

        expect(() => guard.check()).toThrow(expect.objectContaining({ code: OnlineFeatureErrorCode.NoAuthentication }));
    });
});
