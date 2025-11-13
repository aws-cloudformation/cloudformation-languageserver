import { DataStore } from '../datastore/DataStore';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { GetSchemaTask } from './GetSchemaTask';
import { SamSchemas, SamSchemasType, SamStoreKey } from './SamSchemas';
import { SamSchemaTransformer, SamSchema } from './SamSchemaTransformer';

const logger = LoggerFactory.getLogger('GetSamSchemaTask');

export class GetSamSchemaTask extends GetSchemaTask {
    constructor(private readonly getSamSchemas: () => Promise<SamSchema>) {
        super();
    }

    @Measure({ name: 'getSchemas' })
    override async runImpl(dataStore: DataStore): Promise<void> {
        try {
            const samSchema = await this.getSamSchemas();
            const resourceSchemas = SamSchemaTransformer.transformSamSchema(samSchema);

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

            logger.info(`${resourceSchemas.size} SAM schemas downloaded and stored`);
        } catch (error) {
            logger.error(error, 'Failed to download SAM schema');
            throw error;
        }
    }
}
