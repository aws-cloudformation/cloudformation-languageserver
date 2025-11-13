import { LspWorkspace } from '../protocol/LspWorkspace';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

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
                        logger.error(error, `Failed to mount folder ${folder.name}`);
                    }
                }
            })
            .catch((error) => {
                logger.error(error, `Failed to initialize server`);
            });
    };
}
