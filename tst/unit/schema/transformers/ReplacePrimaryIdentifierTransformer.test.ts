import { describe, expect, it } from 'vitest';
import { ReplacePrimaryIdentifierTransformer } from '../../../../src/schema/transformers/ReplacePrimaryIdentifierTransformer';
import { combinedSchemas } from '../../../utils/SchemaUtils';

describe('ReplacePrimaryIdentifierTransformer', () => {
    const schemas = combinedSchemas();
    const transformer = new ReplacePrimaryIdentifierTransformer();

    // Test with all 13 available resource schemas
    const resourceTests = [
        {
            typeName: 'AWS::S3::Bucket',
            properties: {
                BucketName: 'my-existing-bucket',
                VersioningConfiguration: { Status: 'Enabled' },
            },
            expectedAfterTransform: {
                BucketName: '<CLONE INPUT REQUIRED>',
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
                RoleName: '<CLONE INPUT REQUIRED>',
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
                FunctionName: '<CLONE INPUT REQUIRED>',
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
                AutoScalingGroupName: '<CLONE INPUT REQUIRED>',
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
                DBInstanceIdentifier: '<CLONE INPUT REQUIRED>',
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
                AlarmName: '<CLONE INPUT REQUIRED>',
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
                Name: '<CLONE INPUT REQUIRED>',
                Type: 'String',
                Value: 'test-value',
            },
        },
    ];

    for (const { typeName, properties, expectedAfterTransform } of resourceTests) {
        it(`should replace primary identifier properties in ${typeName}`, () => {
            const schema = schemas.schemas.get(typeName)!;
            const resourceProperties = { ...properties };

            transformer.transform(resourceProperties, schema);

            expect(resourceProperties).toEqual(expectedAfterTransform);
        });
    }
});
