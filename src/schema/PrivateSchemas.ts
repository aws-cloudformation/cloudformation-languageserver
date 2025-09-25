import { DescribeTypeOutput, RegistryType } from '@aws-sdk/client-cloudformation';
import { ResourceSchema } from './ResourceSchema';

export type PrivateSchemasType = {
    version: string;
    identifier: string;
    schemas: DescribeTypeOutput[];
    firstCreatedMs: number;
    lastModifiedMs: number;
};

export class PrivateSchemas {
    static readonly V1 = 'v1';

    readonly numSchemas: number;
    readonly schemas: Map<string, ResourceSchema>;

    constructor(
        readonly version: string,
        schemas: DescribeTypeOutput[],
        readonly identifier: string,
        readonly firstCreatedMs: number,
        readonly lastModifiedMs: number,
    ) {
        this.version = version;
        this.schemas = new Map(
            schemas
                .filter((x) => x.Schema !== undefined && x.TypeName !== undefined && x.Type === RegistryType.RESOURCE)
                .map((x) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const schema = new ResourceSchema(x.Schema!);
                    return [schema.typeName, schema];
                }),
        );
        this.numSchemas = this.schemas.size;
    }

    static from(json: PrivateSchemasType) {
        return new PrivateSchemas(
            json.version,
            json.schemas,
            json.identifier,
            json.firstCreatedMs,
            json.lastModifiedMs,
        );
    }
}
