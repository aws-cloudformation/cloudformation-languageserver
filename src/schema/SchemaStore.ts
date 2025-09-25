import { DataStoreFactoryProvider, Persistence } from '../datastore/DataStore';
import { ServerComponents } from '../server/ServerComponents';

export class SchemaStore {
    public readonly publicSchemas = this.dataStoreFactory.get('public_schemas', Persistence.local);
    public readonly privateSchemas = this.dataStoreFactory.get('private_schemas', Persistence.memory);

    constructor(private readonly dataStoreFactory: DataStoreFactoryProvider) {}

    static create(components: ServerComponents) {
        return new SchemaStore(components.dataStoreFactory);
    }
}
