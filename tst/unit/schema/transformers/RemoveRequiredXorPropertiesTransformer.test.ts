import { describe, it, expect } from 'vitest';
import { RemoveRequiredXorPropertiesTransformer } from '../../../../src/schema/transformers/RemoveRequiredXorPropertiesTransformer';
import { combinedSchemas } from '../../../utils/SchemaUtils';

describe('RemoveRequiredXorPropertiesTransformer', () => {
    const schemas = combinedSchemas();
    const transformer = new RemoveRequiredXorPropertiesTransformer();

    it('should return early when no requiredXor data exists for resource type', () => {
        const schema = schemas.schemas.get('AWS::S3::Bucket')!;
        const resourceProperties = {
            BucketName: 'test-bucket',
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties).toEqual({
            BucketName: 'test-bucket',
        });
    });

    it('should handle empty resource properties', () => {
        const schema = schemas.schemas.get('AWS::EC2::Instance')!;
        const resourceProperties = {};

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties).toEqual({});
    });

    it('should handle nested objects recursively', () => {
        const schema = schemas.schemas.get('AWS::EC2::Instance')!;
        const resourceProperties = {
            ImageId: 'ami-12345678',
            NestedObject: {
                SomeProperty: 'value',
            },
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties.NestedObject).toBeDefined();
    });

    it('should handle arrays with nested objects', () => {
        const schema = schemas.schemas.get('AWS::EC2::Instance')!;
        const resourceProperties = {
            ImageId: 'ami-12345678',
            Tags: [
                { Key: 'Name', Value: 'Test' },
                { Key: 'Env', Value: 'Dev' },
            ],
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties.Tags).toHaveLength(2);
    });
});
