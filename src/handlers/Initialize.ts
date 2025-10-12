import { LspWorkspace } from '../protocol/LspWorkspace';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';

const logger = LoggerFactory.getLogger('InitializedHandler');

export function initializedHandler(workspace: LspWorkspace, components: ServerComponents): () => void {
    return (): void => {
        // Sync configuration from LSP workspace first, then initialize CfnLintService
        components.settingsManager
            .syncConfiguration()
            .then(() => {
                return components.cfnLintService.initialize();
            })
            .then(async () => {
                // Process folders sequentially to avoid overwhelming the system
                for (const folder of workspace.getAllWorkspaceFolders()) {
                    try {
                        // Properly await the async mountFolder method
                        await components.cfnLintService.mountFolder(folder);
                    } catch (error) {
                        logger.error(`Failed to mount folder ${folder.name}: ${extractErrorMessage(error)}`);
                    }
                }
            })
            .catch((error: unknown) => {
                logger.error(`Failed to initialize server: ${extractErrorMessage(error)}`);
            });
    };
}
