import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { AwsCredentials } from '../auth/AwsCredentials';
import { DataStore } from '../datastore/DataStore';
import { CfnService } from '../services/CfnService';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Measure, Telemetry } from '../telemetry/TelemetryDecorator';
import { AwsRegion } from '../utils/Region';
import { downloadFile } from '../utils/RemoteDownload';
import { PrivateSchemas, PrivateSchemasType, PrivateStoreKey } from './PrivateSchemas';
import { RegionalSchemas, RegionalSchemasType, SchemaFileType } from './RegionalSchemas';
import { cfnResourceSchemaLink, unZipFile } from './RemoteSchemaHelper';

export abstract class GetSchemaTask {
    protected abstract runImpl(dataStore: DataStore): Promise<void>;

    async run(dataStore: DataStore) {
        await this.runImpl(dataStore);
    }
}

export class GetPublicSchemaTask extends GetSchemaTask {
    private readonly logger = LoggerFactory.getLogger(GetPublicSchemaTask);

    @Telemetry()
    private readonly telemetry!: ScopedTelemetry;

    static readonly MaxAttempts = 3;
    private attempts = 0;

    constructor(
        readonly region: AwsRegion,
        private readonly getSchemas: (region: AwsRegion) => Promise<SchemaFileType[]>,
        private readonly firstCreatedMs?: number,
    ) {
        super();
    }

    @Measure({ name: 'getSchemas' })
    protected override async runImpl(dataStore: DataStore) {
        this.telemetry.count(`getSchemas.maxAttempt.fault`, 0, {
            attributes: {
                region: this.region,
            },
        });

        if (this.attempts >= GetPublicSchemaTask.MaxAttempts) {
            this.telemetry.count(`getSchemas.maxAttempt.fault`, 1, {
                attributes: {
                    region: this.region,
                },
            });
            this.logger.error(`Reached max attempts for retrieving schemas for ${this.region} without success`);
            return;
        }

        this.attempts++;
        this.telemetry.count(`getSchemas.${this.region}`, 1);
        const schemas = await this.getSchemas(this.region);
        const value: RegionalSchemasType = {
            version: RegionalSchemas.V1,
            region: this.region,
            schemas: schemas,
            firstCreatedMs: this.firstCreatedMs ?? Date.now(),
            lastModifiedMs: Date.now(),
        };

        await dataStore.put<RegionalSchemasType>(this.region, value);
        this.logger.info(`${schemas.length} public schemas retrieved for ${this.region}`);
    }
}

export class GetPrivateSchemasTask extends GetSchemaTask {
    private readonly logger = LoggerFactory.getLogger(GetPrivateSchemasTask);

    constructor(private readonly getSchemas: () => Promise<DescribeTypeOutput[]>) {
        super();
    }

    @Measure({ name: 'getSchemas' })
    protected override async runImpl(dataStore: DataStore) {
        try {
            const schemas: DescribeTypeOutput[] = await this.getSchemas();

            const value: PrivateSchemasType = {
                version: PrivateSchemas.V1,
                identifier: PrivateStoreKey,
                schemas: schemas,
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            };

            await dataStore.put<PrivateSchemasType>(PrivateStoreKey, value);

            this.logger.info(`${schemas.length} private schemas retrieved`);
        } catch (error) {
            this.logger.error(error, 'Failed to get private schemas');
            throw error;
        }
    }
}

export function getRemotePublicSchemas(region: AwsRegion): Promise<SchemaFileType[]> {
    return unZipFile(downloadFile(cfnResourceSchemaLink(region)));
}

export function getRemotePrivateSchemas(
    awsCredentials: AwsCredentials,
    cfnService: CfnService,
): Promise<DescribeTypeOutput[]> {
    if (awsCredentials.credentialsAvailable()) {
        return cfnService.getAllPrivateResourceSchemas();
    }

    return Promise.resolve([]);
}
