import { DidChangeConfigurationParams } from 'vscode-languageserver';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';

const log = LoggerFactory.getLogger('ConfigurationHandler');

export function configurationHandler(components: ServerComponents): (params: DidChangeConfigurationParams) => void {
    return (params: DidChangeConfigurationParams): void => {
        log.debug({
            Handler: 'Configuration',
            Settings: params.settings, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
        });

        // Pull configuration from LSP workspace and notify all components via subscriptions (fire-and-forget)
        components.settingsManager.syncConfiguration().catch((error) => {
            log.error(`Failed to sync configuration: ${extractErrorMessage(error)}`);
        });
    };
}
