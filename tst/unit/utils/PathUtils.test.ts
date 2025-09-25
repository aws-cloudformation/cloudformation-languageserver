import { describe, it, expect } from 'vitest';
import { templatePathToJsonPointerPath } from '../../../src/utils/PathUtils';

describe('PathUtils', () => {
    describe('templatePathToJsonPointerPath', () => {
        it('should convert simple property paths', () => {
            expect(templatePathToJsonPointerPath(['BucketName'])).toEqual('/properties/BucketName');
            expect(templatePathToJsonPointerPath(['BucketEncryption'])).toEqual('/properties/BucketEncryption');
        });

        it('should convert nested property paths', () => {
            expect(templatePathToJsonPointerPath(['BucketEncryption', 'ServerSideEncryptionConfiguration'])).toEqual(
                '/properties/BucketEncryption/ServerSideEncryptionConfiguration',
            );
            expect(templatePathToJsonPointerPath(['CorsConfiguration', 'CorsRules'])).toEqual(
                '/properties/CorsConfiguration/CorsRules',
            );
        });

        it('should convert array indices to wildcards', () => {
            expect(templatePathToJsonPointerPath(['Tags', 0])).toEqual('/properties/Tags/*');
            expect(templatePathToJsonPointerPath(['Tags', 0, 'Key'])).toEqual('/properties/Tags/*/Key');
            expect(templatePathToJsonPointerPath(['Tags', 123, 'Value'])).toEqual('/properties/Tags/*/Value');
        });

        it('should handle intrinsic functions by stopping at them', () => {
            expect(templatePathToJsonPointerPath(['BucketName', 'Fn::If'])).toEqual('/properties/BucketName');
            expect(templatePathToJsonPointerPath(['BucketName', 'Fn::GetAtt'])).toEqual('/properties/BucketName');
            expect(templatePathToJsonPointerPath(['BucketName', 'Ref'])).toEqual('/properties/BucketName');
            expect(templatePathToJsonPointerPath(['Ref'])).toEqual('/properties');
        });

        it('should handle Fn::If specially', () => {
            // Fn::If/0 is condition name - should return path up to that point
            expect(templatePathToJsonPointerPath(['BucketName', 'Fn::If', 0])).toEqual('/properties/BucketName');
            expect(templatePathToJsonPointerPath(['Tags', 'Fn::If', 0, 'Key'])).toEqual('/properties/Tags');

            // Fn::If/1 and Fn::If/2 should be stripped out
            expect(templatePathToJsonPointerPath(['BucketName', 'Fn::If', 1])).toEqual('/properties/BucketName');
            expect(templatePathToJsonPointerPath(['BucketName', 'Fn::If', 2])).toEqual('/properties/BucketName');
            expect(templatePathToJsonPointerPath(['Tags', 'Fn::If', 1, 'Key'])).toEqual('/properties/Tags/Key');
            expect(templatePathToJsonPointerPath(['Tags', 'Fn::If', 2, 'Key'])).toEqual('/properties/Tags/Key');

            // Complex nested case
            expect(templatePathToJsonPointerPath(['Tags', 0, 'Fn::If', 1, 'Key'])).toEqual('/properties/Tags/*/Key');
        });

        it('should handle complex paths with mixed segments', () => {
            expect(
                templatePathToJsonPointerPath([
                    'BucketEncryption',
                    'ServerSideEncryptionConfiguration',
                    0,
                    'ServerSideEncryptionByDefault',
                ]),
            ).toEqual('/properties/BucketEncryption/ServerSideEncryptionConfiguration/*/ServerSideEncryptionByDefault');
            expect(templatePathToJsonPointerPath(['CorsConfiguration', 'CorsRules', 0, 'AllowedMethods', 1])).toEqual(
                '/properties/CorsConfiguration/CorsRules/*/AllowedMethods/*',
            );
        });

        it('should preserve existing wildcards', () => {
            expect(templatePathToJsonPointerPath(['Tags', '*'])).toEqual('/properties/Tags/*');
            expect(templatePathToJsonPointerPath(['Tags', '*', 'Key'])).toEqual('/properties/Tags/*/Key');
            expect(
                templatePathToJsonPointerPath(['CorsConfiguration', 'CorsRules', '*', 'AllowedMethods', '*']),
            ).toEqual('/properties/CorsConfiguration/CorsRules/*/AllowedMethods/*');
        });

        it('should handle edge cases', () => {
            expect(templatePathToJsonPointerPath([0])).toEqual('/properties/*');
            expect(templatePathToJsonPointerPath(['Fn::GetAtt'])).toEqual('/properties');
            expect(templatePathToJsonPointerPath(['Property', 'Fn::Sub', 0])).toEqual('/properties/Property');
        });

        it('should handle empty arrays', () => {
            expect(templatePathToJsonPointerPath([])).toEqual('/properties');
        });
    });
});
