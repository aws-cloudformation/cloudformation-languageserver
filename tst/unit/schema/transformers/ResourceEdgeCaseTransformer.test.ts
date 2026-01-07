import { describe, it, expect } from 'vitest';
import { ResourceEdgeCaseTransformer } from '../../../../src/schema/transformers/ResourceEdgeCaseTransformer';
import { combinedSchemas } from '../../../utils/SchemaUtils';

describe('ResourceEdgeCaseTransformer', () => {
    const schemas = combinedSchemas();
    const transformer = new ResourceEdgeCaseTransformer();

    it('should remove empty Description from AWS::WAFv2::IPSet', () => {
        const schema = schemas.schemas.get('AWS::WAFv2::IPSet')!;
        const resourceProperties = {
            Name: 'test-ipset',
            Description: '',
            Scope: 'REGIONAL',
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties.Description).toBeUndefined();
    });

    it('should remove whitespace-only Description from AWS::WAFv2::IPSet', () => {
        const schema = schemas.schemas.get('AWS::WAFv2::IPSet')!;
        const resourceProperties = {
            Name: 'test-ipset',
            Description: '   ',
            Scope: 'REGIONAL',
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties.Description).toBeUndefined();
    });

    it('should not modify valid Description with leading/trailing whitespace in AWS::WAFv2::IPSet', () => {
        const schema = schemas.schemas.get('AWS::WAFv2::IPSet')!;
        const resourceProperties = {
            Name: 'test-ipset',
            Description: '  Valid description  ',
            Scope: 'REGIONAL',
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties.Description).toBe('  Valid description  ');
    });

    it('should not modify resources without edge case handlers', () => {
        const schema = schemas.schemas.get('AWS::S3::Bucket')!;
        const resourceProperties = {
            BucketName: 'test-bucket',
            Description: '',
        };

        transformer.transform(resourceProperties, schema);

        expect(resourceProperties.Description).toBe('');
    });
});
