import { describe, expect, it } from 'vitest';
import { deletionPolicyValueDocsMap } from '../../../src/artifacts/resourceAttributes/DeletionPolicyPropertyDocs';
import { IntrinsicFunction, TopLevelSection } from '../../../src/context/ContextType';
import { IntrinsicFunctionArgumentHoverProvider } from '../../../src/hover/IntrinsicFunctionArgumentHoverProvider';
import { createResourceContext, createParameterContext } from '../../utils/MockContext';
import { createMockSchemaRetriever } from '../../utils/MockServerComponents';

describe('IntrinsicFunctionArgumentHoverProvider', () => {
    const mockSchemaRetriever = createMockSchemaRetriever();

    it('should return undefined when not inside an intrinsic function', () => {
        const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

        const mockContext = createResourceContext('MyBucket', {
            text: 'MyBucket',
            data: {
                Type: 'AWS::S3::Bucket',
            },
        });

        const result = provider.getInformation(mockContext);

        expect(result).toBeUndefined();
    });

    it('should return undefined when intrinsic function is not supported', () => {
        const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

        // Create a mock context that appears to be inside an intrinsic function
        const mockContext = createResourceContext('MyBucket', {
            text: 'MyBucket',
            data: {
                Type: 'AWS::S3::Bucket',
            },
        });

        // Mock the intrinsicContext to return a function that's not supported
        mockContext.intrinsicContext.inIntrinsic = () => true;
        mockContext.intrinsicContext.intrinsicFunction = () =>
            ({
                type: IntrinsicFunction.Join, // Unsupported function type
            }) as any;

        const result = provider.getInformation(mockContext);

        expect(result).toBeUndefined();
    });

    describe('Positive cases - Ref intrinsic function', () => {
        it('should return hover information for Ref to a resource', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            // Create related entities map with a target resource
            const relatedEntities = new Map();
            const resourcesMap = new Map();
            const targetResource = createResourceContext('MyBucket', {
                text: 'MyBucket',
                data: {
                    Type: 'AWS::S3::Bucket',
                    Properties: {
                        BucketName: 'my-test-bucket',
                    },
                },
            });
            resourcesMap.set('MyBucket', targetResource);
            relatedEntities.set(TopLevelSection.Resources, resourcesMap);

            // Create context for the Ref argument
            const mockContext = createResourceContext(
                'SomeOtherResource',
                {
                    text: 'MyBucket', // This is the argument to !Ref
                    data: { Type: 'AWS::Lambda::Function' },
                },
                relatedEntities,
            );

            // Mock the intrinsicContext for a Ref function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.Ref,
                }) as any;

            const result = provider.getInformation(mockContext);

            expect(result).toBeDefined();
            expect(result).toContain('AWS::S3::Bucket');
            expect(result).toContain('MyBucket');
        });

        it('should return hover information for Ref to a parameter', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            // Create related entities map with a target parameter
            const relatedEntities = new Map();
            const parametersMap = new Map();
            const targetParameter = createParameterContext('BucketName', {
                text: 'BucketName',
                data: {
                    Type: 'String',
                    Description: 'Name of the S3 bucket',
                    Default: 'my-default-bucket',
                },
            });
            parametersMap.set('BucketName', targetParameter);
            relatedEntities.set(TopLevelSection.Parameters, parametersMap);

            // Create context for the Ref argument
            const mockContext = createResourceContext(
                'MyBucket',
                {
                    text: 'BucketName', // This is the argument to !Ref
                    data: { Type: 'AWS::S3::Bucket' },
                },
                relatedEntities,
            );

            // Mock the intrinsicContext for a Ref function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.Ref,
                }) as any;

            const result = provider.getInformation(mockContext);

            expect(result).toBeDefined();
            expect(result).toContain('BucketName');
            expect(result).toContain('string');
        });

        it('should return undefined for Ref when referenced entity is not found', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            // Create context with empty related entities
            const mockContext = createResourceContext(
                'MyBucket',
                {
                    text: 'NonExistentResource',
                    data: { Type: 'AWS::S3::Bucket' },
                },
                new Map(),
            );

            // Mock the intrinsicContext for a Ref function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.Ref,
                }) as any;

            const result = provider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });
    });

    describe('Positive cases - GetAtt intrinsic function', () => {
        it('should return hover information for GetAtt', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            // Create related entities map with a target resource
            const relatedEntities = new Map();
            const resourcesMap = new Map();
            const targetResource = createResourceContext('MyBucket', {
                text: 'MyBucket',
                data: {
                    Type: 'AWS::S3::Bucket',
                    Properties: {
                        BucketName: 'my-test-bucket',
                    },
                },
            });
            resourcesMap.set('MyBucket', targetResource);
            relatedEntities.set(TopLevelSection.Resources, resourcesMap);

            // Create context for the GetAtt argument
            const mockContext = createResourceContext(
                'SomeOtherResource',
                {
                    text: 'MyBucket', // This is the resource name in !GetAtt
                    data: { Type: 'AWS::Lambda::Function' },
                },
                relatedEntities,
            );

            // Mock the intrinsicContext for a GetAtt function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.GetAtt,
                    args: ['MyBucket', 'Arn'],
                }) as any;

            const result = provider.getInformation(mockContext);

            expect(result).toBeDefined();
            expect(result).toContain('AWS::S3::Bucket');
            expect(result).toContain('MyBucket');
        });
    });

    describe('DeletionPolicy values inside If intrinsic functions', () => {
        it('should return documentation for valid DeletionPolicy value "Delete" inside !If', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            const mockContext = createResourceContext('MyBucket', {
                text: 'Delete',
                data: { Type: 'AWS::S3::Bucket', DeletionPolicy: 'Delete' },
                propertyPath: [TopLevelSection.Resources, 'MyBucket', 'DeletionPolicy'],
            });

            // Mock the intrinsicContext for an If function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.If,
                }) as any;

            const result = provider.getInformation(mockContext);
            const expectedDoc = deletionPolicyValueDocsMap.get('Delete');

            expect(result).toBe(expectedDoc);
        });

        it('should return documentation for valid DeletionPolicy value "Retain" inside !If', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            const mockContext = createResourceContext('MyBucket', {
                text: 'Retain',
                data: { Type: 'AWS::S3::Bucket', DeletionPolicy: 'Retain' },
                propertyPath: [TopLevelSection.Resources, 'MyBucket', 'DeletionPolicy'],
            });

            // Mock the intrinsicContext for an If function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.If,
                }) as any;

            const result = provider.getInformation(mockContext);
            const expectedDoc = deletionPolicyValueDocsMap.get('Retain');

            expect(result).toBe(expectedDoc);
        });

        it('should return documentation for valid DeletionPolicy value "Snapshot" inside !If', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            const mockContext = createResourceContext('MyBucket', {
                text: 'Snapshot',
                data: { Type: 'AWS::S3::Bucket', DeletionPolicy: 'Snapshot' },
                propertyPath: [TopLevelSection.Resources, 'MyBucket', 'DeletionPolicy'],
            });

            // Mock the intrinsicContext for an If function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.If,
                }) as any;

            const result = provider.getInformation(mockContext);
            const expectedDoc = deletionPolicyValueDocsMap.get('Snapshot');

            expect(result).toBe(expectedDoc);
        });

        it('should return documentation for valid DeletionPolicy value "RetainExceptOnCreate" inside !If', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            const mockContext = createResourceContext('MyBucket', {
                text: 'RetainExceptOnCreate',
                data: { Type: 'AWS::S3::Bucket', DeletionPolicy: 'RetainExceptOnCreate' },
                propertyPath: [TopLevelSection.Resources, 'MyBucket', 'DeletionPolicy'],
            });

            // Mock the intrinsicContext for an If function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.If,
                }) as any;

            const result = provider.getInformation(mockContext);
            const expectedDoc = deletionPolicyValueDocsMap.get('RetainExceptOnCreate');

            expect(result).toBe(expectedDoc);
        });

        it('should return undefined for invalid DeletionPolicy value inside !If', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            const mockContext = createResourceContext('MyBucket', {
                text: 'InvalidValue',
                data: { Type: 'AWS::S3::Bucket', DeletionPolicy: 'InvalidValue' },
                propertyPath: [TopLevelSection.Resources, 'MyBucket', 'DeletionPolicy'],
            });

            // Mock the intrinsicContext for an If function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.If,
                }) as any;

            const result = provider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined when not in DeletionPolicy context inside !If', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            const mockContext = createResourceContext('MyBucket', {
                text: 'Retain',
                data: { Type: 'AWS::S3::Bucket' },
                propertyPath: [TopLevelSection.Resources, 'MyBucket', 'Properties', 'BucketName'],
            });

            // Mock the intrinsicContext for an If function
            mockContext.intrinsicContext.inIntrinsic = () => true;
            mockContext.intrinsicContext.intrinsicFunction = () =>
                ({
                    type: IntrinsicFunction.If,
                }) as any;

            const result = provider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });
    });

    describe('Edge cases', () => {
        it('should return undefined when context is not ContextWithRelatedEntities', () => {
            const provider = new IntrinsicFunctionArgumentHoverProvider(mockSchemaRetriever);

            // Create a basic context (not ContextWithRelatedEntities)
            const mockContext = createResourceContext('MyBucket', {
                text: 'MyBucket',
                data: { Type: 'AWS::S3::Bucket' },
            });

            // Convert to basic Context by removing relatedEntities functionality
            const basicContext = {
                ...mockContext,
                relatedEntities: undefined,
            } as any;

            // Mock the intrinsicContext for a Ref function
            basicContext.intrinsicContext = {
                inIntrinsic: () => true,
                intrinsicFunction: () => ({
                    type: IntrinsicFunction.Ref,
                }),
            };

            const result = provider.getInformation(basicContext);

            expect(result).toBeUndefined();
        });
    });
});
