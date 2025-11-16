import { AwsCredentials } from '../auth/AwsCredentials';
import { OnlineStatus } from '../services/OnlineStatus';
import { createOnlineFeatureError, OnlineFeatureErrorCode } from './OnlineFeatureError';

export interface OnlinePrerequisites {
    requiresInternet: boolean;
    requiresAuth: boolean;
}

export class OnlineFeatureGuard {
    constructor(
        private readonly onlineStatus: OnlineStatus,
        private readonly awsCredentials: AwsCredentials,
    ) {}

    async check(prerequisites: OnlinePrerequisites): Promise<void> {
        if (prerequisites.requiresInternet) {
            const isOnline = await this.onlineStatus.checkNow();
            if (!isOnline) {
                throw createOnlineFeatureError(
                    OnlineFeatureErrorCode.NoInternet,
                    'Internet connection required for this operation. Please check your network connection.',
                    { retryable: true, requiresReauth: false },
                );
            }
        }

        if (prerequisites.requiresAuth && !this.awsCredentials.credentialsAvailable()) {
            throw createOnlineFeatureError(
                OnlineFeatureErrorCode.NoAuthentication,
                'AWS credentials required for this operation. Please configure your AWS credentials.',
                { retryable: false, requiresReauth: true },
            );
        }
    }
}
