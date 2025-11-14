import { DataStoreFactoryProvider, Persistence, StoreName } from '../datastore/DataStore';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { AwsRegion } from '../utils/Region';
import { CombinedSchemas } from './CombinedSchemas';
import { PrivateSchemasType } from './PrivateSchemas';
import { RegionalSchemasType } from './RegionalSchemas';
import { SamSchemasType, SamStoreKey } from './SamSchemas';

export class SchemaStore {
    private readonly log = LoggerFactory.getLogger(SchemaStore);

    public readonly publicSchemas = this.dataStoreFactory.get(StoreName.public_schemas, Persistence.local);
    public readonly privateSchemas = this.dataStoreFactory.get(StoreName.private_schemas, Persistence.memory);
    public readonly samSchemas = this.dataStoreFactory.get(StoreName.sam_schemas, Persistence.local);
    public readonly combinedSchemas = this.dataStoreFactory.get(StoreName.combined_schemas, Persistence.memory);

    constructor(private readonly dataStoreFactory: DataStoreFactoryProvider) {}

    get(region: AwsRegion, profile: string) {
        return this.combinedSchemas.get<CombinedSchemas>(cacheKey(region, profile));
    }

    put(region: AwsRegion, profile: string, regionalSchemas?: RegionalSchemasType): CombinedSchemas {
        const privateSchemas = this.privateSchemas.get<PrivateSchemasType>(profile);
        const samSchemas = this.samSchemas.get<SamSchemasType>(SamStoreKey);

        const combined = CombinedSchemas.from(regionalSchemas, privateSchemas, samSchemas);
        this.combinedSchemas.put(cacheKey(region, profile), combined).catch(this.log.error);
        return combined;
    }

    invalidateCombinedSchemas() {
        this.combinedSchemas.clear().catch(this.log.error);
    }
}

function cacheKey(region: AwsRegion, profile: string) {
    return `${region}:${profile}`;
}
