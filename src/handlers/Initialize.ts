import { ServerComponents } from '../server/ServerComponents';
import { extractErrorMessage } from '../utils/Errors';

export function initializedHandler(components: ServerComponents): () => void {
    return (): void => {
        // Sync configuration from LSP workspace first, then initialize CfnLintService
        components.settingsManager
            .syncConfiguration()
            .then(() => {
                return components.cfnLintService.initialize();
            })
            .then(async () => {
                // Process folders sequentially to avoid overwhelming the system
                for (const folder of components.workspace.getAllWorkspaceFolders()) {
                    try {
                        // Properly await the async mountFolder method
                        await components.cfnLintService.mountFolder(folder);
                    } catch (error) {
                        components.clientMessage.error(
                            `Failed to mount folder ${folder.name}: ${extractErrorMessage(error)}`,
                        );
                    }
                }
            })
            .catch((error: unknown) => {
                components.clientMessage.error(`Failed to initialize server: ${extractErrorMessage(error)}`);
            });
    };
}
