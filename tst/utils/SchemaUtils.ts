import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { CombinedSchemas } from '../../src/schema/CombinedSchemas';
import { PrivateSchemas } from '../../src/schema/PrivateSchemas';
import { RegionalSchemas, RegionalSchemasType, SchemaFileType } from '../../src/schema/RegionalSchemas';
import { ResourceSchema } from '../../src/schema/ResourceSchema';
import { SamSchemas } from '../../src/schema/SamSchemas';
import { CloudFormationResourceSchema } from '../../src/schema/SamSchemaTransformer';

const cache = new Map<string, string>();
const loadSchema = (name: string) => {
    if (!cache.has(name)) {
        cache.set(name, readFileSync(join(__dirname, '..', 'resources', 'schemas', name), 'utf8'));
    }
    return cache.get(name)!;
};

export const Schemas = {
    S3Bucket: {
        fileName: 'file://aws-s3-bucket.json',
        get contents() {
            return loadSchema('aws-s3-bucket.json');
        },
    },
    EC2Instance: {
        fileName: 'file://aws-ec2-instance.json',
        get contents() {
            return loadSchema('aws-ec2-instance.json');
        },
    },
    IAMRole: {
        fileName: 'file://aws-iam-role.json',
        get contents() {
            return loadSchema('aws-iam-role.json');
        },
    },
    LambdaFunction: {
        fileName: 'file://aws-lambda-function.json',
        get contents() {
            return loadSchema('aws-lambda-function.json');
        },
    },
    EC2VPC: {
        fileName: 'file://aws-ec2-vpc.json',
        get contents() {
            return loadSchema('aws-ec2-vpc.json');
        },
    },
    EC2Subnet: {
        fileName: 'file://aws-ec2-subnet.json',
        get contents() {
            return loadSchema('aws-ec2-subnet.json');
        },
    },
    EC2SecurityGroup: {
        fileName: 'file://aws-ec2-securitygroup.json',
        get contents() {
            return loadSchema('aws-ec2-securitygroup.json');
        },
    },
    EC2LaunchTemplate: {
        fileName: 'file://aws-ec2-launchtemplate.json',
        get contents() {
            return loadSchema('aws-ec2-launchtemplate.json');
        },
    },
    AutoScalingGroup: {
        fileName: 'file://aws-autoscaling-autoscalinggroup.json',
        get contents() {
            return loadSchema('aws-autoscaling-autoscalinggroup.json');
        },
    },
    RDSDBInstance: {
        fileName: 'file://aws-rds-dbinstance.json',
        get contents() {
            return loadSchema('aws-rds-dbinstance.json');
        },
    },
    CloudWatchAlarm: {
        fileName: 'file://aws-cloudwatch-alarm.json',
        get contents() {
            return loadSchema('aws-cloudwatch-alarm.json');
        },
    },
    SNSTopic: {
        fileName: 'file://aws-sns-topic.json',
        get contents() {
            return loadSchema('aws-sns-topic.json');
        },
    },
    SSMParameter: {
        fileName: 'file://aws-ssm-parameter.json',
        get contents() {
            return loadSchema('aws-ssm-parameter.json');
        },
    },
    DynamoDBGlobalTable: {
        fileName: 'file://aws-dynamodb-globaltable.json',
        get contents() {
            return loadSchema('aws-dynamodb-globaltable.json');
        },
    },
    EC2SpotFleet: {
        fileName: 'file://aws-ec2-spotfleet.json',
        get contents() {
            return loadSchema('aws-ec2-spotfleet.json');
        },
    },
    ELBv2ListenerRule: {
        fileName: 'file://aws-elasticloadbalancingv2-listenerrule.json',
        get contents() {
            return loadSchema('aws-elasticloadbalancingv2-listenerrule.json');
        },
    },
    ELBv2Listener: {
        fileName: 'file://aws-elasticloadbalancingv2-listener.json',
        get contents() {
            return loadSchema('aws-elasticloadbalancingv2-listener.json');
        },
    },
    SecurityLakeSubscriberNotification: {
        fileName: 'file://aws-securitylake-subscribernotification.json',
        get contents() {
            return loadSchema('aws-securitylake-subscribernotification.json');
        },
    },
    SyntheticsCanary: {
        fileName: 'file://aws-synthetics-canary.json',
        get contents() {
            return loadSchema('aws-synthetics-canary.json');
        },
    },
    WAFv2WebACL: {
        fileName: 'file://aws-wafv2-webacl.json',
        get contents() {
            return loadSchema('aws-wafv2-webacl.json');
        },
    },
    WAFv2IPSet: {
        fileName: 'file://aws-wafv2-ipset.json',
        get contents() {
            return loadSchema('aws-wafv2-ipset.json');
        },
    },
};

