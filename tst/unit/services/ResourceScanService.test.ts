import { ScannedResource } from '@aws-sdk/client-cloudformation';
import { describe, it, expect } from 'vitest';
import { formatScannedResourcesForAI } from '../../../src/services/ResourceScanService';

describe('ResourceScanService', () => {
    describe('formatScannedResourcesForAI', () => {
        it('should return message when no resources found', () => {
            const result = formatScannedResourcesForAI({
                resources: [],
                totalCount: 0,
                resourceTypes: new Set(),
            });

            expect(result).toBe('No related resources found in your AWS account.');
        });

        it('should format resources grouped by type', () => {
            const resources: ScannedResource[] = [
                { ResourceType: 'AWS::S3::Bucket', ResourceIdentifier: { BucketName: 'bucket1' } },
                { ResourceType: 'AWS::S3::Bucket', ResourceIdentifier: { BucketName: 'bucket2' } },
                { ResourceType: 'AWS::Lambda::Function', ResourceIdentifier: { FunctionName: 'func1' } },
            ];

            const result = formatScannedResourcesForAI({
                resources,
                totalCount: 3,
                resourceTypes: new Set(['AWS::S3::Bucket', 'AWS::Lambda::Function']),
            });

            expect(result).toContain('Found 3 related resources');
            expect(result).toContain('AWS::S3::Bucket');
            expect(result).toContain('AWS::Lambda::Function');
            expect(result).toContain('bucket1');
            expect(result).toContain('func1');
        });

        it('should limit resources per type to 10', () => {
            const resources: ScannedResource[] = Array.from({ length: 15 }, (_, i) => ({
                ResourceType: 'AWS::S3::Bucket',
                ResourceIdentifier: { BucketName: `bucket${i}` },
            }));

            const result = formatScannedResourcesForAI({
                resources,
                totalCount: 15,
                resourceTypes: new Set(['AWS::S3::Bucket']),
            });

            expect(result).toContain('... and 5 more');
        });

        it('should list resource types at the end', () => {
            const resources: ScannedResource[] = [
                { ResourceType: 'AWS::S3::Bucket', ResourceIdentifier: { BucketName: 'bucket1' } },
            ];

            const result = formatScannedResourcesForAI({
                resources,
                totalCount: 1,
                resourceTypes: new Set(['AWS::S3::Bucket']),
            });

            expect(result).toContain('Resource Types Available:');
            expect(result).toContain('AWS::S3::Bucket');
        });

        it('should handle resources without ResourceType', () => {
            const resources: ScannedResource[] = [
                { ResourceIdentifier: { Id: 'unknown' } },
                { ResourceType: 'AWS::S3::Bucket', ResourceIdentifier: { BucketName: 'bucket1' } },
            ];

            const result = formatScannedResourcesForAI({
                resources,
                totalCount: 2,
                resourceTypes: new Set(['AWS::S3::Bucket']),
            });

            expect(result).toContain('AWS::S3::Bucket');
        });
    });
});
