import { ExecuteCommandParams, ServerRequestHandler } from 'vscode-languageserver';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';
import { getRegion } from '../utils/Region';

export function executionHandler(
    components: ServerComponents,
): ServerRequestHandler<ExecuteCommandParams, unknown, never, void> {
    return (params): unknown => {
        TelemetryService.instance.get('ExecutionHandler').count('count', 1);
        TelemetryService.instance.get('ExecutionHandler').count(`count.${params.command}`, 1);

        switch (params.command) {
            case CLEAR_DIAGNOSTIC: {
                const args = params.arguments ?? [];
                if (args.length >= 2) {
                    const uri = args[0] as string;
                    const diagnosticId = args[1] as string;
                    components.diagnosticCoordinator
                        .handleClearCfnDiagnostic(uri, diagnosticId)
                        .catch((err) =>
                            LoggerFactory.getLogger('ExecutionHandler').error(err, `Error clearing diagnostic`),
                        );
                    TelemetryService.instance.get('CodeAction').count(`accepted.clearDiagnostic`, 1);
                }
                break;
            }
            case TRACK_CODE_ACTION_ACCEPTED: {
                const args = params.arguments ?? [];
                if (args.length > 0) {
                    const actionType = args[0] as string;
                    TelemetryService.instance.get('CodeAction').count(`accepted.${actionType}`, 1);
                }
                break;
            }
            case UPDATE_REGION: {
                const args = params.arguments ?? [];
                if (args.length > 0) {
                    components.awsCredentials.handleIamCredentialsDelete();
                    components.settingsManager.updateRegion(getRegion(args[0]));
                }
                break;
            }
            default: {
                // do nothing
                return;
            }
        }
    };
}

export const CLEAR_DIAGNOSTIC = '/command/template/clear-diagnostic';
export const TRACK_CODE_ACTION_ACCEPTED = '/command/codeAction/track';
export const UPDATE_REGION = '/command/region/update';
