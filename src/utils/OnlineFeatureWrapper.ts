import { mapAwsErrorToLspError } from './AwsErrorMapper';
import { OnlineFeatureGuard, OnlinePrerequisites } from './OnlineFeatureGuard';

const DEFAULT_PREREQUISITES: OnlinePrerequisites = {
    requiresInternet: true,
    requiresAuth: true,
};

export async function withOnlineFeatures<T>(
    guard: OnlineFeatureGuard,
    operation: () => Promise<T>,
    prerequisites: Partial<OnlinePrerequisites> = {},
): Promise<T> {
    guard.check({ ...DEFAULT_PREREQUISITES, ...prerequisites });
    try {
        return await operation();
    } catch (error) {
        throw mapAwsErrorToLspError(error);
    }
}
