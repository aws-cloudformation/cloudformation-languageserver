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

    private readonly createCombinedSchemas: typeof CombinedSchemas.from = (r, p, s) => {
        return CombinedSchemas.from(r, p, s);
    };

    public readonly publicSchemas = this.dataStoreFactory.get(StoreName.public_schemas, Persistence.local);
    public readonly privateSchemas = this.dataStoreFactory.get(StoreName.private_schemas, Persistence.memory);
    public readonly samSchemas = this.dataStoreFactory.get(StoreName.sam_schemas, Persistence.local);

    private regionalSchemaKey?: string;
    private regionalSchemas?: RegionalSchemasType;

    private readonly publicLastModifiedMs = new Map<string, number>();
    private samLastModifiedMs?: number;

    private combined?: CombinedSchemas;

    constructor(private readonly dataStoreFactory: DataStoreFactoryProvider) {}

    @Measure({ name: 'get', captureErrorAttributes: true })
    get(region: AwsRegion, _profile: string): CombinedSchemas {
        let rebuild = false;

        // 1. !this.regionalSchemas - First call ever, nothing cached yet
        // 2. this.regionalSchemaKey !== region - Region changed from last call (e.g., us-east-1 -> eu-west-1)
        // We track the key separately because different regions have different available resource types
        // (e.g., some services only exist in certain regions), so we must reload when switching regions
        if (!this.regionalSchemas || this.regionalSchemaKey !== region) {
            const newSchemas = this.getPublicSchemas(region);
            // Only update if schemas exist for this region - if they don't, keep the old region/schemas
            // This prevents breaking the cache when requesting an unavailable region (e.g., not yet downloaded)
            // Without this check, we'd set regionalSchemaKey to the new region but have no schemas,
            // causing the condition above to never trigger again for that region
            if (newSchemas) {
                rebuild = true;
                this.regionalSchemas = newSchemas;
                this.regionalSchemaKey = region;
            }
        }

        // Rebuild combined schemas only when necessary (region changed or no cache exists)
        // Private and SAM schemas are fetched fresh each time since they can change independently
        if (!this.combined || rebuild) {
            this.telemetry.count('rebuild', 1);
            this.combined = this.createCombinedSchemas(
                this.regionalSchemas,
                this.getPrivateSchemas(),
                this.getSamSchemas(),
            );

            this.log.info(
                {
                    Public: this.combined.regionalSchemas?.schemas.size ?? 0,
                    Private: this.combined.privateSchemas?.schemas.size ?? 0,
                    Sam: this.combined.samSchemas?.schemas.size ?? 0,
                    Total: this.combined.numSchemas,
                },
                'Combined schemas',
            );

            this.telemetry.histogram('public.size', this.combined.regionalSchemas?.schemas.size ?? 0);
            this.telemetry.histogram('sam.size', this.combined.samSchemas?.schemas.size ?? 0);
        }

        return this.combined;
    }

    getPublicSchemas(region: string): RegionalSchemasType | undefined {
        const resolvedRegion = getRegion(region);
        const schemas = this.publicSchemas.get<RegionalSchemasType>(resolvedRegion);
        if (schemas !== undefined) {
            this.publicLastModifiedMs.set(resolvedRegion, schemas.lastModifiedMs);
        }
        return schemas;
    }

    getPublicSchemaRegions(): ReadonlyArray<string> {
        return this.publicSchemas.keys(50);
    }

    getPrivateSchemas(): PrivateSchemasType | undefined {
        return this.privateSchemas.get<PrivateSchemasType>(PrivateStoreKey);
    }

    getSamSchemas(): SamSchemasType | undefined {
        const schemas = this.samSchemas.get<SamSchemasType>(SamStoreKey);
        if (schemas !== undefined) {
            this.samLastModifiedMs = schemas.lastModifiedMs;
        }
        return schemas;
    }

    getSamSchemaAge(): number {
        if (this.samLastModifiedMs === undefined) {
            this.getSamSchemas();
        }

        return ageMs(this.samLastModifiedMs) ?? Number.MAX_SAFE_INTEGER;
    }

    getPublicSchemasMaxAge(): number {
        if (this.publicLastModifiedMs.size === 0) {
            for (const region of this.getPublicSchemaRegions()) {
                this.getPublicSchemas(region);
            }
        }

        let maxAge: number | undefined;
        for (const lastModifiedMs of this.publicLastModifiedMs.values()) {
            const age = ageMs(lastModifiedMs);
            if (age !== undefined) {
                maxAge = maxAge === undefined ? age : Math.max(maxAge, age);
            }
        }

        return maxAge ?? Number.MAX_SAFE_INTEGER;
    }

    invalidate() {
        this.telemetry.count('invalidate', 1);
        this.combined = undefined;
        this.publicLastModifiedMs.clear();
        this.samLastModifiedMs = undefined;
    }
}

function ageMs(lastModifiedMs: number | undefined): number | undefined {
    if (lastModifiedMs === undefined) {
        return undefined;
    }

    return DateTime.now().diff(DateTime.fromMillis(lastModifiedMs)).toMillis();
}
