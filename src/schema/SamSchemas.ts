import { SchemaFileType } from './RegionalSchemas';
import { ResourceSchema } from './ResourceSchema';

export type SamSchemasType = {
    version: string;
    schemas: SchemaFileType[];
    firstCreatedMs: number;
    lastModifiedMs: number;
};

export const SamStoreKey = 'SamSchemas';

export class SamSchemas {
    static readonly V1 = 'v1';

    readonly version: string;
    readonly numSchemas: number;
    readonly firstCreatedMs: number;
    readonly lastModifiedMs: number;
    readonly schemas: Map<string, ResourceSchema>;

    constructor(
        version: string,
        schemas: { name: string; content: string; createdMs: number }[],
        firstCreatedMs: number,
        lastModifiedMs: number,
    ) {
        this.version = version;
        this.firstCreatedMs = firstCreatedMs;
        this.lastModifiedMs = lastModifiedMs;
        this.schemas = new Map(
            schemas.map((x) => {
                const schema = new ResourceSchema(x.content);
                return [schema.typeName, schema];
            }),
        );
        this.numSchemas = this.schemas.size;
    }

    static from(json: SamSchemasType) {
        return new SamSchemas(json.version, json.schemas, json.firstCreatedMs, json.lastModifiedMs);
    }
}
