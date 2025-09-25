import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { MessageType } from 'vscode-languageserver';
import { DataStore } from '../datastore/DataStore';
import { ClientMessage } from '../telemetry/ClientMessage';
import { CoralTelemetry } from '../telemetry/CoralTelemetry';
import { MeasureLatency, Telemetry, TrackExecution } from '../telemetry/TelemetryDecorator';
import { extractErrorMessage } from '../utils/Errors';
import { AwsRegion } from '../utils/Region';
import { PrivateSchemas, PrivateSchemasType } from './PrivateSchemas';
import { RegionalSchemas, RegionalSchemasType, SchemaFileType } from './RegionalSchemas';

abstract class GetSchemaTask {
    @Telemetry
    protected readonly telemetry!: CoralTelemetry;

    protected abstract runImpl(dataStore: DataStore, clientMessage?: ClientMessage): Promise<void>;

    @MeasureLatency()
    @TrackExecution()
    async run(dataStore: DataStore, clientMessage?: ClientMessage) {
        await this.runImpl(dataStore, clientMessage);
    }
}

export class GetPublicSchemaTask extends GetSchemaTask {
    static readonly MaxAttempts = 3;
    private attempts = 0;

    constructor(
        readonly region: AwsRegion,
        private readonly getSchemas: (region: AwsRegion) => Promise<SchemaFileType[]>,
        private readonly firstCreatedMs?: number,
    ) {
        super();
    }

    override async runImpl(dataStore: DataStore, clientMessage?: ClientMessage) {
        if (this.attempts >= GetPublicSchemaTask.MaxAttempts) {
            this.telemetry.countBoolean('task.attemptsExceeded', true, { unit: '1', description: this.region });
            clientMessage?.error(`Reached max attempts for retrieving schemas for ${this.region} without success`);
            return;
        }

        this.attempts++;
        const schemas = await this.getSchemas(this.region);
        const value: RegionalSchemasType = {
            version: RegionalSchemas.V1,
            region: this.region,
            schemas: schemas,
            firstCreatedMs: this.firstCreatedMs ?? Date.now(),
            lastModifiedMs: Date.now(),
        };

        await dataStore.put<RegionalSchemasType>(this.region, value);
        clientMessage?.info(`${schemas.length} resource schemas retrieved for ${this.region}`);
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

    override async runImpl(dataStore: DataStore, clientMessage?: ClientMessage) {
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
                void clientMessage?.showMessageNotification(
                    MessageType.Info,
                    `${schemas.length} private registry schemas retrieved for profile: ${profile}`,
                );
            } else {
                clientMessage?.info(`No private registry schemas found for profile: ${profile}`);
            }
        } catch (error) {
            clientMessage?.error(`Failed to get private schemas: ${extractErrorMessage(error)}`);
            throw error;
        }
    }
}
