import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { Context } from '../../../src/context/Context';
import { ContextManager } from '../../../src/context/ContextManager';
import { TopLevelSection } from '../../../src/context/ContextType';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { ResourceSectionHoverProvider } from '../../../src/hover/ResourceSectionHoverProvider';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { createResourceContext } from '../../utils/MockContext';
import { createMockClientMessage, createMockSchemaRetriever } from '../../utils/MockServerComponents';
import { combinedSchemas, combineSchema, Schemas } from '../../utils/SchemaUtils';
import { docPosition, Templates } from '../../utils/TemplateUtils';

describe('ResourceSectionHoverProvider', () => {
    const mockSchemaRetriever = createMockSchemaRetriever();
    const s3BucketSchema = new ResourceSchema(Schemas.S3Bucket.contents);
    const mockCombinedSchemas = combinedSchemas([
        Schemas.S3Bucket,
        Schemas.EC2Instance,
        combineSchema(s3BucketSchema, 'AWS::S3::BucketNameRequired', {
            required: ['BucketName'],
        }),
        combineSchema(s3BucketSchema, 'AWS::S3::BucketNameEmptyRequired', {
            required: [],
        }),
        combineSchema(s3BucketSchema, 'AWS::S3::BucketNameBadRef', {
            properties: {
                UnresolvableProperty: {
                    $ref: '#/definitions/NonExistentDefinition',
                    description: 'A property with unresolvable reference',
                },
            },
        }),
    ]);
    const hoverProvider = new ResourceSectionHoverProvider(mockSchemaRetriever);

    beforeEach(() => {
        mockSchemaRetriever.getDefault.reset();
        mockSchemaRetriever.getDefault.returns(mockCombinedSchemas);
    });

    // Helper function to create a context with a Resource entity
    function createResourceContextWithEntity(
        text: string,
        logicalId: string,
        resourceType: string,
        properties?: Record<string, any>,
        isResourceProperty: boolean = false,
        propertyPath?: any[],
    ): Context {
        const data = {
            Type: resourceType,
            Properties: properties,
        };
        if (isResourceProperty) {
            return createResourceContext(logicalId, {
                text,
                data,
                propertyPath: propertyPath ?? [TopLevelSection.Resources, logicalId, 'Properties', text],
            });
        }

        return createResourceContext(logicalId, { text, data });
    }

    describe('Resource Type Hover', () => {
        it('should return documentation for a resource type', () => {
            const mockContext = createResourceContextWithEntity(
                'AWS::S3::BucketNameRequired',
                'MyS3Bucket',
                'AWS::S3::BucketNameRequired',
            );
            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('### AWS::S3::Bucket');
            expect(result).toContain('The ``AWS::S3::Bucket`` resource creates an Amazon S3 bucket');
            expect(result).toContain('#### Required Properties:');
            expect(result).toContain('- BucketName');
        });

        it('should handle different resource type', () => {
            const mockContext = createResourceContextWithEntity(
                'AWS::EC2::Instance',
                'MyEC2Instance',
                'AWS::EC2::Instance',
            );
            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('### AWS::EC2::Instance');
            expect(result).toContain('Resource Type definition for AWS::EC2::Instance');
        });

        it('should return undefined when resource type is not provided', () => {
            const mockContext = createResourceContextWithEntity('AWS::S3::Bucket', 'MyS3Bucket', ''); // Empty resource type
            const result = hoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined when schema is not found', () => {
            const mockContext = createResourceContextWithEntity(
                'AWS::NonExistent::Resource',
                'MyResource',
                'AWS::NonExistent::Resource',
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
            expect(mockSchemaRetriever.getDefault.callCount).toBe(1);
        });

        it('should handle resource schema without required properties', () => {
            const mockContext = createResourceContextWithEntity('AWS::S3::Bucket', 'MyS3Bucket', 'AWS::S3::Bucket');
            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('### AWS::S3::Bucket');
            expect(result).toContain('The ``AWS::S3::Bucket`` resource creates an Amazon S3 bucket');
            expect(result).not.toContain('#### Required Properties:');
        });

        it('should handle resource schema with empty required properties', () => {
            const mockContext = createResourceContextWithEntity(
                'AWS::S3::BucketNameEmptyRequired',
                'MyS3Bucket',
                'AWS::S3::BucketNameEmptyRequired',
            );
            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('### AWS::S3::BucketNameEmptyRequired');
            expect(result).toContain('The ``AWS::S3::Bucket`` resource creates an Amazon S3 bucket');
            expect(result).not.toContain('#### Required Properties:');
        });
    });

    describe('Property Hover', () => {
        it('should return property documentation with markdown header for simple property', () => {
            const properties = { BucketName: 'my-bucket' };
            const mockContext = createResourceContextWithEntity(
                'BucketName',
                'MyS3Bucket',
                'AWS::S3::Bucket',
                properties,
                true,
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('```typescript');
            expect(result).toContain('string');
            expect(result).toContain('A name for the bucket');
            expect(result).toContain('^[a-z0-9.-]*$');
            expect(mockSchemaRetriever.getDefault.callCount).toBe(1);
        });

        it('should return property documentation with $ref resolution', () => {
            const properties = { PublicAccessBlockConfiguration: { BlockPublicAcls: true } };
            const mockContext = createResourceContextWithEntity(
                'PublicAccessBlockConfiguration',
                'MyS3Bucket',
                'AWS::S3::Bucket',
                properties,
                true,
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('```typescript');
            expect(result).toContain('object');
            expect(result).toContain('The PublicAccessBlock configuration that you want to apply to this Amazon S3');
            expect(result).toContain('BlockPublicAcls');
            expect(result).toContain('BlockPublicPolicy');
        });

        it('should return property documentation for complex property with nested objects', () => {
            const properties = { Tags: [{ Key: 'Environment', Value: 'Production' }] };
            const mockContext = createResourceContextWithEntity(
                'Tags',
                'MyS3Bucket',
                'AWS::S3::Bucket',
                properties,
                true,
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('```typescript');
            expect(result).toContain('type Tags = { Key: string; Value: string }[]'); // Shows array structure with simplified nested objects
            expect(result).toContain('An arbitrary set of tags (key-value pairs) for this S3 bucket.');
        });

        it('should handle property with $ref that cannot be resolved', () => {
            const properties = { UnresolvableProperty: {} };
            const mockContext = createResourceContextWithEntity(
                'UnresolvableProperty',
                'MyS3Bucket',
                'AWS::S3::BucketNameBadRef',
                properties,
                true,
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('```typescript');
            expect(result).toContain('A property with unresolvable reference');
        });

        it('should return error message for property not defined in schema', () => {
            const properties = { UndefinedProperty: 'some-value' };
            const mockContext = createResourceContextWithEntity(
                'UndefinedProperty',
                'MyS3Bucket',
                'AWS::S3::Bucket',
                properties,
                true,
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain(
                'Property `UndefinedProperty` at path `/properties/UndefinedProperty` is not defined in `AWS::S3::Bucket` schema.',
            );
        });

        it('should return undefined when resource has no properties', () => {
            const mockContext = createResourceContextWithEntity('SomeProperty', 'MyS3Bucket', 'AWS::S3::Bucket'); // No properties

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined when hovering over resource type instead of property', () => {
            const properties = { BucketName: 'my-bucket' };
            const mockContext = createResourceContextWithEntity(
                'AWS::S3::Bucket',
                'MyS3Bucket',
                'AWS::S3::Bucket',
                properties,
            );

            const result = hoverProvider.getInformation(mockContext);

            // Should return resource type documentation, not property documentation
            expect(result).toContain('### AWS::S3::Bucket');
            expect(result).toContain('The ``AWS::S3::Bucket`` resource creates an Amazon S3 bucket');
            expect(result).not.toContain('property of');
        });

        it('should handle property hover when context is not a resource property', () => {
            const properties = { BucketName: 'my-bucket' };
            const mockContext = createResourceContextWithEntity(
                'NonExistentProperty',
                'MyS3Bucket',
                'AWS::S3::Bucket',
                properties,
                false,
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined when hovering over property values', () => {
            const properties = { BucketName: 'my-bucket' };
            const mockContext = createResourceContextWithEntity(
                'my-bucket',
                'MyS3Bucket',
                'AWS::S3::Bucket',
                properties,
                true,
                ['some value'],
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return property documentation only for property keys', () => {
            const properties = { BucketName: 'my-bucket' };
            const mockContext = createResourceContextWithEntity(
                'BucketName',
                'MyS3Bucket',
                'AWS::S3::Bucket',
                properties,
                true,
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('```typescript');
            expect(result).toContain('string');
            expect(result).toContain('A name for the bucket');
        });

        it('should return property documentation for nested property hover', () => {
            const properties = {
                PublicAccessBlockConfiguration: {
                    BlockPublicAcls: true,
                    BlockPublicPolicy: false,
                },
            };

            const mockContext = createResourceContextWithEntity(
                'BlockPublicAcls',
                'MyS3Bucket',
                'AWS::S3::Bucket',
                properties,
                true,
                [
                    TopLevelSection.Resources,
                    'MyS3Bucket',
                    'Properties',
                    'PublicAccessBlockConfiguration',
                    'BlockPublicAcls',
                ],
            );

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toBeDefined();
            expect(result).toContain('BlockPublicAcls');
            expect(result).toContain('boolean');
        });
    });

    describe('Resource Attribute Hover', () => {
        let syntaxTreeManager: SyntaxTreeManager;
        let contextManager: ContextManager;
        const templateContent = Templates.sample.yaml.contents;
        const testUri = Templates.sample.yaml.fileName;

        beforeAll(() => {
            syntaxTreeManager = new SyntaxTreeManager(createMockClientMessage());
            syntaxTreeManager.add(testUri, templateContent);
            contextManager = new ContextManager(syntaxTreeManager);
        });

        afterAll(() => {
            syntaxTreeManager.deleteAllTrees();
        });

        function getContextAt(line: number, character: number, uri: string = testUri): Context | undefined {
            return contextManager.getContext(docPosition(uri, line, character));
        }

        describe('Resource Attribute Hover Documentation', () => {
            it('should return hover documentation for CreationPolicy attribute', () => {
                const context = getContextAt(90, 4); // Position at "CreationPolicy:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttribute).toBe(true);

                const result = hoverProvider.getInformation(context!);

                expect(result).toBeDefined();
                expect(result).toContain('**CreationPolicy');
                expect(result).toContain('Prevents resource status from reaching create complete');
                expect(result).toContain('Configuration object with AutoScalingCreationPolicy and ResourceSignal');
                expect(result).toContain(
                    'https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html',
                );
            });

            it('should return hover documentation for DeletionPolicy attribute', () => {
                const context = getContextAt(94, 4); // Position at "DeletionPolicy:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttribute).toBe(true);

                const result = hoverProvider.getInformation(context!);

                expect(result).toBeDefined();
                expect(result).toContain('**DeletionPolicy');
                expect(result).toContain('Specifies what happens to the resource when the stack is deleted');
                expect(result).toContain('Available options: Delete (default), Retain, Snapshot');
                expect(result).toContain(
                    'https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html',
                );
            });

            it('should return hover documentation for UpdatePolicy attribute', () => {
                const context = getContextAt(95, 4); // Position at "UpdatePolicy:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttribute).toBe(true);

                const result = hoverProvider.getInformation(context!);

                expect(result).toBeDefined();
                expect(result).toContain('**UpdatePolicy');
                expect(result).toContain('Specifies how CloudFormation handles updates to the resource');
                expect(result).toContain('Configuration object with AutoScalingRollingUpdate');
                expect(result).toContain(
                    'https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html',
                );
            });

            it('should return hover documentation for UpdateReplacePolicy attribute', () => {
                const context = getContextAt(99, 4); // Position at "UpdateReplacePolicy:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttribute).toBe(true);

                const result = hoverProvider.getInformation(context!);

                expect(result).toBeDefined();
                expect(result).toContain('**UpdateReplacePolicy');
                expect(result).toContain(
                    'Specifies what happens to the resource when a replacement is required during update',
                );
                expect(result).toContain('Available options: Delete, Retain, Snapshot');
                expect(result).toContain(
                    'https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html',
                );
            });

            it('should return hover documentation for Condition attribute', () => {
                const context = getContextAt(100, 4); // Position at "Condition:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttribute).toBe(true);

                const result = hoverProvider.getInformation(context!);

                expect(result).toBeDefined();
                expect(result).toContain('**Condition');
                expect(result).toContain('Associates the resource with a condition defined in the Conditions section');
                expect(result).toContain('Value must be a reference to a condition name');
                expect(result).toContain('Resource will be conditionally created based on the value being true');
                expect(result).toContain(
                    'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html#environment-based-resource-creation',
                );
            });

            it('should return hover documentation for DependsOn attribute', () => {
                const context = getContextAt(101, 4); // Position at "DependsOn:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttribute).toBe(true);

                const result = hoverProvider.getInformation(context!);

                expect(result).toBeDefined();
                expect(result).toContain('**DependsOn');
                expect(result).toContain('Specifies explicit dependencies between resources');
                expect(result).toContain('Value can be a string (single dependency) or array of strings');
                expect(result).toContain(
                    'https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-dependson.html',
                );
            });

            it('should return hover documentation for Metadata attribute', () => {
                const context = getContextAt(104, 4); // Position at "Metadata:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttribute).toBe(true);

                const result = hoverProvider.getInformation(context!);

                expect(result).toBeDefined();
                expect(result).toContain('**Metadata');
                expect(result).toContain('Associates arbitrary metadata with the resource');
                expect(result).toContain('Value is a JSON/YAML object with custom key-value pairs');
                expect(result).toContain(
                    'https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-metadata.html',
                );
                // Should not contain property-style documentation
                expect(result).not.toContain('property of');
                expect(result).not.toContain('```json');
            });

            it('should return undefined for resource attribute when resource does not have that attribute', () => {
                const mockContext = createResourceContext('EC2Instance', {
                    text: 'DeletionPolicy',
                    data: { ImageId: 'ami-123' },
                });

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });

            it('should not return resource attribute documentation for non-resource-attributes', () => {
                const context = getContextAt(71, 6); // Position at "Properties:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttribute).toBe(false);

                const result = hoverProvider.getInformation(context!);

                if (result) {
                    expect(result).not.toContain('### Properties');
                    expect(result).not.toContain(
                        'https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-',
                    );
                }
            });
        });
    });
});
