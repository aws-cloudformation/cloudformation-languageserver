import { describe, it, expect } from 'vitest';
import { RemoveMutuallyExclusivePropertiesTransformer } from '../../../../src/schema/transformers/RemoveMutuallyExclusivePropertiesTransformer';
import { combinedSchemas } from '../../../utils/SchemaUtils';

describe('RemoveMutuallyExclusivePropertiesTransformer', () => {
    const schemas = combinedSchemas();
    const transformer = new RemoveMutuallyExclusivePropertiesTransformer();

    // Test the main working case - EC2 Instance
    it('should remove mutually exclusive properties from AWS::EC2::Instance', () => {
        const schema = schemas.schemas.get('AWS::EC2::Instance')!;
        const resourceProperties = {
            ImageId: 'ami-12345678',
            InstanceType: 't2.micro',
            SubnetId: 'subnet-12345678',
            NetworkInterfaces: [{ DeviceIndex: 0, SubnetId: 'subnet-87654321' }],
        };

        transformer.transform(resourceProperties, schema);

        // Should keep SubnetId and remove NetworkInterfaces (first encountered wins)
        expect(resourceProperties).toEqual({
            ImageId: 'ami-12345678',
            InstanceType: 't2.micro',
            SubnetId: 'subnet-12345678',
        });
    });

    // Test all resource types to ensure no errors occur
    const allResourceTypes = [
        'AWS::S3::Bucket',
        'AWS::EC2::Instance',
        'AWS::IAM::Role',
        'AWS::Lambda::Function',
        'AWS::EC2::VPC',
        'AWS::EC2::Subnet',
        'AWS::EC2::SecurityGroup',
        'AWS::EC2::LaunchTemplate',
        'AWS::AutoScaling::AutoScalingGroup',
        'AWS::RDS::DBInstance',
        'AWS::CloudWatch::Alarm',
        'AWS::SNS::Topic',
        'AWS::SSM::Parameter',
    ];

    for (const typeName of allResourceTypes) {
        it(`should handle ${typeName} without errors`, () => {
            const schema = schemas.schemas.get(typeName)!;
            const resourceProperties = {
                Name: 'MyResource',
                Description: 'Test resource',
                Tags: { Environment: 'test' },
            };

            // Should not throw any errors
            expect(() => {
                transformer.transform(resourceProperties, schema);
            }).not.toThrow();
        });
    }

    it('should handle empty resource properties', () => {
        const schema = schemas.schemas.get('AWS::EC2::Instance')!;
        const resourceProperties = {};

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties).toEqual({});
    });

    it('should handle resources with only one property from mutually exclusive group', () => {
        const schema = schemas.schemas.get('AWS::EC2::Instance')!;
        const resourceProperties = {
            ImageId: 'ami-12345678',
            InstanceType: 't2.micro',
            SubnetId: 'subnet-12345678',
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties).toEqual({
            ImageId: 'ami-12345678',
            InstanceType: 't2.micro',
            SubnetId: 'subnet-12345678',
        });
    });

    it('should remove mutually exclusive properties from nested WebsiteConfiguration in AWS::S3::Bucket', () => {
        const schema = schemas.schemas.get('AWS::S3::Bucket')!;
        const resourceProperties = {
            BucketName: 'test-bucket',
            WebsiteConfiguration: {
                RedirectAllRequestsTo: {
                    HostName: 'example.com',
                    Protocol: 'https',
                },
                IndexDocument: 'index.html',
                ErrorDocument: 'error.html',
            },
        };

        transformer.transform(resourceProperties, schema);

        // RedirectAllRequestsTo excludes ErrorDocument, IndexDocument, RoutingRules
        // First encountered wins, so RedirectAllRequestsTo is kept
        const websiteConfig = resourceProperties.WebsiteConfiguration as any;
        expect(websiteConfig.RedirectAllRequestsTo).toBeDefined();
        expect(websiteConfig.IndexDocument).toBeUndefined();
        expect(websiteConfig.ErrorDocument).toBeUndefined();
    });

    it('should remove mutually exclusive properties from nested Rule in AWS::S3::Bucket LifecycleConfiguration', () => {
        const schema = schemas.schemas.get('AWS::S3::Bucket')!;
        const resourceProperties = {
            BucketName: 'test-bucket',
            LifecycleConfiguration: {
                Rules: [
                    {
                        Id: 'TestRule',
                        Status: 'Enabled',
                        ObjectSizeLessThan: '1000',
                        AbortIncompleteMultipartUpload: {
                            DaysAfterInitiation: 7,
                        },
                    },
                ],
            },
        };

        transformer.transform(resourceProperties, schema);

        // ObjectSizeLessThan excludes AbortIncompleteMultipartUpload
        const rule = (resourceProperties.LifecycleConfiguration as any).Rules[0];
        expect(rule.ObjectSizeLessThan).toBe('1000');
        expect(rule.AbortIncompleteMultipartUpload).toBeUndefined();
    });

    it('should remove mutually exclusive properties from nested NetworkInterface in AWS::EC2::Instance', () => {
        const schema = schemas.schemas.get('AWS::EC2::Instance')!;
        const resourceProperties = {
            ImageId: 'ami-12345678',
            InstanceType: 't2.micro',
            NetworkInterfaces: [
                {
                    DeviceIndex: 0,
                    AssociatePublicIpAddress: true,
                    NetworkInterfaceId: 'eni-12345678',
                },
            ],
        };

        transformer.transform(resourceProperties, schema);

        // AssociatePublicIpAddress excludes NetworkInterfaceId
        const networkInterface = (resourceProperties.NetworkInterfaces as any[])[0];
        expect(networkInterface.AssociatePublicIpAddress).toBe(true);
        expect(networkInterface.NetworkInterfaceId).toBeUndefined();
    });

    it('should remove mutually exclusive properties from nested ByteMatchStatement in AWS::WAFv2::WebACL', () => {
        const schema = schemas.schemas.get('AWS::WAFv2::WebACL')!;
        const resourceProperties = {
            Name: 'TestWebACL',
            Scope: 'REGIONAL',
            DefaultAction: { Allow: {} },
            VisibilityConfig: {
                CloudWatchMetricsEnabled: true,
                MetricName: 'TestMetric',
                SampledRequestsEnabled: true,
            },
            Rules: [
                {
                    Name: 'TestRule',
                    Priority: 1,
                    Statement: {
                        ByteMatchStatement: {
                            FieldToMatch: { UriPath: {} },
                            PositionalConstraint: 'CONTAINS',
                            SearchString: 'test',
                            SearchStringBase64: 'dGVzdA==',
                            TextTransformations: [{ Priority: 0, Type: 'NONE' }],
                        },
                    },
                    VisibilityConfig: {
                        CloudWatchMetricsEnabled: true,
                        MetricName: 'TestRuleMetric',
                        SampledRequestsEnabled: true,
                    },
                },
            ],
        };

        transformer.transform(resourceProperties, schema);

        // SearchString excludes SearchStringBase64 (first encountered wins)
        const byteMatchStatement = (resourceProperties.Rules as any[])[0].Statement.ByteMatchStatement;
        expect(byteMatchStatement.SearchString).toBe('test');
        expect(byteMatchStatement.SearchStringBase64).toBeUndefined();
    });
});
