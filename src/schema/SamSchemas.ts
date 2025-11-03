import { ResourceSchema } from './ResourceSchema';

export class SamSchemas {
    readonly numSchemas: number;
    readonly schemas: Map<string, ResourceSchema>;

    constructor(samSchemas: Map<string, unknown>) {
        this.schemas = new Map(
            [...samSchemas.entries()].map(([type, schema]) => {
                const resourceSchema = new ResourceSchema(JSON.stringify(schema));
                return [type, resourceSchema];
            }),
        );
        this.numSchemas = this.schemas.size;
    }
}
