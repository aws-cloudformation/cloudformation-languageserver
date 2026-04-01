import { ErrorCodes, ResponseError, RequestHandler } from 'vscode-languageserver';
import { ServerComponents } from '../server/ServerComponents';
import { GetSystemStatusResponse } from '../system/SystemTypes';
import { extractErrorMessage } from '../utils/Errors';

export function getSystemStatusHandler(
    components: ServerComponents,
): RequestHandler<void, GetSystemStatusResponse, void> {
    return (): GetSystemStatusResponse => {
        try {
            const settingsStatus = components.settingsManager.getReadinessStatus();

            if (!settingsStatus.ready) {
                const reason = settingsStatus.reason ?? 'Server initializing';
                return {
                    settingsReady: settingsStatus,
                    schemasReady: { ready: false, reason, availableRegions: [] },
                    cfnLintReady: { ready: false, reason },
                    cfnGuardReady: { ready: false, reason },
                    currentSettings: components.settingsManager.getCurrentSettings(),
                };
            }

            const availableRegions = components.schemaStore.getPublicSchemaRegions();
            return {
                settingsReady: settingsStatus,
                schemasReady: {
                    availableRegions: [...availableRegions],
                    ready: availableRegions.length > 0,
                    ...(availableRegions.length === 0 ? { reason: 'No schemas loaded' } : {}),
                },
                cfnLintReady: components.cfnLintService.getReadinessStatus(),
                cfnGuardReady: components.guardService.getReadinessStatus(),
                currentSettings: components.settingsManager.getCurrentSettings(),
            };
        } catch (error) {
            throw new ResponseError(
                ErrorCodes.InternalError,
                `Failed to get system status: ${extractErrorMessage(error)}`,
            );
        }
    };
}
