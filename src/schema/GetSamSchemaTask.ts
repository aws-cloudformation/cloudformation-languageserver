import { DataStore } from '../datastore/DataStore';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Measure, Telemetry } from '../telemetry/TelemetryDecorator';
import { isClientNetworkError } from '../utils/Errors';
import { downloadJson } from '../utils/RemoteDownload';
import { GetSchemaTask } from './GetSchemaTask';
import { SamSchemas, SamSchemasType, SamStoreKey } from './SamSchemas';
import { CloudFormationResourceSchema, SamSchema, SamSchemaTransformer } from './SamSchemaTransformer';

export class GetSamSchemaTask extends GetSchemaTask {
    private readonly logger = LoggerFactory.getLogger(GetSamSchemaTask);

    @Telemetry()
    private readonly telemetry!: ScopedTelemetry;

    constructor(
        private readonly getSamSchemas: () => Promise<Map<string, CloudFormationResourceSchema>>,
        private readonly firstCreatedMs?: number,
    ) {
        super();
    }

    @Measure({ name: 'getSchemas' })
    protected override async runImpl(dataStore: DataStore): Promise<void> {
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
                firstCreatedMs: this.firstCreatedMs ?? Date.now(),
                lastModifiedMs: Date.now(),
            };

            await dataStore.put(SamStoreKey, samSchemasData);

            this.logger.info(`${resourceSchemas.size} SAM schemas downloaded and saved`);
        } catch (error) {
            if (isClientNetworkError(error)) {
                this.telemetry.count('getSchemas.clientNetworkError', 1);
                this.logger.info('Skipping SAM schemas due to client network error');
                return;
            }
            this.logger.error(error, 'Failed to download SAM schemas');
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
