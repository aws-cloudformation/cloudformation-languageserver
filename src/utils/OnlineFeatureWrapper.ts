import { LoggerFactory } from '../telemetry/LoggerFactory';
import { AwsErrorDetector } from './AwsErrorDetector';
import { mapAwsErrorToLspError } from './AwsErrorMapper';
import { OnlineFeatureGuard } from './OnlineFeatureGuard';

const log = LoggerFactory.getLogger('withOnlineGuard');
const errorDetector = new AwsErrorDetector();

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
type Handler = (...args: any[]) => any;

export function withOnlineGuard<T extends Handler>(guard: OnlineFeatureGuard, handler: T): T {
    return (async (...args: any[]) => {
        guard.check();
        try {
            return await handler(...args);
        } catch (error) {
            log.error(error, `Online feature guard check failed`);

            // Check for permission errors first
            if (errorDetector.isPermissionError(error)) {
                throw errorDetector.createPermissionError(error, 'aws', 'unknown');
            }

            // Handle other errors with existing mapper
            throw mapAwsErrorToLspError(error);
        }
    }) as T;
}
