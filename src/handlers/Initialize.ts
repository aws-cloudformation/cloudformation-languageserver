import { LspWorkspace } from '../protocol/LspWorkspace';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const logger = LoggerFactory.getLogger('InitializedHandler');

export function initializedHandler(workspace: LspWorkspace, components: ServerComponents): () => void {
    return (): void => {
        components.settingsManager
            .syncConfiguration()
            .then(() => {
                components.schemaRetriever.initialize();
                return components.cfnLintService.initialize();
            })
            .then(async () => {
                let mountingSucceeded = true;
                let mountingError = '';

                // Process folders sequentially to avoid overwhelming the system
                for (const folder of workspace.getAllWorkspaceFolders()) {
                    try {
                        await components.cfnLintService.mountFolder(folder);
                    } catch (error) {
                        logger.error(error, `Failed to mount folder ${folder.name}`);
                        mountingSucceeded = false;
                        mountingError = `Failed to mount folder ${folder.name}: ${error instanceof Error ? error.message : String(error)}`;
                    }
                }

                if (mountingSucceeded) {
                    components.cfnLintService.setReadinessStatus({ ready: true });
                } else {
                    components.cfnLintService.setReadinessStatus({ ready: false, reason: mountingError });
                }
            })
            .catch((error: unknown) => {
                logger.error(error, `Failed to initialize server`);
            });
    };
}
