import { DataStore } from '../datastore/DataStore';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { downloadJson } from '../utils/RemoteDownload';
import { GetSchemaTask } from './GetSchemaTask';
import { SamSchemas, SamSchemasType, SamStoreKey } from './SamSchemas';
import { CloudFormationResourceSchema, SamSchema, SamSchemaTransformer } from './SamSchemaTransformer';

const logger = LoggerFactory.getLogger('GetSamSchemaTask');

export class GetSamSchemaTask extends GetSchemaTask {
    constructor(private readonly getSamSchemas: () => Promise<Map<string, CloudFormationResourceSchema>>) {
        super();
    }

    @Measure({ name: 'getSchemas' })
    override async runImpl(dataStore: DataStore): Promise<void> {
        try {
            const resourceSchemas = await this.getSamSchemas();

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

export async function getSamSchemas(): Promise<Map<string, CloudFormationResourceSchema>> {
    const SAM_SCHEMA_URL =
        'https://raw.githubusercontent.com/aws/serverless-application-model/refs/heads/develop/samtranslator/schema/schema.json';

    const samSchema = await downloadJson<SamSchema>(SAM_SCHEMA_URL);
    return SamSchemaTransformer.transformSamSchema(samSchema);
}
