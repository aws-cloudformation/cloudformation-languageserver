import { describe, it, expect } from 'vitest';
import { RemoveSystemTagsTransformer } from '../../../../src/schema/transformers/RemoveSystemTagsTransformer';
import { combinedSchemas } from '../../../utils/SchemaUtils';

describe('RemoveSystemTagsTransformer', () => {
    const schemas = combinedSchemas();
    const transformer = new RemoveSystemTagsTransformer();

    // Test with all available resource schemas that support tagging
    const taggableResourceTests = [
        'AWS::S3::Bucket',
        'AWS::EC2::Instance',
        'AWS::IAM::Role',
        'AWS::Lambda::Function',
        'AWS::EC2::VPC',
        'AWS::EC2::Subnet',
        'AWS::EC2::SecurityGroup',
        'AWS::AutoScaling::AutoScalingGroup',
        'AWS::RDS::DBInstance',
        'AWS::SNS::Topic',
        'AWS::SSM::Parameter',
        'AWS::CloudWatch::Alarm',
    ];

    for (const typeName of taggableResourceTests) {
        it(`should remove AWS system tags from ${typeName} object format`, () => {
            const schema = schemas.schemas.get(typeName)!;
            const resourceProperties = {
                Tags: {
                    Environment: 'prod',
                    'aws:cloudformation:stack-name': 'MyStack',
                    Team: 'backend',
                    'aws:cloudformation:logical-id': 'MyResource',
                },
            };

            transformer.transform(resourceProperties, schema);

            expect(resourceProperties).toEqual({
                Tags: {
                    Environment: 'prod',
                    Team: 'backend',
                },
            });
        });

        it(`should remove AWS system tags from ${typeName} array format`, () => {
            const schema = schemas.schemas.get(typeName)!;
            const resourceProperties = {
                Tags: [
                    { Key: 'Environment', Value: 'prod' },
                    { Key: 'aws:cloudformation:stack-name', Value: 'MyStack' },
                    { Key: 'Team', Value: 'backend' },
                    { Key: 'aws:cloudformation:logical-id', Value: 'MyResource' },
                ],
            };

            transformer.transform(resourceProperties, schema);

            expect(resourceProperties).toEqual({
                Tags: [
                    { Key: 'Environment', Value: 'prod' },
                    { Key: 'Team', Value: 'backend' },
                ],
            });
        });
    }

    it('should handle null tags gracefully', () => {
        const schema = schemas.schemas.get('AWS::S3::Bucket')!;
        const resourceProperties = { Tags: null };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties).toEqual({ Tags: null });
    });

    it('should handle malformed tag items in array gracefully', () => {
        const schema = schemas.schemas.get('AWS::EC2::Instance')!;
        const resourceProperties = {
            Tags: [
                { Key: 'Environment', Value: 'prod' },
                'invalid-tag',
                { Key: 'aws:cloudformation:stack-name', Value: 'MyStack' },
                { NotAKey: 'value' },
            ],
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties).toEqual({
            Tags: [{ Key: 'Environment', Value: 'prod' }, 'invalid-tag', { NotAKey: 'value' }],
        });
    });
});
