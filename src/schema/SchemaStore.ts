import { DataStoreFactoryProvider, Persistence } from '../datastore/DataStore';

export class SchemaStore {
    public readonly publicSchemas = this.dataStoreFactory.get('public_schemas', Persistence.local);
    public readonly privateSchemas = this.dataStoreFactory.get('private_schemas', Persistence.memory);
    public readonly samSchemas = this.dataStoreFactory.get('sam_schemas', Persistence.local);
    public readonly combinedSchemas = this.dataStoreFactory.get('combined_schemas', Persistence.memory);

    constructor(private readonly dataStoreFactory: DataStoreFactoryProvider) {}

    invalidateCombinedSchemas() {
        void this.combinedSchemas.clear();
    }
}
