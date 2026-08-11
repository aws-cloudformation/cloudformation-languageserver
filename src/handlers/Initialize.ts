import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const logger = LoggerFactory.getLogger('InitializedHandler');

export function initializedHandler(components: ServerComponents): () => void {
    return (): void => {
        components.settingsManager
            .syncConfiguration()
            .then(() => {
                return components.schemaRetriever.initialize();
            })
            .catch((error: unknown) => {
                logger.error(error, `Failed to initialize server`);
            });
    };
}
