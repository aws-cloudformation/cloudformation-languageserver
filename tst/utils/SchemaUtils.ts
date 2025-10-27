import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DescribeTypeOutput } from '@aws-sdk/client-cloudformation';
import { CombinedSchemas } from '../../src/schema/CombinedSchemas';
import { RegionalSchemas, RegionalSchemasType, SchemaFileType } from '../../src/schema/RegionalSchemas';
import { ResourceSchema } from '../../src/schema/ResourceSchema';

export const Schemas = {
    S3Bucket: {
        fileName: 'file://aws-s3-bucket.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-s3-bucket.json'), 'utf8');
        },
    },
    EC2Instance: {
        fileName: 'file://aws-ec2-instance.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-ec2-instance.json'), 'utf8');
        },
    },
    IAMRole: {
        fileName: 'file://aws-iam-role.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-iam-role.json'), 'utf8');
        },
    },
    LambdaFunction: {
        fileName: 'file://aws-lambda-function.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-lambda-function.json'), 'utf8');
        },
    },
    EC2VPC: {
        fileName: 'file://aws-ec2-vpc.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-ec2-vpc.json'), 'utf8');
        },
    },
    EC2Subnet: {
        fileName: 'file://aws-ec2-subnet.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-ec2-subnet.json'), 'utf8');
        },
    },
    EC2SecurityGroup: {
        fileName: 'file://aws-ec2-securitygroup.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-ec2-securitygroup.json'), 'utf8');
        },
    },
    EC2LaunchTemplate: {
        fileName: 'file://aws-ec2-launchtemplate.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-ec2-launchtemplate.json'), 'utf8');
        },
    },
    AutoScalingGroup: {
        fileName: 'file://aws-autoscaling-autoscalinggroup.json',
        get contents() {
            return readFileSync(
                join(__dirname, '..', 'resources', 'schemas', 'aws-autoscaling-autoscalinggroup.json'),
                'utf8',
            );
        },
    },
    RDSDBInstance: {
        fileName: 'file://aws-rds-dbinstance.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-rds-dbinstance.json'), 'utf8');
        },
    },
    CloudWatchAlarm: {
        fileName: 'file://aws-cloudwatch-alarm.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-cloudwatch-alarm.json'), 'utf8');
        },
    },
    SNSTopic: {
        fileName: 'file://aws-sns-topic.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-sns-topic.json'), 'utf8');
        },
    },
    SSMParameter: {
        fileName: 'file://aws-ssm-parameter.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-ssm-parameter.json'), 'utf8');
        },
    },
    DynamoDBGlobalTable: {
        fileName: 'file://aws-dynamodb-globaltable.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-dynamodb-globaltable.json'), 'utf8');
        },
    },
    EC2SpotFleet: {
        fileName: 'file://aws-ec2-spotfleet.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-ec2-spotfleet.json'), 'utf8');
        },
    },
    ELBv2ListenerRule: {
        fileName: 'file://aws-elasticloadbalancingv2-listenerrule.json',
        get contents() {
            return readFileSync(
                join(__dirname, '..', 'resources', 'schemas', 'aws-elasticloadbalancingv2-listenerrule.json'),
                'utf8',
            );
        },
    },
    ELBv2Listener: {
        fileName: 'file://aws-elasticloadbalancingv2-listener.json',
        get contents() {
            return readFileSync(
                join(__dirname, '..', 'resources', 'schemas', 'aws-elasticloadbalancingv2-listener.json'),
                'utf8',
            );
        },
    },
    SecurityLakeSubscriberNotification: {
        fileName: 'file://aws-securitylake-subscribernotification.json',
        get contents() {
            return readFileSync(
                join(__dirname, '..', 'resources', 'schemas', 'aws-securitylake-subscribernotification.json'),
                'utf8',
            );
        },
    },
    SyntheticsCanary: {
        fileName: 'file://aws-synthetics-canary.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-synthetics-canary.json'), 'utf8');
        },
    },
    ServerlessFunction: {
        fileName: 'file://aws-serverless-function.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-serverless-function.json'), 'utf8');
        },
    },
    ServerlessApi: {
        fileName: 'file://aws-serverless-api.json',
        get contents() {
            return readFileSync(join(__dirname, '..', 'resources', 'schemas', 'aws-serverless-api.json'), 'utf8');
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
    region: string = 'us-east-1',
): CombinedSchemas {
    return new CombinedSchemas(regionalSchemas(publicSchemas, region));
}

export function combineSchema(schema: ResourceSchema, newName: string, changes: any): typeof Schemas.S3Bucket {
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

export function getTestPrivateSchemas(): DescribeTypeOutput[] {
    const schemas: DescribeTypeOutput[] = [];
    const privateSchemasDir = join(__dirname, '..', 'resources', 'private-schemas');

    for (const file of readdirSync(privateSchemasDir)) {
        const content = readFileSync(join(privateSchemasDir, file), 'utf8');
        const schema = JSON.parse(content);

        schemas.push({
            TypeName: schema.typeName,
            Schema: content,
            Type: 'RESOURCE',
            Visibility: 'PRIVATE',
        });
    }

    return schemas;
}
