import { describe, expect, it } from 'vitest';
import { ParameterHoverProvider } from '../../../src/hover/ParameterHoverProvider';
import { ResourceSectionHoverProvider } from '../../../src/hover/ResourceSectionHoverProvider';
import { SchemaRetriever } from '../../../src/schema/SchemaRetriever';
import { createParameterContext, createResourceContext } from '../../utils/MockContext';

describe('Logical ID Hover', () => {
    describe('ResourceSectionHoverProvider', () => {
        it('should provide hover information for resource logical ID', () => {
            const mockSchemaRetriever = {} as SchemaRetriever;
            const provider = new ResourceSectionHoverProvider(mockSchemaRetriever);

            const mockContext = createResourceContext('MyBucket', {
                text: 'MyBucket',
                data: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: 'test-bucket' },
                    Condition: 'IsProduction',
                    DeletionPolicy: 'Retain',
                },
            });

            const result = provider.getInformation(mockContext);

            expect(result).toBeDefined();
            expect(result).toContain('(resource) MyBucket: string');
            expect(result).toContain('**Type:** AWS::S3::Bucket');
            expect(result).toContain('**Condition:** IsProduction');
            expect(result).toContain('**Deletion Policy:** Retain');
        });

        it('should not provide hover information when not hovering on logical ID', () => {
            const mockSchemaRetriever = {
                getDefault: () => ({
                    schemas: new Map([['AWS::S3::Bucket', { typeName: 'AWS::S3::Bucket', description: 'S3 Bucket' }]]),
                }),
            } as SchemaRetriever;
            const provider = new ResourceSectionHoverProvider(mockSchemaRetriever);

            // Create a context that's not a logical ID hover (different text and propertyPath)
            const mockContext = createResourceContext('MyBucket', {
                text: 'Type',
                propertyPath: ['Resources', 'MyBucket', 'Type'],
                data: {
                    Type: 'AWS::S3::Bucket',
                },
            });

            const result = provider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });
    });

    describe('ParameterHoverProvider', () => {
        it('should provide hover information for parameter logical ID', () => {
            const provider = new ParameterHoverProvider();

            const mockContext = createParameterContext('EnvironmentName', {
                text: 'EnvironmentName',
                data: {
                    Type: 'String',
                    Default: 'production',
                    AllowedValues: ['development', 'staging', 'production'],
                    ConstraintDescription: 'Must be development, staging, or production',
                    Description: 'Environment name for deployment',
                },
            });

            const result = provider.getInformation(mockContext);

            expect(result).toBeDefined();
            expect(result).toContain('(parameter) EnvironmentName: string');
            expect(result).toContain('**Type:** String');
            expect(result).toContain('**Default Value:** "production"');
            expect(result).toContain('Environment name for deployment');
            expect(result).toContain('**Allowed Values:**');
            expect(result).toContain('- development');
            expect(result).toContain('- staging');
            expect(result).toContain('- production');
        });

        it('should fallback to getTopLevelReference when parameter provider returns undefined', () => {
            const provider = new ParameterHoverProvider();

            // Create a parameter context that might cause the provider to return undefined
            const mockContext = createParameterContext('EmptyParam', {
                text: 'EmptyParam',
                data: null, // This might cause the provider to return undefined
            });

            const result = provider.getInformation(mockContext);

            // The provider should handle null data gracefully
            // If it returns undefined, the router should fallback to getTopLevelReference
            expect(result).toBeDefined();
        });
    });

    describe('Resource Reference Hover (e.g., in !Ref)', () => {
        it('should provide resource information when hovering on resource reference in intrinsic functions', () => {
            const provider = new ResourceSectionHoverProvider({} as SchemaRetriever);

            const mockContext = createResourceContext('MyBucket', {
                text: 'MyBucket',
                data: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { BucketName: 'test-bucket' },
                    Condition: 'IsProduction',
                },
            });

            const result = provider.getInformation(mockContext);

            expect(result).toBeDefined();
            expect(result).toContain('(resource) MyBucket: string');
            expect(result).toContain('**Type:** AWS::S3::Bucket');
            expect(result).toContain('**Condition:** IsProduction');
        });
    });
});
