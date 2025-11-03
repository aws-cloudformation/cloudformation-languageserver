import { DataStore } from '../datastore/DataStore';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { extractErrorMessage } from '../utils/Errors';
import { downloadFile } from './RemoteSchemaHelper';
import { SamSchemas, SamSchemasType } from './SamSchemas';
import { SamSchemaTransformer, SamSchema } from './SamSchemaTransformer';

const logger = LoggerFactory.getLogger('GetSamSchemaTask');

export class GetSamSchemaTask {
    private static readonly SAM_SCHEMA_URL =
        'https://raw.githubusercontent.com/aws/serverless-application-model/refs/heads/main/schema_source/sam.schema.json';

    @Measure({ name: 'getSamSchema' })
    async run(dataStore: DataStore): Promise<void> {
        try {
            logger.info('Downloading SAM schema');

            const schemaBuffer = await downloadFile(GetSamSchemaTask.SAM_SCHEMA_URL);
            const samSchema = JSON.parse(schemaBuffer.toString()) as Record<string, unknown>;

            const resourceSchemas = SamSchemaTransformer.transformSamSchema(samSchema as unknown as SamSchema);

            // Convert to SamSchemasType format
            const schemas = [...resourceSchemas.entries()].map(([resourceType, schema]) => ({
                name: resourceType,
                content: JSON.stringify(schema),
                createdMs: Date.now(),
            }));

            const samSchemasData: SamSchemasType = {
                version: SamSchemas.V1,
                schemas: schemas,
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            };

            await dataStore.put('sam-schemas', samSchemasData);

            logger.info(`Downloaded and stored ${resourceSchemas.size} SAM resource schemas`);
        } catch (error) {
            logger.error({ error: extractErrorMessage(error) }, 'Failed to download SAM schema');
            throw error;
        }
    }
}
