import { PrivateSchemas, PrivateSchemasType } from './PrivateSchemas';
import { RegionalSchemas, RegionalSchemasType } from './RegionalSchemas';
import { ResourceSchema } from './ResourceSchema';
import { SamSchemas } from './SamSchemas';

export class CombinedSchemas {
    readonly numSchemas: number;
    readonly schemas: Map<string, ResourceSchema>;

    constructor(regionalSchemas?: RegionalSchemas, privateSchemas?: PrivateSchemas, samSchemas?: SamSchemas) {
        this.schemas = new Map<string, ResourceSchema>([
            ...(privateSchemas?.schemas ?? []),
            ...(regionalSchemas?.schemas ?? []),
            ...(samSchemas?.schemas ?? []),
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
        const samSchema = samSchemas === undefined ? undefined : new SamSchemas(samSchemas);

        return new CombinedSchemas(regionalSchema, privateSchema, samSchema);
    }
}
