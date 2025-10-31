import { DidChangeConfigurationParams } from 'vscode-languageserver';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';

const log = LoggerFactory.getLogger('ConfigurationHandler');

export function configurationHandler(components: ServerComponents): (params: DidChangeConfigurationParams) => void {
    return (_params: DidChangeConfigurationParams): void => {
        // Pull configuration from LSP workspace and notify all components via subscriptions (fire-and-forget)
        components.settingsManager.syncConfiguration().catch((error) => {
            TelemetryService.instance.get('ConfigurationHandler').count('count', 1);
            log.error(error, `Failed to sync configuration`);
        });
    };
}
