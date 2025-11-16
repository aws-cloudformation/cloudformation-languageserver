import { LoggerFactory } from '../telemetry/LoggerFactory';
import { mapAwsErrorToLspError } from './AwsErrorMapper';
import { OnlineFeatureGuard, OnlinePrerequisites } from './OnlineFeatureGuard';
import { toString } from './String';

const DEFAULT_PREREQUISITES: OnlinePrerequisites = {
    requiresInternet: true,
    requiresAuth: true,
};

const log = LoggerFactory.getLogger('withOnlineGuard');

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
            log.error(error, `Online feature guard check failed with prerequisites: ${toString(prerequisites)}`);
            throw mapAwsErrorToLspError(error);
        }
    }) as T;
}
