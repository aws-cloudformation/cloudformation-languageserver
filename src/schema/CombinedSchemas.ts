import { PrivateSchemas, PrivateSchemasType } from './PrivateSchemas';
import { RegionalSchemas, RegionalSchemasType } from './RegionalSchemas';
import { ResourceSchema } from './ResourceSchema';

export class CombinedSchemas {
    readonly numSchemas: number;
    readonly schemas: Map<string, ResourceSchema>;

    constructor(regionalSchemas?: RegionalSchemas, privateSchemas?: PrivateSchemas, samSchemas?: Map<string, unknown>) {
        const samEntries: [string, ResourceSchema][] = samSchemas
            ? [...samSchemas.entries()].map(([type, schema]) => [type, new ResourceSchema(JSON.stringify(schema))])
            : [];

        this.schemas = new Map<string, ResourceSchema>([
            ...(privateSchemas?.schemas ?? []),
            ...(regionalSchemas?.schemas ?? []),
            ...samEntries,
        ]);
        this.numSchemas = this.schemas.size;
    }

    toLog() {
        return {
            schema: this.schemas.size,
            names: [...this.schemas.keys()],
        };
    }

    static from(
        regionalSchemas?: RegionalSchemasType,
        privateSchemas?: PrivateSchemasType,
        samSchemas?: Map<string, unknown>,
    ) {
        const regionalSchema = regionalSchemas === undefined ? undefined : RegionalSchemas.from(regionalSchemas);
        const privateSchema = privateSchemas === undefined ? undefined : PrivateSchemas.from(privateSchemas);
        return new CombinedSchemas(regionalSchema, privateSchema, samSchemas);
    }
}
