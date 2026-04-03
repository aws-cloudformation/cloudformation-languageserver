import { RequestHandler } from 'vscode-languageserver';
import { GetSystemStatusResponse } from '../protocol/LspSystemHandlers';
import { ServerComponents } from '../server/ServerComponents';
import { handleLspError } from '../utils/Errors';

export function getSystemStatusHandler(
    components: ServerComponents,
): RequestHandler<void, GetSystemStatusResponse, void> {
    return (): GetSystemStatusResponse => {
        try {
            return {
                settingsReady: components.settingsManager.isReady(),
                schemasReady: components.schemaReadiness.isReady(),
                cfnLintReady: components.cfnLintService.isReady(),
                cfnGuardReady: components.guardService.isReady(),
                currentSettings: components.settingsManager.getCurrentSettings(),
            };
        } catch (error) {
            handleLspError(error, 'Failed to get system status');
        }
    };
}
