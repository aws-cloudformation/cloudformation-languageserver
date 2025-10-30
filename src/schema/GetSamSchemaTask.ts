import { DataStore } from '../datastore/DataStore';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { extractErrorMessage } from '../utils/Errors';
import { downloadFile } from './RemoteSchemaHelper';
import { SamSchemaTransformer, SamSchema } from './SamSchemaTransformer';

const logger = LoggerFactory.getLogger('GetSamSchemaTask');

export class GetSamSchemaTask {
    private static readonly SAM_SCHEMA_URL =
        'https://raw.githubusercontent.com/aws/serverless-application-model/refs/heads/main/schema_source/sam.schema.json';
    private static readonly SAM_SCHEMA_KEY = 'sam-schemas';

    @Measure({ name: 'getSamSchema' })
    async run(dataStore: DataStore): Promise<void> {
        try {
            logger.info('Downloading SAM schema');

            const schemaBuffer = await downloadFile(GetSamSchemaTask.SAM_SCHEMA_URL);
            const samSchema = JSON.parse(schemaBuffer.toString()) as Record<string, unknown>;

            const resourceSchemas = SamSchemaTransformer.transformSamSchema(samSchema as unknown as SamSchema);

            // Store each resource schema individually
            for (const [resourceType, schema] of resourceSchemas) {
                await dataStore.put(`${GetSamSchemaTask.SAM_SCHEMA_KEY}:${resourceType}`, JSON.stringify(schema));
            }

            logger.info(`Downloaded and stored ${resourceSchemas.size} SAM resource schemas`);
        } catch (error) {
            logger.error({ error: extractErrorMessage(error) }, 'Failed to download SAM schema');
            throw error;
        }
    }

    static getSamSchemas(dataStore: DataStore): Map<string, unknown> {
        const schemas = new Map<string, unknown>();

        // Get all SAM schema keys
        const keys = dataStore.keys(1000);
        const samKeys = keys.filter((key: string) => key.startsWith(`${this.SAM_SCHEMA_KEY}:`));

        for (const key of samKeys) {
            const schemaJson = dataStore.get<string>(key);
            if (schemaJson) {
                const resourceType = key.replace(`${this.SAM_SCHEMA_KEY}:`, '');
                schemas.set(resourceType, JSON.parse(schemaJson) as unknown);
            }
        }

        return schemas;
    }
}
