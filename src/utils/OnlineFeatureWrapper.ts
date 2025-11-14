import { mapAwsErrorToLspError } from './AwsErrorMapper';
import { OnlineFeatureGuard, OnlinePrerequisites } from './OnlineFeatureGuard';

const DEFAULT_PREREQUISITES: OnlinePrerequisites = {
    requiresInternet: true,
    requiresAuth: true,
};

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
type Handler = (...args: any[]) => any;

export function withOnlineGuard<T extends Handler>(
    guard: OnlineFeatureGuard,
    handler: T,
    prerequisites: Partial<OnlinePrerequisites> = {},
): T {
    return (async (...args: any[]) => {
        guard.check({ ...DEFAULT_PREREQUISITES, ...prerequisites });
        try {
            return await handler(...args);
        } catch (error) {
            throw mapAwsErrorToLspError(error);
        }
    }) as T;
}
