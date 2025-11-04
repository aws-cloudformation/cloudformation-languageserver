import { describe, expect, it } from 'vitest';
import { PlaceholderConstants } from '../../../../src/schema/transformers/PlaceholderConstants';
import { ReplacePrimaryIdentifierTransformer } from '../../../../src/schema/transformers/ReplacePrimaryIdentifierTransformer';
import { combinedSchemas } from '../../../utils/SchemaUtils';

describe('ReplacePrimaryIdentifierTransformer', () => {
    const schemas = combinedSchemas();
    const transformer = new ReplacePrimaryIdentifierTransformer();
    const testLogicalId = 'TestResource';

    // Test with all 13 available resource schemas
    const resourceTests = [
        {
            typeName: 'AWS::S3::Bucket',
            properties: {
                BucketName: 'my-existing-bucket',
                VersioningConfiguration: { Status: 'Enabled' },
            },
            expectedAfterTransform: {
                // BucketName is NOT required, so it should be removed
                VersioningConfiguration: { Status: 'Enabled' },
            },
        },
        {
            typeName: 'AWS::EC2::Instance',
            properties: {
                ImageId: 'ami-12345678',
                InstanceType: 't2.micro',
            },
            expectedAfterTransform: {
                // InstanceId is read-only, no replacement
                ImageId: 'ami-12345678',
                InstanceType: 't2.micro',
            },
        },
        {
            typeName: 'AWS::IAM::Role',
            properties: {
                RoleName: 'MyExistingRole',
                AssumeRolePolicyDocument: { Version: '2012-10-17' },
            },
            expectedAfterTransform: {
                // RoleName is NOT required, so it should be removed
                AssumeRolePolicyDocument: { Version: '2012-10-17' },
            },
        },
        {
            typeName: 'AWS::Lambda::Function',
            properties: {
                FunctionName: 'MyExistingFunction',
                Runtime: 'nodejs18.x',
                Code: { ZipFile: 'exports.handler = async () => {}' },
            },
            expectedAfterTransform: {
                // FunctionName is NOT required, so it should be removed
                Runtime: 'nodejs18.x',
                Code: { ZipFile: 'exports.handler = async () => {}' },
            },
        },
        {
            typeName: 'AWS::EC2::VPC',
            properties: {
                CidrBlock: '10.0.0.0/16',
                EnableDnsHostnames: true,
            },
            expectedAfterTransform: {
                // VpcId is read-only, no replacement
                CidrBlock: '10.0.0.0/16',
                EnableDnsHostnames: true,
            },
        },
        {
            typeName: 'AWS::EC2::Subnet',
            properties: {
                VpcId: 'vpc-12345678',
                CidrBlock: '10.0.1.0/24',
            },
            expectedAfterTransform: {
                // SubnetId is read-only, no replacement
                VpcId: 'vpc-12345678',
                CidrBlock: '10.0.1.0/24',
            },
        },
        {
            typeName: 'AWS::EC2::SecurityGroup',
            properties: {
                GroupDescription: 'My security group',
                VpcId: 'vpc-12345678',
            },
            expectedAfterTransform: {
                // Id is read-only, no replacement
                GroupDescription: 'My security group',
                VpcId: 'vpc-12345678',
            },
        },
        {
            typeName: 'AWS::EC2::LaunchTemplate',
            properties: {
                LaunchTemplateName: 'MyTemplate',
                LaunchTemplateData: { ImageId: 'ami-12345678' },
            },
            expectedAfterTransform: {
                // LaunchTemplateId is read-only, no replacement
                LaunchTemplateName: 'MyTemplate',
                LaunchTemplateData: { ImageId: 'ami-12345678' },
            },
        },
        {
            typeName: 'AWS::AutoScaling::AutoScalingGroup',
            properties: {
                AutoScalingGroupName: 'MyASG',
                MinSize: 1,
                MaxSize: 3,
            },
            expectedAfterTransform: {
                // AutoScalingGroupName is NOT required, so it should be removed
                MinSize: 1,
                MaxSize: 3,
            },
        },
        {
            typeName: 'AWS::RDS::DBInstance',
            properties: {
                DBInstanceIdentifier: 'mydb',
                DBInstanceClass: 'db.t3.micro',
                Engine: 'mysql',
            },
            expectedAfterTransform: {
                // DBInstanceIdentifier is NOT required, so it should be removed
                DBInstanceClass: 'db.t3.micro',
                Engine: 'mysql',
            },
        },
        {
            typeName: 'AWS::CloudWatch::Alarm',
            properties: {
                AlarmName: 'MyAlarm',
                ComparisonOperator: 'GreaterThanThreshold',
                EvaluationPeriods: 2,
            },
            expectedAfterTransform: {
                // AlarmName is NOT required, so it should be removed
                ComparisonOperator: 'GreaterThanThreshold',
                EvaluationPeriods: 2,
            },
        },
        {
            typeName: 'AWS::SNS::Topic',
            properties: {
                TopicName: 'MyTopic',
                DisplayName: 'My Topic',
            },
            expectedAfterTransform: {
                // TopicArn is read-only, no replacement
                TopicName: 'MyTopic',
                DisplayName: 'My Topic',
            },
        },
        {
            typeName: 'AWS::SSM::Parameter',
            properties: {
                Name: '/my/parameter',
                Type: 'String',
                Value: 'test-value',
            },
            expectedAfterTransform: {
                // Name is NOT required, so it should be removed
                Type: 'String',
                Value: 'test-value',
            },
        },
    ];

    for (const { typeName, properties, expectedAfterTransform } of resourceTests) {
        it(`should replace primary identifier properties in ${typeName}`, () => {
            const schema = schemas.schemas.get(typeName)!;
            const resourceProperties = { ...properties };

            transformer.transform(resourceProperties, schema, testLogicalId);

            expect(resourceProperties).toEqual(expectedAfterTransform);
        });
    }

    describe('required primary identifier behavior', () => {
        it('should add placeholder when primary identifier is required', () => {
            // Synthetics::Canary has Name as both primary identifier and required
            const schema = schemas.schemas.get('AWS::Synthetics::Canary')!;
            const resourceProperties = {
                Name: 'existing-canary',
                Code: { Handler: 'index.handler' },
                ArtifactS3Location: 's3://bucket/path',
                ExecutionRoleArn: 'arn:aws:iam::123456789012:role/role',
                Schedule: { Expression: 'rate(5 minutes)' },
                RuntimeVersion: 'syn-nodejs-puppeteer-3.9',
            };

            transformer.transform(resourceProperties, schema, testLogicalId);

            expect(resourceProperties.Name).toBe(
                PlaceholderConstants.createPlaceholder(PlaceholderConstants.CLONE_INPUT_REQUIRED, testLogicalId),
            );
        });

        it('should remove primary identifier when it is not required', () => {
            // S3::Bucket has BucketName as primary identifier but it's not required
            const schema = schemas.schemas.get('AWS::S3::Bucket')!;
            const resourceProperties = {
                BucketName: 'my-bucket',
                VersioningConfiguration: { Status: 'Enabled' },
            };

            transformer.transform(resourceProperties, schema, testLogicalId);

            expect(resourceProperties).not.toHaveProperty('BucketName');
            expect(resourceProperties.VersioningConfiguration).toEqual({ Status: 'Enabled' });
        });

        it('should not modify properties when primary identifier is read-only', () => {
            // EC2::Instance has InstanceId as primary identifier but it's read-only
            const schema = schemas.schemas.get('AWS::EC2::Instance')!;
            const resourceProperties = {
                ImageId: 'ami-12345678',
            };

            transformer.transform(resourceProperties, schema, testLogicalId);

            expect(resourceProperties).not.toHaveProperty('InstanceId');
            expect(resourceProperties.ImageId).toBe('ami-12345678');
        });
    });
});
