import { describe, it, expect } from 'vitest';
import { AddWriteOnlyRequiredPropertiesTransformer } from '../../../../src/schema/transformers/AddWriteOnlyRequiredPropertiesTransformer';
import { combinedSchemas } from '../../../utils/SchemaUtils';

describe('AddWriteOnlyRequiredPropertiesTransformer', () => {
    const schemas = combinedSchemas();
    const transformer = new AddWriteOnlyRequiredPropertiesTransformer();
    const PLACEHOLDER = '${1:update required write only property}';

    const resourceTests = [
        {
            typeName: 'AWS::Lambda::Function',
            properties: { FunctionName: 'test-function', Role: 'arn:aws:iam::123456789012:role/lambda-role' },
            expectedAfterTransform: {
                FunctionName: 'test-function',
                Role: 'arn:aws:iam::123456789012:role/lambda-role',
                Code: PLACEHOLDER,
            },
        },
        {
            typeName: 'AWS::EC2::LaunchTemplate',
            properties: { LaunchTemplateName: 'test-template' },
            expectedAfterTransform: {
                LaunchTemplateName: 'test-template',
                LaunchTemplateData: PLACEHOLDER,
            },
        },
        {
            typeName: 'AWS::Synthetics::Canary',
            properties: {
                Name: 'test-canary',
                ExecutionRoleArn: 'arn:aws:iam::123456789012:role/canary-role',
                Schedule: { Expression: 'rate(5 minutes)' },
                RuntimeVersion: 'syn-nodejs-puppeteer-3.9',
                ArtifactS3Location: 's3://my-bucket/canary',
            },
            expectedAfterTransform: {
                Name: 'test-canary',
                ExecutionRoleArn: 'arn:aws:iam::123456789012:role/canary-role',
                Schedule: { Expression: 'rate(5 minutes)' },
                RuntimeVersion: 'syn-nodejs-puppeteer-3.9',
                ArtifactS3Location: 's3://my-bucket/canary',
                Code: PLACEHOLDER,
            },
        },
        {
            typeName: 'AWS::SecurityLake::SubscriberNotification',
            properties: { SubscriberArn: 'arn:aws:securitylake:us-east-1:123456789012:subscriber/test' },
            expectedAfterTransform: {
                SubscriberArn: 'arn:aws:securitylake:us-east-1:123456789012:subscriber/test',
                NotificationConfiguration: PLACEHOLDER,
            },
        },
        {
            typeName: 'AWS::DynamoDB::GlobalTable',
            properties: {
                TableName: 'test-table',
                KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
                AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
                Replicas: [{ Region: 'us-east-1' }],
            },
            expectedAfterTransform: {
                TableName: 'test-table',
                KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
                AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
                Replicas: [{ Region: 'us-east-1' }],
            },
        },
        {
            typeName: 'AWS::EC2::SpotFleet',
            properties: {
                SpotFleetRequestConfigData: {
                    IamFleetRole: 'arn:aws:iam::123456789012:role/fleet-role',
                    TargetCapacity: 1,
                },
            },
            expectedAfterTransform: {
                SpotFleetRequestConfigData: {
                    IamFleetRole: 'arn:aws:iam::123456789012:role/fleet-role',
                    TargetCapacity: 1,
                },
            },
        },
        {
            typeName: 'AWS::ElasticLoadBalancingV2::ListenerRule',
            properties: {
                ListenerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/test',
                Priority: 1,
                Conditions: [{ Field: 'path-pattern', Values: ['/test'] }],
            },
            expectedAfterTransform: {
                ListenerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/test',
                Priority: 1,
                Conditions: [{ Field: 'path-pattern', Values: ['/test'] }],
                Actions: PLACEHOLDER,
            },
        },
        {
            typeName: 'AWS::ElasticLoadBalancingV2::Listener',
            properties: {
                LoadBalancerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/test',
            },
            expectedAfterTransform: {
                LoadBalancerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/test',
                DefaultActions: PLACEHOLDER,
            },
        },
    ];

    for (const { typeName, properties, expectedAfterTransform } of resourceTests) {
        it(`should add required write-only properties to ${typeName}`, () => {
            const schema = schemas.schemas.get(typeName);
            if (!schema) {
                throw new Error(`Schema not found for ${typeName}`);
            }

            const resourceProperties = structuredClone(properties);
            transformer.transform(resourceProperties, schema);

            expect(resourceProperties).toEqual(expectedAfterTransform);
        });
    }

    it('should not modify resources without required write-only properties', () => {
        const schema = schemas.schemas.get('AWS::S3::Bucket')!;
        const resourceProperties = { BucketName: 'my-bucket' };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties).toEqual({ BucketName: 'my-bucket' });
    });

    it('should not overwrite existing properties', () => {
        const schema = schemas.schemas.get('AWS::Lambda::Function')!;
        const resourceProperties = {
            FunctionName: 'test-function',
            Role: 'arn:aws:iam::123456789012:role/lambda-role',
            Code: { S3Bucket: 'my-bucket', S3Key: 'my-key' },
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties.Code).toEqual({ S3Bucket: 'my-bucket', S3Key: 'my-key' });
    });

    it('should replace empty objects with placeholder', () => {
        const schema = schemas.schemas.get('AWS::Lambda::Function')!;
        const resourceProperties = {
            FunctionName: 'test-function',
            Role: 'arn:aws:iam::123456789012:role/lambda-role',
            Code: {},
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties.Code).toEqual(PLACEHOLDER);
    });
});
