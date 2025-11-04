import { LoggerFactory } from '../telemetry/LoggerFactory';
import { PrivateSchemas, PrivateSchemasType } from './PrivateSchemas';
import { RegionalSchemas, RegionalSchemasType } from './RegionalSchemas';
import { ResourceSchema } from './ResourceSchema';
import { SamSchemas, SamSchemasType } from './SamSchemas';

export class CombinedSchemas {
    private static readonly log = LoggerFactory.getLogger('CombinedSchemas');
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

    static from(
        regionalSchemas?: RegionalSchemasType,
        privateSchemas?: PrivateSchemasType,
        samSchemas?: SamSchemasType,
    ) {
        const regionalSchema = regionalSchemas === undefined ? undefined : RegionalSchemas.from(regionalSchemas);
        const privateSchema = privateSchemas === undefined ? undefined : PrivateSchemas.from(privateSchemas);
        const samSchema = samSchemas === undefined ? undefined : SamSchemas.from(samSchemas);

        CombinedSchemas.log.info(
            `Schemas from ${regionalSchemas?.schemas.length} public schemas, ${privateSchema?.schemas.size} private schemas and ${samSchema?.schemas.size} sam schemas`,
        );
        return new CombinedSchemas(regionalSchema, privateSchema, samSchema);
    }
}
