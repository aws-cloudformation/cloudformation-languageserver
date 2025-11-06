import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { creationPolicyPropertyDocsMap } from '../../../src/artifacts/resourceAttributes/CreationPolicyPropertyDocs';
import { deletionPolicyValueDocsMap } from '../../../src/artifacts/resourceAttributes/DeletionPolicyPropertyDocs';
import { updatePolicyPropertyDocsMap } from '../../../src/artifacts/resourceAttributes/UpdatePolicyPropertyDocs';
import { updateReplacePolicyValueDocsMap } from '../../../src/artifacts/resourceAttributes/UpdateReplacePolicyPropertyDocs-1';
import { Context } from '../../../src/context/Context';
import { ContextManager } from '../../../src/context/ContextManager';
import {
    TopLevelSection,
    ResourceAttribute,
    CreationPolicyProperty,
    ResourceSignalProperty,
    UpdatePolicyProperty,
    AutoScalingRollingUpdateProperty,
} from '../../../src/context/ContextType';
import { ForEachResource, Resource } from '../../../src/context/semantic/Entity';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { ResourceSectionHoverProvider } from '../../../src/hover/ResourceSectionHoverProvider';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { createMockContext, createResourceContext } from '../../utils/MockContext';
import { createMockSchemaRetriever } from '../../utils/MockServerComponents';
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
            syntaxTreeManager = new SyntaxTreeManager();
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

        describe('CreationPolicy Property Hover Documentation', () => {
            it('should return hover documentation for CreationPolicy.ResourceSignal property', () => {
                const context = getContextAt(91, 6); // Position at "ResourceSignal:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttributeProperty()).toBe(true);

                const result = hoverProvider.getInformation(context!);
                const expectedDoc = creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}`,
                );

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return hover documentation for CreationPolicy.ResourceSignal.Count property', () => {
                const context = getContextAt(92, 8); // Position at "Count:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttributeProperty()).toBe(true);

                const result = hoverProvider.getInformation(context!);
                const expectedDoc = creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Count}`,
                );

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return hover documentation for CreationPolicy.ResourceSignal.Timeout property', () => {
                const context = getContextAt(93, 8); // Position at "Timeout:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttributeProperty()).toBe(true);

                const result = hoverProvider.getInformation(context!);
                const expectedDoc = creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Timeout}`,
                );

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return undefined for invalid CreationPolicy property paths', () => {
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'InvalidProperty',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        CreationPolicy: {
                            InvalidProperty: 'value',
                        },
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'CreationPolicy', 'InvalidProperty'],
                });

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });

            it('should return undefined for malformed CreationPolicy property paths', () => {
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'Count',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            BucketName: 'test-bucket',
                        },
                    },
                    propertyPath: [TopLevelSection.Resources], // Too short - only 1 segment, not a resource attribute
                });

                expect(mockContext.isResourceAttribute).toBe(false);
                expect(mockContext.isResourceAttributeProperty()).toBe(false);

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });

            it('should handle nested CreationPolicy properties correctly', () => {
                const context = getContextAt(92, 8); // Position at "Count:" in the sample template

                expect(context).toBeDefined();
                expect(context!.isResourceAttributeProperty()).toBe(true);

                const result = hoverProvider.getInformation(context!);
                const expectedDoc = creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Count}`,
                );

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return undefined when context is not a resource attribute property', () => {
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'BucketName',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            BucketName: 'my-bucket',
                        },
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'Properties', 'BucketName'],
                });

                expect(mockContext.isResourceAttributeProperty()).toBe(false);

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeDefined();
                expect(result).not.toBe(
                    creationPolicyPropertyDocsMap.get(
                        `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}`,
                    ),
                );
            });

            it('should return undefined for unsupported CreationPolicy property combinations', () => {
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'NonExistentProperty',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        CreationPolicy: {
                            ResourceSignal: {
                                NonExistentProperty: 'value',
                            },
                        },
                    },
                    propertyPath: [
                        TopLevelSection.Resources,
                        'S3Bucket',
                        'CreationPolicy',
                        'ResourceSignal',
                        'NonExistentProperty',
                    ],
                });

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });
        });

        describe('DeletionPolicy Value Hover Documentation', () => {
            it('should return documentation for DeletionPolicy Retain value', () => {
                // Create a mock context for Retain value
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'Retain',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        DeletionPolicy: 'Retain',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'DeletionPolicy'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);
                const expectedDoc = deletionPolicyValueDocsMap.get('Retain');

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return documentation for DeletionPolicy Delete value', () => {
                // Create a mock context for Delete value
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'Delete',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        DeletionPolicy: 'Delete',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'DeletionPolicy'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);
                const expectedDoc = deletionPolicyValueDocsMap.get('Delete');

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return documentation for DeletionPolicy Snapshot value', () => {
                // Create a mock context for Snapshot value
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'Snapshot',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        DeletionPolicy: 'Snapshot',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'DeletionPolicy'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);
                const expectedDoc = deletionPolicyValueDocsMap.get('Snapshot');

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return documentation for DeletionPolicy RetainExceptOnCreate value', () => {
                // Create a mock context for RetainExceptOnCreate value
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'RetainExceptOnCreate',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        DeletionPolicy: 'RetainExceptOnCreate',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'DeletionPolicy'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);
                const expectedDoc = deletionPolicyValueDocsMap.get('RetainExceptOnCreate');

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return undefined for invalid DeletionPolicy values', () => {
                // Create a mock context for invalid value
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'InvalidValue',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        DeletionPolicy: 'InvalidValue',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'DeletionPolicy'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });

            it('should return undefined for other resource attribute values', () => {
                // Create a mock context for Condition value (not DeletionPolicy)
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'CreateProdResources',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        Condition: 'CreateProdResources',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'Condition'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });
        });

        describe('UpdateReplacePolicy Value Hover Documentation', () => {
            it('should return documentation for UpdateReplacePolicy Delete value', () => {
                // Create a mock context for Delete value
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'Delete',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        UpdateReplacePolicy: 'Delete',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'UpdateReplacePolicy'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);
                const expectedDoc = updateReplacePolicyValueDocsMap.get('Delete');

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return documentation for UpdateReplacePolicy Retain value', () => {
                // Create a mock context for Retain value
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'Retain',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        UpdateReplacePolicy: 'Retain',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'UpdateReplacePolicy'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);
                const expectedDoc = updateReplacePolicyValueDocsMap.get('Retain');

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return documentation for UpdateReplacePolicy Snapshot value', () => {
                // Create a mock context for Snapshot value
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'Snapshot',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        UpdateReplacePolicy: 'Snapshot',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'UpdateReplacePolicy'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);
                const expectedDoc = updateReplacePolicyValueDocsMap.get('Snapshot');

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return undefined for invalid UpdateReplacePolicy values', () => {
                // Create a mock context for invalid value
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'InvalidValue',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        UpdateReplacePolicy: 'InvalidValue',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'UpdateReplacePolicy'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });

            it('should return undefined for other resource attribute values (not UpdateReplacePolicy)', () => {
                // Create a mock context for Condition value (not UpdateReplacePolicy)
                const mockContext = createResourceContext('S3Bucket', {
                    text: 'CreateProdResources',
                    data: {
                        Type: 'AWS::S3::Bucket',
                        Condition: 'CreateProdResources',
                    },
                    propertyPath: [TopLevelSection.Resources, 'S3Bucket', 'Condition'],
                });

                expect(mockContext.isResourceAttributeValue()).toBe(true);

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });
        });

        describe('UpdatePolicy Property Hover Documentation', () => {
            it('should return hover documentation for UpdatePolicy.AutoScalingRollingUpdate property', () => {
                const context = getContextAt(96, 6); // Position at "AutoScalingRollingUpdate:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttributeProperty()).toBe(true);

                const result = hoverProvider.getInformation(context!);
                const expectedDoc = updatePolicyPropertyDocsMap.get(
                    `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}`,
                );

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return hover documentation for UpdatePolicy.AutoScalingRollingUpdate.MaxBatchSize property', () => {
                const context = getContextAt(97, 8); // Position at "MaxBatchSize:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttributeProperty()).toBe(true);

                const result = hoverProvider.getInformation(context!);
                const expectedDoc = updatePolicyPropertyDocsMap.get(
                    `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.MaxBatchSize}`,
                );

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return hover documentation for UpdatePolicy.AutoScalingRollingUpdate.MinInstancesInService property', () => {
                const context = getContextAt(98, 8); // Position at "MinInstancesInService:"

                expect(context).toBeDefined();
                expect(context!.isResourceAttributeProperty()).toBe(true);

                const result = hoverProvider.getInformation(context!);
                const expectedDoc = updatePolicyPropertyDocsMap.get(
                    `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.MinInstancesInService}`,
                );

                expect(result).toBeDefined();
                expect(result).toBe(expectedDoc);
            });

            it('should return undefined for invalid UpdatePolicy property paths', () => {
                const mockContext = createResourceContext('AutoScalingGroup', {
                    text: 'InvalidProperty',
                    data: {
                        Type: 'AWS::AutoScaling::AutoScalingGroup',
                        UpdatePolicy: {
                            InvalidProperty: 'value',
                        },
                    },
                    propertyPath: [TopLevelSection.Resources, 'AutoScalingGroup', 'UpdatePolicy', 'InvalidProperty'],
                });

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });

            it('should return undefined for unsupported UpdatePolicy property combinations', () => {
                const mockContext = createResourceContext('AutoScalingGroup', {
                    text: 'NonExistentProperty',
                    data: {
                        Type: 'AWS::AutoScaling::AutoScalingGroup',
                        UpdatePolicy: {
                            AutoScalingRollingUpdate: {
                                NonExistentProperty: 'value',
                            },
                        },
                    },
                    propertyPath: [
                        TopLevelSection.Resources,
                        'AutoScalingGroup',
                        'UpdatePolicy',
                        'AutoScalingRollingUpdate',
                        'NonExistentProperty',
                    ],
                });

                const result = hoverProvider.getInformation(mockContext);

                expect(result).toBeUndefined();
            });
        });
    });

    describe('ForEach Resource Hover', () => {
        function createForEachResourceContext(
            text: string,
            resourceType: string,
            properties?: Record<string, any>,
            propertyPath?: any[],
        ): Context {
            const nestedResource = new Resource('S3Bucket${BucketName}', resourceType, properties);

            const forEachEntity = new ForEachResource('Buckets', 'BucketName', { Ref: 'BucketNames' }, nestedResource);

            return createMockContext(TopLevelSection.Resources, 'Fn::ForEach::Buckets', {
                text,
                entity: forEachEntity,
                propertyPath: propertyPath ?? ['Resources', 'Fn::ForEach::Buckets', 2, 'S3Bucket${BucketName}'],
            });
        }

        it('should return documentation for resource type in ForEach', () => {
            const mockContext = createForEachResourceContext('AWS::S3::Bucket', 'AWS::S3::Bucket', undefined, [
                'Resources',
                'Fn::ForEach::Buckets',
                2,
                'S3Bucket${BucketName}',
                'Type',
            ]);

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('### AWS::S3::Bucket');
            expect(result).toContain('The ``AWS::S3::Bucket`` resource creates an Amazon S3 bucket');
        });

        it('should return property documentation for ForEach resource property', () => {
            const properties = { BucketName: 'my-bucket' };
            const mockContext = createForEachResourceContext('BucketName', 'AWS::S3::Bucket', properties, [
                'Resources',
                'Fn::ForEach::Buckets',
                2,
                'S3Bucket${BucketName}',
                'Properties',
                'BucketName',
            ]);

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toContain('```typescript');
            expect(result).toContain('string');
            expect(result).toContain('A name for the bucket');
        });

        it('should return nested property documentation for ForEach resource', () => {
            const properties = {
                VersioningConfiguration: { Status: 'Enabled' },
            };
            const mockContext = createForEachResourceContext('Status', 'AWS::S3::Bucket', properties, [
                'Resources',
                'Fn::ForEach::Buckets',
                2,
                'S3Bucket${BucketName}',
                'Properties',
                'VersioningConfiguration',
                'Status',
            ]);

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toBeDefined();
            expect(result).toContain('Status');
        });

        it('should return undefined when ForEach resource has no nested resource', () => {
            const forEachEntity = new ForEachResource('Buckets', 'BucketName', { Ref: 'BucketNames' }, undefined);

            const mockContext = createMockContext(TopLevelSection.Resources, 'Fn::ForEach::Buckets', {
                text: 'AWS::S3::Bucket',
                entity: forEachEntity,
            });

            const result = hoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });
    });
});
