import { AwsCredentials } from '../auth/AwsCredentials';
import { createOnlineFeatureError, OnlineFeatureErrorCode } from './OnlineFeatureError';

export class OnlineFeatureGuard {
    constructor(private readonly awsCredentials: AwsCredentials) {}

    check(): void {
        if (!this.awsCredentials.credentialsAvailable()) {
            throw createOnlineFeatureError(
                OnlineFeatureErrorCode.NoAuthentication,
                'AWS credentials required for this operation. Please configure your AWS credentials.',
                { retryable: false, requiresReauth: true },
            );
        }
    }
}