export const SamSchemaFiles = {
    ServerlessFunction: {
        fileName: 'file://aws-serverless-function.json',
        get contents() {
            return loadSchema('aws-serverless-function.json');
        },
    },
    ServerlessApi: {
        fileName: 'file://aws-serverless-api.json',
        get contents() {
            return loadSchema('aws-serverless-api.json');
        },
    },
};

export function regionalSchemas(
    schemas: (typeof Schemas.S3Bucket)[] = Object.values(Schemas),
    region: string = 'us-east-1',
): RegionalSchemas {
    const regionalSchemas: RegionalSchemasType = {
        version: RegionalSchemas.V1,
        region,
        schemas: schemaFileType(schemas),
        firstCreatedMs: Date.now(),
        lastModifiedMs: Date.now(),
    };

    return RegionalSchemas.from(regionalSchemas);
}

export function combinedSchemas(
    publicSchemas: (typeof Schemas.S3Bucket)[] = Object.values(Schemas),
    samSchemas: (typeof SamSchemaFiles.ServerlessFunction)[] = Object.values(SamSchemaFiles),
    region: string = 'us-east-1',
): CombinedSchemas {
    const now = Date.now();
    return new CombinedSchemas(
        regionalSchemas(publicSchemas, region),
        PrivateSchemas.from({
            version: PrivateSchemas.V1,
            identifier: 'test',
            schemas: getTestPrivateSchemas(),
            firstCreatedMs: now,
            lastModifiedMs: now,
        }),
        SamSchemas.from({
            version: SamSchemas.V1,
            schemas: schemaFileType(samSchemas),
            firstCreatedMs: now,
            lastModifiedMs: now,
        }),
    );
}

export function createSchemaFrom(schema: ResourceSchema, newName: string, changes: any): typeof Schemas.S3Bucket {
    return {
        fileName: `${newName.toLowerCase().split('::').join('-')}.json`,
        contents: JSON.stringify({
            ...schema.toJSON(),
            ...changes,
            typeName: newName,
        }),
    };
}

export function schemaFileType(schemas: (typeof Schemas.S3Bucket)[] = Object.values(Schemas)): SchemaFileType[] {
    return schemas.map((schema) => {
        return {
            name: schema.fileName,
            content: schema.contents,
            createdMs: Date.now(),
        };
    });
}

export function samFileType(
    schemas: (typeof SamSchemaFiles.ServerlessFunction)[] = Object.values(SamSchemaFiles),
): Map<string, CloudFormationResourceSchema> {
    const map = new Map<string, CloudFormationResourceSchema>();

    for (const schema of schemas) {
        const sam = JSON.parse(schema.contents) as CloudFormationResourceSchema;
        map.set(sam.typeName, sam);
    }

    return map;
}

let testPrivateSchemas: DescribeTypeOutput[] | undefined;

export function getTestPrivateSchemas(): DescribeTypeOutput[] {
    if (!testPrivateSchemas) {
        testPrivateSchemas = [];
        const privateSchemasDir = join(__dirname, '..', 'resources', 'private-schemas');

        for (const file of readdirSync(privateSchemasDir)) {
            const content = readFileSync(join(privateSchemasDir, file), 'utf8');
            const schema = JSON.parse(content);

            testPrivateSchemas.push({
                TypeName: schema.typeName,
                Schema: content,
                Type: 'RESOURCE',
                Visibility: 'PRIVATE',
            });
        }
    }

    return testPrivateSchemas;
}
