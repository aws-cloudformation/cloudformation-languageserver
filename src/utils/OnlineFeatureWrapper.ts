import { RequestHandler, ServerRequestHandler } from 'vscode-languageserver';
import { mapAwsErrorToLspError } from './AwsErrorMapper';
import { OnlineFeatureGuard, OnlinePrerequisites } from './OnlineFeatureGuard';

const DEFAULT_PREREQUISITES: OnlinePrerequisites = {
    requiresInternet: true,
    requiresAuth: true,
};

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
export function withOnlineGuard<P, R, E = void>(
    guard: OnlineFeatureGuard,
    handler: RequestHandler<P, R, E> | ServerRequestHandler<P, R, never, E>,
    prerequisites: Partial<OnlinePrerequisites> = {},
) {
    return async (params: P, token: any, workDoneProgress?: any, resultProgress?: any) => {
        guard.check({ ...DEFAULT_PREREQUISITES, ...prerequisites });
        try {
            return await (handler as any)(params, token, workDoneProgress, resultProgress);
        } catch (error) {
            throw mapAwsErrorToLspError(error);
        }
    };
}
