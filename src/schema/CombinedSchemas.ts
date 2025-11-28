import { PrivateSchemas, PrivateSchemasType } from './PrivateSchemas';
import { RegionalSchemas, RegionalSchemasType } from './RegionalSchemas';
import { ResourceSchema } from './ResourceSchema';
import { SamSchemas, SamSchemasType } from './SamSchemas';

export class CombinedSchemas {
    readonly numSchemas: number;
    readonly schemas: Map<string, ResourceSchema>;

    constructor(
        readonly regionalSchemas?: RegionalSchemas,
        readonly privateSchemas?: PrivateSchemas,
        readonly samSchemas?: SamSchemas,
    ) {
        this.schemas = new Map<string, ResourceSchema>([
            ...(privateSchemas?.schemas ?? []),
            ...(regionalSchemas?.schemas ?? []),
            ...(samSchemas?.schemas ?? []),
        ]);
        this.numSchemas = this.schemas.size;
    }

    static from(
        regionalSchemas?: RegionalSchemasType,
        privateSchemas?: PrivateSchemasType,
        samSchemas?: SamSchemasType,
    ): CombinedSchemas {
        const regionalSchema = regionalSchemas === undefined ? undefined : RegionalSchemas.from(regionalSchemas);
        const privateSchema = privateSchemas === undefined ? undefined : PrivateSchemas.from(privateSchemas);
        const samSchema = samSchemas === undefined ? undefined : SamSchemas.from(samSchemas);
        return new CombinedSchemas(regionalSchema, privateSchema, samSchema);
    }
}
