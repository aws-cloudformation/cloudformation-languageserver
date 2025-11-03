import { DataStoreFactoryProvider, Persistence } from '../datastore/DataStore';
import { AwsRegion } from '../utils/Region';
import { CombinedSchemas } from './CombinedSchemas';
import { GetSamSchemaTask } from './GetSamSchemaTask';
import { PrivateSchemasType } from './PrivateSchemas';
import { RegionalSchemasType } from './RegionalSchemas';

export class SchemaStore {
    public readonly publicSchemas = this.dataStoreFactory.get('public_schemas', Persistence.local);
    public readonly privateSchemas = this.dataStoreFactory.get('private_schemas', Persistence.memory);
    public readonly combinedSchemas = this.dataStoreFactory.get('combined_schemas', Persistence.memory);

    constructor(private readonly dataStoreFactory: DataStoreFactoryProvider) {}

    getCombinedSchemas(region: AwsRegion, profile: string): CombinedSchemas {
        const cacheKey = `${region}:${profile}`;
        let cached = this.combinedSchemas.get<CombinedSchemas>(cacheKey);

        if (!cached) {
            const regionalSchemas = this.publicSchemas.get<RegionalSchemasType>(region);
            const privateSchemas = this.privateSchemas.get<PrivateSchemasType>(profile);
            const samSchemas = GetSamSchemaTask.getSamSchemas(this.publicSchemas);

            cached = CombinedSchemas.from(regionalSchemas, privateSchemas, samSchemas);
            void this.combinedSchemas.put(cacheKey, cached);
        }

        return cached;
    }

    invalidateCombinedSchemas() {
        void this.combinedSchemas.clear();
    }
}
