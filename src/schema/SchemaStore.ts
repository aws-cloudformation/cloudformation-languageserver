import { DateTime } from 'luxon';
import { DataStoreFactoryProvider, Persistence, StoreName } from '../datastore/DataStore';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Measure, Telemetry } from '../telemetry/TelemetryDecorator';
import { AwsRegion, getRegion } from '../utils/Region';
import { CombinedSchemas } from './CombinedSchemas';
import { PrivateSchemasType, PrivateStoreKey } from './PrivateSchemas';
import { RegionalSchemasType } from './RegionalSchemas';
import { SamSchemasType, SamStoreKey } from './SamSchemas';

export class SchemaStore {
    @Telemetry()
    private readonly telemetry!: ScopedTelemetry;
    private readonly log = LoggerFactory.getLogger(SchemaStore);

    public readonly publicSchemas = this.dataStoreFactory.get(StoreName.public_schemas, Persistence.local);
    public readonly privateSchemas = this.dataStoreFactory.get(StoreName.private_schemas, Persistence.memory);
    public readonly samSchemas = this.dataStoreFactory.get(StoreName.sam_schemas, Persistence.local);

    private regionalSchemaKey?: string;
    private regionalSchemas?: RegionalSchemasType;

    private combined?: CombinedSchemas;

    constructor(private readonly dataStoreFactory: DataStoreFactoryProvider) {}

    @Measure({ name: 'get' })
    get(region: AwsRegion, _profile: string): CombinedSchemas {
        let rebuild = false;

        if (!this.regionalSchemas || this.regionalSchemaKey !== region) {
            this.regionalSchemaKey = region;
            this.regionalSchemas = this.getPublicSchemas(region);
            if (this.regionalSchemas) {
                rebuild = true;
            }
        }

        this.telemetry.countBoolean('rebuild', rebuild);
        if (!this.combined || rebuild) {
            this.combined = CombinedSchemas.from(this.regionalSchemas, this.getPrivateSchemas(), this.getSamSchemas());

            this.log.info(
                {
                    Public: this.combined.regionalSchemas?.schemas.size ?? 0,
                    Private: this.combined.privateSchemas?.schemas.size ?? 0,
                    Sam: this.combined.samSchemas?.schemas.size ?? 0,
                    Total: this.combined.numSchemas,
                },
                'Combined schemas',
            );
        }

        return this.combined;
    }

    getPublicSchemas(region: string): RegionalSchemasType | undefined {
        return this.publicSchemas.get<RegionalSchemasType>(getRegion(region));
    }

    getPublicSchemaRegions(): ReadonlyArray<string> {
        return this.publicSchemas.keys(50);
    }

    getPrivateSchemas(): PrivateSchemasType | undefined {
        return this.privateSchemas.get<PrivateSchemasType>(PrivateStoreKey);
    }

    getSamSchemas(): SamSchemasType | undefined {
        return this.samSchemas.get<SamSchemasType>(SamStoreKey);
    }

    getSamSchemaAge(): number {
        const existingValue = this.getSamSchemas();
        if (!existingValue) {
            return 0;
        }
        return DateTime.now().diff(DateTime.fromMillis(existingValue.lastModifiedMs)).milliseconds;
    }

    getPublicSchemasMaxAge(): number {
        const regions = this.getPublicSchemaRegions();
        if (regions.length === 0) {
            return 0;
        }

        let maxAge: number | undefined;
        for (const key of regions) {
            const lastModifiedMs = this.getPublicSchemas(key)?.lastModifiedMs;

            if (lastModifiedMs) {
                if (maxAge === undefined) {
                    maxAge = lastModifiedMs;
                } else {
                    const age = DateTime.now().diff(DateTime.fromMillis(lastModifiedMs)).milliseconds;
                    maxAge = Math.max(maxAge, age);
                }
            }
        }

        return maxAge ?? Number.MAX_SAFE_INTEGER;
    }

    invalidate() {
        this.combined = undefined;
    }
}
