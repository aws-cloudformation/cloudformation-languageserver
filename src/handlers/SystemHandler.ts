import { ErrorCodes, ResponseError, RequestHandler } from 'vscode-languageserver';
import { ServerComponents } from '../server/ServerComponents';
import { GetSystemStatusResponse } from '../system/SystemTypes';
import { extractErrorMessage } from '../utils/Errors';

export function getSystemStatusHandler(
    components: ServerComponents,
): RequestHandler<void, GetSystemStatusResponse, void> {
    return (): GetSystemStatusResponse => {
        try {
            const availableRegions = components.schemaStore.getPublicSchemaRegions();

            return {
                schemasReady: {
                    availableRegions: [...availableRegions],
                    totalRegions: availableRegions.length,
                    ready: availableRegions.length > 0,
                    ...(availableRegions.length === 0 ? { reason: 'No schemas loaded' } : {}),
                },
                cfnLintReady: components.cfnLintService.getReadinessStatus(),
                cfnGuardReady: components.guardService.getReadinessStatus(),
                appliedSettings: components.settingsManager.getAppliedSettings(),
            };
        } catch (error) {
            throw new ResponseError(
                ErrorCodes.InternalError,
                `Failed to get system status: ${extractErrorMessage(error)}`,
            );
        }
    };
}
