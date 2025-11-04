import { DataStore } from '../datastore/DataStore';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { GetSchemaTask } from './GetSchemaTask';
import { downloadJson } from './RemoteSchemaHelper';
import { SamSchemas, SamSchemasType, SamStoreKey } from './SamSchemas';
import { SamSchemaTransformer, SamSchema } from './SamSchemaTransformer';

const logger = LoggerFactory.getLogger('GetSamSchemaTask');

export class GetSamSchemaTask extends GetSchemaTask {
    private static readonly SAM_SCHEMA_URL =
        'https://raw.githubusercontent.com/aws/serverless-application-model/refs/heads/main/schema_source/sam.schema.json';

    @Measure({ name: 'getSchemas' })
    override async runImpl(dataStore: DataStore): Promise<void> {
        try {
            logger.info('Downloading SAM schema');

            const samSchema = await downloadJson<Record<string, unknown>>(GetSamSchemaTask.SAM_SCHEMA_URL);

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

            await dataStore.put(SamStoreKey, samSchemasData);

            logger.info(`Downloaded and stored ${resourceSchemas.size} SAM resource schemas`);
        } catch (error) {
            logger.error(error, 'Failed to download SAM schema');
            throw error;
        }
    }
}
