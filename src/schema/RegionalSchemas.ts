import { AwsRegion, getRegion } from '../utils/Region';
import { ResourceSchema } from './ResourceSchema';

export type SchemaFileType = {
    name: string;
    content: string;
    createdMs: number;
};

export type RegionalSchemasType = {
    version: string;
    region: string;
    schemas: SchemaFileType[];
    firstCreatedMs: number;
    lastModifiedMs: number;
};

export class RegionalSchemas {
    static readonly V1 = 'v1';

    readonly version: string;
    readonly region: AwsRegion;
    readonly numSchemas: number;
    readonly firstCreatedMs: number;
    readonly lastModifiedMs: number;
    readonly schemas: Map<string, ResourceSchema>;

    constructor(
        version: string,
        schemas: SchemaFileType[],
        region: string,
        firstCreatedMs: number,
        lastModifiedMs: number,
    ) {
        this.version = version;
        this.region = getRegion(region);
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

    static from(json: RegionalSchemasType) {
        return new RegionalSchemas(json.version, json.schemas, json.region, json.firstCreatedMs, json.lastModifiedMs);
    }
}
