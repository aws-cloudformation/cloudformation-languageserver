import { describe, it, expect } from 'vitest';
import { RemoveReadonlyPropertiesTransformer } from '../../../../src/schema/transformers/RemoveReadonlyPropertiesTransformer';
import { combinedSchemas } from '../../../utils/SchemaUtils';

describe('RemoveReadonlyPropertiesTransformer', () => {
    const schemas = combinedSchemas();
    const transformer = new RemoveReadonlyPropertiesTransformer();

    // Test with all available resource schemas
    const resourceTests = [
        {
            typeName: 'AWS::S3::Bucket',
            properties: {
                BucketName: 'my-bucket',
                Arn: 'arn:aws:s3:::my-bucket',
                DomainName: 'my-bucket.s3.amazonaws.com',
                DualStackDomainName: 'my-bucket.s3.dualstack.us-east-1.amazonaws.com',
                RegionalDomainName: 'my-bucket.s3.us-east-1.amazonaws.com',
                WebsiteURL: 'http://my-bucket.s3-website-us-east-1.amazonaws.com',
            },
            expectedAfterTransform: {
                BucketName: 'my-bucket',
            },
        },
        {
            typeName: 'AWS::EC2::Instance',
            properties: {
                ImageId: 'ami-12345678',
                InstanceType: 't2.micro',
                InstanceId: 'i-1234567890abcdef0',
                PrivateDnsName: 'ip-10-0-0-1.ec2.internal',
                PrivateIp: '10.0.0.1',
                PublicDnsName: 'ec2-1-2-3-4.compute-1.amazonaws.com',
                PublicIp: '1.2.3.4',
            },
            expectedAfterTransform: {
                ImageId: 'ami-12345678',
                InstanceType: 't2.micro',
            },
        },
        {
            typeName: 'AWS::IAM::Role',
            properties: {
                RoleName: 'MyRole',
                AssumeRolePolicyDocument: { Version: '2012-10-17', Statement: [] },
                Arn: 'arn:aws:iam::123456789012:role/MyRole',
                RoleId: 'SomeRoleId',
            },
            expectedAfterTransform: {
                RoleName: 'MyRole',
                AssumeRolePolicyDocument: { Version: '2012-10-17', Statement: [] },
            },
        },
        {
            typeName: 'AWS::Lambda::Function',
            properties: {
                FunctionName: 'MyFunction',
                Runtime: 'nodejs18.x',
                Code: { ZipFile: 'exports.handler = async () => {}' },
                Handler: 'index.handler',
                Role: 'arn:aws:iam::123456789012:role/lambda-role',
                Arn: 'arn:aws:lambda:us-east-1:123456789012:function:MyFunction',
            },
            expectedAfterTransform: {
                FunctionName: 'MyFunction',
                Runtime: 'nodejs18.x',
                Code: { ZipFile: 'exports.handler = async () => {}' },
                Handler: 'index.handler',
                Role: 'arn:aws:iam::123456789012:role/lambda-role',
            },
        },
        {
            typeName: 'AWS::EC2::VPC',
            properties: {
                CidrBlock: '10.0.0.0/16',
                VpcId: 'vpc-12345678',
                DefaultNetworkAcl: 'acl-12345678',
                DefaultSecurityGroup: 'sg-12345678',
            },
            expectedAfterTransform: {
                CidrBlock: '10.0.0.0/16',
            },
        },
        {
            typeName: 'AWS::EC2::Subnet',
            properties: {
                VpcId: 'vpc-12345678',
                CidrBlock: '10.0.1.0/24',
                AvailabilityZone: 'us-east-1a',
                SubnetId: 'subnet-12345678',
                NetworkAclAssociationId: 'aclassoc-12345678',
            },
            expectedAfterTransform: {
                VpcId: 'vpc-12345678',
                CidrBlock: '10.0.1.0/24',
                AvailabilityZone: 'us-east-1a',
            },
        },
        {
            typeName: 'AWS::EC2::SecurityGroup',
            properties: {
                GroupDescription: 'My security group',
                VpcId: 'vpc-12345678',
                GroupId: 'sg-12345678',
                GroupName: 'MySecurityGroup',
            },
            expectedAfterTransform: {
                GroupDescription: 'My security group',
                VpcId: 'vpc-12345678',
                GroupName: 'MySecurityGroup',
            },
        },
        {
            typeName: 'AWS::RDS::DBInstance',
            properties: {
                DBInstanceClass: 'db.t3.micro',
                Engine: 'mysql',
                MasterUsername: 'admin',
                AllocatedStorage: '20',
                DBInstanceArn: 'arn:aws:rds:us-east-1:123456789012:db:mydb',
                DbiResourceId: 'db-ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                DBInstanceStatus: 'available',
                Endpoint: { Address: 'mydb.cluster-xyz.us-east-1.rds.amazonaws.com', Port: '3306' },
            },
            expectedAfterTransform: {
                DBInstanceClass: 'db.t3.micro',
                Engine: 'mysql',
                MasterUsername: 'admin',
                AllocatedStorage: '20',
                DBInstanceStatus: 'available', // This might not be read-only in the actual schema
            },
        },
    ];

    for (const { typeName, properties, expectedAfterTransform } of resourceTests) {
        it(`should remove read-only properties from ${typeName}`, () => {
            const schema = schemas.schemas.get(typeName)!;
            const resourceProperties = { ...properties };

            transformer.transform(resourceProperties, schema);

            expect(resourceProperties).toEqual(expectedAfterTransform);
        });
    }

    // Test resources with no read-only properties
    const noReadonlyTests = ['AWS::CloudWatch::Alarm', 'AWS::SNS::Topic', 'AWS::SSM::Parameter'];

    for (const typeName of noReadonlyTests) {
        it(`should not modify ${typeName} when no read-only properties exist`, () => {
            const schema = schemas.schemas.get(typeName)!;
            const resourceProperties = {
                Name: 'MyResource',
                Description: 'Test resource',
            };

            transformer.transform(resourceProperties, schema);

            expect(resourceProperties).toEqual({
                Name: 'MyResource',
                Description: 'Test resource',
            });
        });
    }

    it('should handle missing properties gracefully', () => {
        const schema = schemas.schemas.get('AWS::S3::Bucket')!;
        const resourceProperties = { BucketName: 'my-bucket' };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties).toEqual({ BucketName: 'my-bucket' });
    });
});
