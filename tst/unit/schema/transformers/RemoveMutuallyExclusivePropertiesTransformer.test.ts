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
});
