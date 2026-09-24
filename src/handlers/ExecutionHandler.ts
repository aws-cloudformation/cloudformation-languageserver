import { ExecuteCommandParams, ServerRequestHandler } from 'vscode-languageserver';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';
import { getRegion } from '../utils/Region';

export function executionHandler(
    components: ServerComponents,
): ServerRequestHandler<ExecuteCommandParams, unknown, never, void> {
    const { commands } = components;

    return (params): unknown => {
        TelemetryService.instance.get('ExecutionHandler').count('count', 1);
        TelemetryService.instance.get('ExecutionHandler').count(`count.${params.command}`, 1);

        switch (params.command) {
            case commands.clearDiagnostic: {
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
            case commands.trackCodeActionAccepted: {
                const args = params.arguments ?? [];
                if (args.length > 0) {
                    const actionType = args[0] as string;
                    TelemetryService.instance.get('CodeAction').count(`accepted.${actionType}`, 1);
                }
                break;
            }
            case commands.updateRegion: {
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
