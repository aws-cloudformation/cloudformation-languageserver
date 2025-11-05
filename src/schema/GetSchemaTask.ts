import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { Logger } from 'pino';
import { AwsCredentials } from '../auth/AwsCredentials';
import { DataStore } from '../datastore/DataStore';
import { CfnService } from '../services/CfnService';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Measure, Telemetry } from '../telemetry/TelemetryDecorator';
import { AwsRegion } from '../utils/Region';
import { downloadFile } from '../utils/RemoteDownload';
import { PrivateSchemas, PrivateSchemasType } from './PrivateSchemas';
import { RegionalSchemas, RegionalSchemasType, SchemaFileType } from './RegionalSchemas';
import { cfnResourceSchemaLink, unZipFile } from './RemoteSchemaHelper';

export abstract class GetSchemaTask {
    protected abstract runImpl(dataStore: DataStore, logger?: Logger): Promise<void>;

    async run(dataStore: DataStore, logger?: Logger) {
        await this.runImpl(dataStore, logger);
    }
}

export class GetPublicSchemaTask extends GetSchemaTask {
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
    override async runImpl(dataStore: DataStore, logger?: Logger) {
        if (this.attempts >= GetPublicSchemaTask.MaxAttempts) {
            logger?.error(`Reached max attempts for retrieving schemas for ${this.region} without success`);
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
        logger?.info(`${schemas.length} resource schemas retrieved for ${this.region}`);
    }
}

export class GetPrivateSchemasTask extends GetSchemaTask {
    private readonly processedProfiles = new Set<string>();

    constructor(
        private readonly getSchemas: () => Promise<DescribeTypeOutput[]>,
        private readonly getProfile: () => string,
    ) {
        super();
    }

    @Measure({ name: 'getSchemas' })
    override async runImpl(dataStore: DataStore, logger?: Logger) {
        try {
            const profile = this.getProfile();
            if (this.processedProfiles.has(profile)) {
                return;
            }

            const schemas: DescribeTypeOutput[] = await this.getSchemas();

            const value: PrivateSchemasType = {
                version: PrivateSchemas.V1,
                identifier: profile,
                schemas: schemas,
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            };

            await dataStore.put<PrivateSchemasType>(profile, value);

            this.processedProfiles.add(profile);
            if (schemas.length > 0) {
                void logger?.info(`${schemas.length} private registry schemas retrieved for profile: ${profile}`);
            } else {
                logger?.info(`No private registry schemas found for profile: ${profile}`);
            }
        } catch (error) {
            logger?.error(error, `Failed to get private schemas`);
            throw error;
        }
    }
}

export function getRemotePublicSchemas(region: AwsRegion) {
    return unZipFile(downloadFile(cfnResourceSchemaLink(region)));
}

export function getRemotePrivateSchemas(awsCredentials: AwsCredentials, cfnService: CfnService) {
    if (awsCredentials.credentialsAvailable()) {
        return cfnService.getAllPrivateResourceSchemas();
    }

    return Promise.resolve([]);
}
