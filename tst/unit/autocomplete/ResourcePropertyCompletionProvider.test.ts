import { describe, expect, test, beforeEach, vi } from 'vitest';
import { CompletionParams, CompletionItemKind } from 'vscode-languageserver';
import { ResourcePropertyCompletionProvider } from '../../../src/autocomplete/ResourcePropertyCompletionProvider';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';
import { createContextFromYamlContentAndPath, createResourceContext } from '../../utils/MockContext';
import { createMockComponents } from '../../utils/MockServerComponents';
import { Schemas, combinedSchemas } from '../../utils/SchemaUtils';

describe('ResourcePropertyCompletionProvider', () => {
    const mockComponents = createMockComponents();
    const provider = new ResourcePropertyCompletionProvider(mockComponents.schemaRetriever);

    const mockParams: CompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 0, character: 0 },
    };

    const s3BucketContext = {
        text: '',
        propertyPath: ['Resources', 'MyBucket', 'Properties', ''],
        data: {
            Type: 'AWS::S3::Bucket',
            Properties: {},
        },
    };

    const setupS3Schema = () => {
        const testSchemas = combinedSchemas([Schemas.S3Bucket]);
        mockComponents.schemaRetriever.getDefault.returns(testSchemas);
        return testSchemas;
    };

    beforeEach(() => {
        mockComponents.schemaRetriever.getDefault.reset();
    });

    test('should return all optional properties when inside Properties section with empty text for no required properties', () => {
        const mockContext = createResourceContext('MyBucket', s3BucketContext);
        setupS3Schema();

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        // S3 bucket has no required properties, so should return all optional properties when text is empty (requirement 2.3)
        expect(result!.length).toBeGreaterThan(0);

        // Verify some expected S3 bucket properties are included
        const bucketNameItem = result!.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeDefined();
    });

    test('should return filtered property completions when text is provided', () => {
        const mockContext = createResourceContext('MyBucket', {
            ...s3BucketContext,
            text: 'Bucket',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Bucket'],
        });
        setupS3Schema();

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Should include properties that match "Bucket"
        const bucketNameItem = result!.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeDefined();

        const bucketEncryptionItem = result!.find((item) => item.label === 'BucketEncryption');
        expect(bucketEncryptionItem).toBeDefined();

        // Should not include properties that don't match "Bucket"
        const tagsItem = result!.find((item) => item.label === 'Tags');
        expect(tagsItem).toBeUndefined();
    });

    test('should exclude already defined properties from completions', () => {
        const mockSchema = new ResourceSchema(Schemas.S3Bucket.contents);
        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        const context = createContextFromYamlContentAndPath(
            `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket
      B:
`,
            { line: 5, character: 7 },
        );

        const result = provider.getCompletions(context, mockParams);

        // Verify that BucketName is not in the completions
        const bucketNameItem = result?.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeUndefined();

        // Verify that other properties are still available
        const bucketEncryptionItem = result?.find((item) => item.label === 'BucketEncryption');
        expect(bucketEncryptionItem).toBeDefined();
    });

    test('should exclude existing properties from nested object completions', () => {
        const mockSchema = new ResourceSchema(Schemas.S3Bucket.contents);
        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        // Create a resource with nested properties already defined
        const mockContext = createResourceContext('MyBucket', {
            text: '',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'CorsConfiguration'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    CorsConfiguration: {
                        CorsRules: [{ AllowedMethods: ['GET'] }],
                    },
                },
            },
        });

        const result = provider.getCompletions(mockContext, mockParams);

        // Verify that CorsRules is not in the completions since it already exists
        const corsRulesItem = result?.find((item) => item.label === 'CorsRules');
        expect(corsRulesItem).toBeUndefined();
    });

    test('should handle deeply nested existing properties correctly', () => {
        const mockSchema = new ResourceSchema(Schemas.S3Bucket.contents);
        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        // Create a resource with deeply nested properties
        const mockContext = createResourceContext('MyBucket', {
            text: '',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'CorsConfiguration', 'CorsRules', '0'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    CorsConfiguration: {
                        CorsRules: [
                            {
                                AllowedMethods: ['GET'],
                                AllowedOrigins: ['*'],
                            },
                        ],
                    },
                },
            },
        });

        const result = provider.getCompletions(mockContext, mockParams);

        // Should exclude properties that already exist in the array item
        const allowedMethodsItem = result?.find((item) => item.label === 'AllowedMethods');
        expect(allowedMethodsItem).toBeUndefined();

        const allowedOriginsItem = result?.find((item) => item.label === 'AllowedOrigins');
        expect(allowedOriginsItem).toBeUndefined();
    });

    test('should handle missing nested objects gracefully', () => {
        const mockSchema = new ResourceSchema(Schemas.S3Bucket.contents);
        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        // Create a resource where the nested path doesn't exist
        const mockContext = createResourceContext('MyBucket', {
            text: '',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'NonExistentProperty', 'SubProperty'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    BucketName: 'my-bucket',
                },
            },
        });

        const result = provider.getCompletions(mockContext, mockParams);

        // Should return completions even when the nested path doesn't exist
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
    });

    test('should handle array indices in property path correctly', () => {
        const mockSchema = new ResourceSchema(Schemas.S3Bucket.contents);
        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        // Create a resource with array properties
        const mockContext = createResourceContext('MyBucket', {
            text: '',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Tags', 0],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    Tags: [
                        {
                            Key: 'Environment',
                            Value: 'Production',
                        },
                    ],
                },
            },
        });

        const result = provider.getCompletions(mockContext, mockParams);

        // Should exclude properties that already exist in the array item
        const keyItem = result?.find((item) => item.label === 'Key');
        expect(keyItem).toBeUndefined();

        const valueItem = result?.find((item) => item.label === 'Value');
        expect(valueItem).toBeUndefined();
    });

    test('should return empty array when no resource type is found', () => {
        const mockContext = createResourceContext('MyResource', {
            text: '',
            propertyPath: ['Resources', 'MyResource', 'Properties'],
            data: {
                Type: undefined,
                Properties: {},
            },
        });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBe(0);
    });

    test('should provide correct insert text and completion item properties', () => {
        const mockContext = createResourceContext('MyBucket', {
            ...s3BucketContext,
            text: 'BucketName', // Use exact property name to avoid fuzzy search issues
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketName'],
        });
        setupS3Schema();

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Check properties of completion items
        const bucketNameItem = result!.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeDefined();
        expect(bucketNameItem!.insertText).toBe('BucketName');
        expect(bucketNameItem!.filterText).toBe('BucketName');
        expect(bucketNameItem!.kind).toBe(CompletionItemKind.Property);
        expect(bucketNameItem!.detail).toBe(ExtensionName);
    });

    test('should include all properties when none are defined', () => {
        const mockSchema = new ResourceSchema(Schemas.S3Bucket.contents);
        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        // Create a resource with no properties defined
        const mockContext = createResourceContext('MyBucket', {
            text: 'B',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'B'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: undefined,
            },
        });

        const result = provider.getCompletions(mockContext, mockParams);

        // Verify that BucketName is in the completions
        const bucketNameItem = result?.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeDefined();

        // Verify that other properties are also available
        const bucketEncryptionItem = result?.find((item) => item.label === 'BucketEncryption');
        expect(bucketEncryptionItem).toBeDefined();
    });

    test('should return property completions when editing property name', () => {
        const mockContext = createResourceContext('MyBucket', {
            text: 'Bucket',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Bucket'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: { Bucket: 'some-value' },
            },
        });
        setupS3Schema();

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Should include properties that match "Bucket"
        const bucketNameItem = result!.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeDefined();

        const bucketEncryptionItem = result!.find((item) => item.label === 'BucketEncryption');
        expect(bucketEncryptionItem).toBeDefined();
    });

    test('should return empty array when schema is not found for resource type', () => {
        const mockContext = createResourceContext('MyResource', {
            text: '',
            propertyPath: ['Resources', 'MyResource', 'Properties'],
            data: {
                Type: 'AWS::Unknown::Resource',
                Properties: {},
            },
        });
        const testSchemas = combinedSchemas([]);
        mockComponents.schemaRetriever.getDefault.returns(testSchemas);

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBe(0);
    });

    test('should not include readonly properties in completions', () => {
        const mockContext = createResourceContext('MyBucket', {
            ...s3BucketContext,
            text: 'A', // Provide text to get completions
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'A'],
        });
        setupS3Schema();

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Should not include readonly properties like Arn and DomainName
        const arnItem = result!.find((item) => item.label === 'Arn');
        expect(arnItem).toBeUndefined();

        const domainNameItem = result!.find((item) => item.label === 'DomainName');
        expect(domainNameItem).toBeUndefined();

        // Should include writable properties that match the text
        const accessControlItem = result!.find((item) => item.label === 'AccessControl');
        expect(accessControlItem).toBeDefined();
    });

    test('should only return required properties when text is empty and required properties exist', () => {
        // Create a mock context with empty text
        const mockContext = createResourceContext('MyBucket', {
            ...s3BucketContext,
            text: '',
        });

        // Setup schema with required and optional properties
        function setupSchemaWithRequiredProps() {
            // Create a modified schema with our test properties
            const modifiedSchema = {
                typeName: 'AWS::S3::Bucket',
                propertyKeys: new Set(['RequiredProp1', 'RequiredProp2', 'OptionalProp1', 'OptionalProp2']),
                isReadOnly: () => false,
                isRequired: (prop: string) => prop.startsWith('Required'),
                getByPath: () => ({ type: 'string' }),
                resolveRef: () => ({ type: 'string' }),
                resolveJsonPointerPath: () => [
                    {
                        type: 'object',
                        properties: {
                            RequiredProp1: { type: 'string' },
                            RequiredProp2: { type: 'string' },
                            OptionalProp1: { type: 'string' },
                            OptionalProp2: { type: 'string' },
                        },
                        required: ['RequiredProp1', 'RequiredProp2'],
                    },
                ],
            } as unknown as ResourceSchema;

            const mockSchemas = new Map<string, ResourceSchema>();
            mockSchemas.set('AWS::S3::Bucket', modifiedSchema);

            const combinedSchemas = new CombinedSchemas();
            Object.defineProperty(combinedSchemas, 'schemas', {
                get: () => mockSchemas,
            });

            mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);
            return combinedSchemas;
        }

        setupSchemaWithRequiredProps();

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBe(2); // Should only include the 2 required properties

        // Should include required properties
        const requiredProp1 = result!.find((item) => item.label === 'RequiredProp1');
        expect(requiredProp1).toBeDefined();

        const requiredProp2 = result!.find((item) => item.label === 'RequiredProp2');
        expect(requiredProp2).toBeDefined();

        // Should not include optional properties when text is empty and required properties exist
        const optionalProp1 = result!.find((item) => item.label === 'OptionalProp1');
        expect(optionalProp1).toBeUndefined();

        const optionalProp2 = result!.find((item) => item.label === 'OptionalProp2');
        expect(optionalProp2).toBeUndefined();
    });

    test('should return all properties without fuzzy search when positioned at block mapping level', () => {
        // Create a mock context that simulates being positioned at a block mapping
        const mockContext = createResourceContext('MyBucket', {
            ...s3BucketContext,
            text: 'BucketName: {}', // This simulates the context text when positioned after existing property
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketName: {}'],
        });

        // Mock the atBlockMappingLevel method to return true
        const originalAtBlockMappingLevel = mockContext.atBlockMappingLevel;
        mockContext.atBlockMappingLevel = vi.fn().mockReturnValue(true);

        setupS3Schema();

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();

        // Verify atBlockMappingLevel was called
        expect(mockContext.atBlockMappingLevel).toHaveBeenCalled();

        // S3 bucket should have multiple properties available
        expect(result!.length).toBeGreaterThan(2); // Should be more than the fuzzy search result

        // Should include major S3 bucket properties without fuzzy filtering
        const bucketNameItem = result!.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeDefined();

        const bucketEncryptionItem = result!.find((item) => item.label === 'BucketEncryption');
        expect(bucketEncryptionItem).toBeDefined();

        // Restore original method
        mockContext.atBlockMappingLevel = originalAtBlockMappingLevel;
    });

    test('should apply fuzzy search when NOT positioned at block mapping level', () => {
        // Create a mock context that simulates typing within an existing property name
        const mockContext = createResourceContext('MyBucket', {
            ...s3BucketContext,
            text: 'Bucket', // This simulates typing within a property name
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Bucket'],
        });

        // Mock the isBlockMapping method to return false (positioned on a specific node)
        mockContext.atBlockMappingLevel = () => false;

        setupS3Schema();

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();

        // Should return filtered results (fewer than when at block mapping level)
        expect(result!.length).toBeGreaterThan(0);

        // Should include properties that match "Bucket"
        const bucketNameItem = result!.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeDefined();

        const bucketEncryptionItem = result!.find((item) => item.label === 'BucketEncryption');
        expect(bucketEncryptionItem).toBeDefined();
    });

    test('should return empty array when not inside Properties section', () => {
        const mockContext = createResourceContext('MyBucket', {
            text: '',
            propertyPath: ['Resources', 'MyBucket'], // NOT inside Properties
        });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBe(0); // Property provider should return empty for wrong context
    });

    test('should apply fuzzy search when text is provided', () => {
        // Create a mock context with text to trigger fuzzy search
        const mockContext = createResourceContext('MyBucket', {
            text: 'Prop', // Provide text to get all properties and trigger fuzzy search
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Prop'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {},
            },
        });

        // Mock atBlockMappingLevel to return false so fuzzy search is applied
        mockContext.atBlockMappingLevel = () => false;

        // Setup schema with required and optional properties
        function setupSchemaWithMixedProps() {
            const modifiedSchema = {
                typeName: 'AWS::S3::Bucket',
                propertyKeys: new Set(['RequiredProp1', 'RequiredProp2', 'OptionalProp1', 'OptionalProp2']),
                isReadOnly: () => false,
                isRequired: (prop: string) => prop.startsWith('Required'),
                getByPath: () => ({ type: 'string' }),
                resolveRef: () => ({ type: 'string' }),
                resolveJsonPointerPath: () => [
                    {
                        type: 'object',
                        properties: {
                            RequiredProp1: { type: 'string' },
                            RequiredProp2: { type: 'string' },
                            OptionalProp1: { type: 'string' },
                            OptionalProp2: { type: 'string' },
                        },
                        required: ['RequiredProp1', 'RequiredProp2'],
                    },
                ],
            } as unknown as ResourceSchema;

            const mockSchemas = new Map<string, ResourceSchema>();
            mockSchemas.set('AWS::S3::Bucket', modifiedSchema);

            const combinedSchemas = new CombinedSchemas();
            Object.defineProperty(combinedSchemas, 'schemas', {
                get: () => mockSchemas,
            });

            mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);
            return combinedSchemas;
        }

        setupSchemaWithMixedProps();

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBe(4); // Should include all 4 properties

        // Verify all properties are found
        const requiredProp1 = result!.find((item) => item.label === 'RequiredProp1');
        const requiredProp2 = result!.find((item) => item.label === 'RequiredProp2');
        const optionalProp1 = result!.find((item) => item.label === 'OptionalProp1');
        const optionalProp2 = result!.find((item) => item.label === 'OptionalProp2');

        expect(requiredProp1).toBeDefined();
        expect(requiredProp2).toBeDefined();
        expect(optionalProp1).toBeDefined();
        expect(optionalProp2).toBeDefined();

        expect(result![0].sortText).toBeDefined();
    });

    test('should return Tag properties when inside Tags array item (array index translation)', () => {
        // Create a mock context that simulates being inside a Tags array item
        // Path: Resources/MyBucket/Properties/Tags/0/K (where 0 should be translated to *)
        const mockContext = createResourceContext('MyBucket', {
            text: 'K',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Tags', 0, 'K'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    Tags: [{ K: 'some-key' }],
                },
            },
        });

        // Setup schema that includes Tags property with array items having Key/Value structure
        const mockSchema = {
            typeName: 'AWS::S3::Bucket',
            propertyKeys: new Set(['Tags', 'BucketName']),
            getByPath: (path: string) => {
                if (path === '/properties/Tags') {
                    return {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                Key: { type: 'string' },
                                Value: { type: 'string' },
                            },
                            required: ['Key', 'Value'],
                        },
                    };
                }
                return undefined;
            },
            isReadOnly: () => false,
            isRequired: () => false,
            resolveJsonPointerPath: (path: string) => {
                // This should handle the translation of /properties/Tags/0 to /properties/Tags/*
                if (path === '/properties/Tags/*') {
                    return [
                        {
                            type: 'object',
                            properties: {
                                Key: { type: 'string' },
                                Value: { type: 'string' },
                            },
                            required: ['Key', 'Value'],
                        },
                    ];
                }
                return [];
            },
        } as unknown as ResourceSchema;

        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });

        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Should include Tag properties that match "K"
        const keyItem = result!.find((item) => item.label === 'Key');
        expect(keyItem).toBeDefined();
        expect(keyItem!.kind).toBe(CompletionItemKind.Property);

        // Should not include Value since it doesn't match "K"
        const valueItem = result!.find((item) => item.label === 'Value');
        expect(valueItem).toBeUndefined();
    });

    test('should return both Key and Value when inside Tags array item with empty text', () => {
        // Create a mock context that simulates being inside a Tags array item with empty text
        const mockContext = createResourceContext('MyBucket', {
            text: '',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Tags', 0, ''],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    Tags: [{}],
                },
            },
        });

        // Setup schema for Tags array items
        const mockSchema = {
            typeName: 'AWS::S3::Bucket',
            propertyKeys: new Set(['Tags', 'BucketName']),
            getByPath: (path: string) => {
                if (path === '/properties/Tags') {
                    return {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                Key: { type: 'string' },
                                Value: { type: 'string' },
                            },
                            required: ['Key', 'Value'],
                        },
                    };
                }
                return undefined;
            },
            isReadOnly: () => false,
            isRequired: (prop: string) => ['Key', 'Value'].includes(prop), // Both are required in Tags
            resolveJsonPointerPath: (path: string) => {
                // This should handle the translation of /properties/Tags/0 to /properties/Tags/*
                if (path === '/properties/Tags/*') {
                    return [
                        {
                            type: 'object',
                            properties: {
                                Key: { type: 'string' },
                                Value: { type: 'string' },
                            },
                            required: ['Key', 'Value'],
                        },
                    ];
                }
                return [];
            },
        } as unknown as ResourceSchema;

        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });

        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBe(2); // Should return both Key and Value

        // Should include both Key and Value properties
        const keyItem = result!.find((item) => item.label === 'Key');
        expect(keyItem).toBeDefined();
        expect(keyItem!.kind).toBe(CompletionItemKind.Property);

        const valueItem = result!.find((item) => item.label === 'Value');
        expect(valueItem).toBeDefined();
        expect(valueItem!.kind).toBe(CompletionItemKind.Property);
    });

    test('should handle double quoted property names in YAML', () => {
        const mockSchema = new ResourceSchema(Schemas.S3Bucket.contents);
        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        const mockContext = createResourceContext('MyBucket', {
            text: `"Bucket"`,
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Bucket'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {},
            },
            nodeType: 'double_quote_scalar', // Simulate double quoted context
        });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Find BucketName completion item
        const bucketNameItem = result!.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeDefined();

        // Should have textEdit with quotes
        expect(bucketNameItem!.textEdit).toBeDefined();
        expect(bucketNameItem!.textEdit?.newText).toBe('"BucketName"');
        expect(bucketNameItem!.filterText).toBe('"BucketName"');
    });

    test('should handle single quoted property names in YAML', () => {
        const mockSchema = new ResourceSchema(Schemas.S3Bucket.contents);
        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        const mockContext = createResourceContext('MyBucket', {
            text: 'Bucket',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Bucket'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {},
            },
            nodeType: 'single_quote_scalar', // Simulate single quoted context
        });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Find BucketName completion item
        const bucketNameItem = result!.find((item) => item.label === 'BucketName');
        expect(bucketNameItem).toBeDefined();

        // Should have textEdit with single quotes
        expect(bucketNameItem!.textEdit).toBeDefined();
        expect(bucketNameItem!.textEdit?.newText).toBe("'BucketName'");
        expect(bucketNameItem!.filterText).toBe("'BucketName'");
    });

    // Enum Value Completion Tests (migrated from ResourceEnumValueCompletionProvider)
    describe('Enum Value Completions', () => {
        const accessControlEnumValues = [
            'AuthenticatedRead',
            'AwsExecRead',
            'BucketOwnerFullControl',
            'BucketOwnerRead',
            'LogDeliveryWrite',
            'Private',
            'PublicRead',
            'PublicReadWrite',
        ];

        const setupS3SchemaWithEnums = () => {
            const mockSchema = {
                typeName: 'AWS::S3::Bucket',
                propertyKeys: new Set(['AccessControl', 'BucketName']),
                getByPath: (path: string) => {
                    if (path === '/properties/AccessControl') {
                        return {
                            type: 'string',
                            enum: accessControlEnumValues,
                            description: 'S3 bucket access control',
                        };
                    } else if (path === '/properties/BucketName') {
                        return {
                            type: 'string',
                            description: 'Name of the bucket',
                        };
                    }
                    return undefined;
                },
                isReadOnly: () => false,
                isRequired: () => false,
                resolveJsonPointerPath: (path: string) => {
                    if (path === '/properties/AccessControl') {
                        return [
                            {
                                type: 'string',
                                enum: accessControlEnumValues,
                                description: 'S3 bucket access control',
                            },
                        ];
                    } else if (path === '/properties/BucketName') {
                        return [
                            {
                                type: 'string',
                                description: 'Name of the bucket',
                            },
                        ];
                    }
                    return [];
                },
            } as unknown as ResourceSchema;

            const mockSchemas = new Map<string, ResourceSchema>();
            mockSchemas.set('AWS::S3::Bucket', mockSchema);

            const combinedSchemas = new CombinedSchemas();
            Object.defineProperty(combinedSchemas, 'schemas', {
                get: () => mockSchemas,
            });

            mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);
            return { mockSchema, combinedSchemas };
        };

        const createPropertyValueContext = (propertyName: string, text = '') => {
            return createResourceContext('MyBucket', {
                text,
                propertyPath: ['Resources', 'MyBucket', 'Properties', propertyName],
                data: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { [propertyName]: {} },
                },
                // Simulate being positioned at the value part of a mapping pair
                nodeType: 'plain_scalar',
            });
        };

        test('should return enum value completions when inside a property value with enum values', () => {
            setupS3SchemaWithEnums();
            const mockContext = createPropertyValueContext('AccessControl');

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBe(accessControlEnumValues.length);

            // Verify enum value items
            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.EnumMember);
                expect(item.detail).toBe(ExtensionName);
                expect(accessControlEnumValues).toContain(item.label);
            }
        });

        test('should return filtered enum value completions when text is provided', () => {
            setupS3SchemaWithEnums();
            const mockContext = createPropertyValueContext('AccessControl', 'Public');

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBe(2); // Should return PublicRead and PublicReadWrite

            // Verify filtered enum values
            const publicReadItem = result!.find((item) => item.label === 'PublicRead');
            expect(publicReadItem).toBeDefined();

            const publicReadWriteItem = result!.find((item) => item.label === 'PublicReadWrite');
            expect(publicReadWriteItem).toBeDefined();

            // Should not include other enum values
            const privateItem = result!.find((item) => item.label === 'Private');
            expect(privateItem).toBeUndefined();
        });

        test('should return empty array when property does not have enum values', () => {
            setupS3SchemaWithEnums();
            const mockContext = createPropertyValueContext('BucketName');

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBe(0);
        });

        test('should provide correct completion item properties for enum values', () => {
            setupS3SchemaWithEnums();
            const mockContext = createPropertyValueContext('AccessControl');

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBe(accessControlEnumValues.length);

            // Check properties of a specific completion item
            const privateItem = result!.find((item) => item.label === 'Private');
            expect(privateItem).toBeDefined();
            expect(privateItem!.insertText).toBe('Private');
            expect(privateItem!.filterText).toBe('Private');
            expect(privateItem!.kind).toBe(CompletionItemKind.EnumMember);
            expect(privateItem!.detail).toBe(ExtensionName);
            expect(privateItem!.sortText).toBeDefined();
        });

        test('should return empty array when schema is not found for resource type in enum context', () => {
            const mockContext = createResourceContext('MyResource', {
                text: '',
                propertyPath: ['Resources', 'MyResource', 'Properties', 'SomeProperty'],
                data: {
                    Type: 'AWS::Unknown::Resource',
                    Properties: { SomeProperty: '' },
                },
            });
            const testSchemas = combinedSchemas([]);
            mockComponents.schemaRetriever.getDefault.returns(testSchemas);

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBe(0);
        });

        test('should handle double quoted enum values in YAML', () => {
            setupS3SchemaWithEnums();

            const mockContext = createResourceContext('MyBucket', {
                text: `"Pub"`,
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'AccessControl'],
                data: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { AccessControl: '' },
                },
                nodeType: 'double_quote_scalar', // Simulate double quoted context
            });

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBe(2); // PublicRead and PublicReadWrite

            // Find PublicRead completion item
            const publicReadItem = result!.find((item) => item.label === 'PublicRead');
            expect(publicReadItem).toBeDefined();

            // Should have textEdit with double quotes
            expect(publicReadItem!.textEdit).toBeDefined();
            expect(publicReadItem!.textEdit?.newText).toBe('"PublicRead"');
            expect(publicReadItem!.filterText).toBe('"PublicRead"');
        });

        test('should handle single quoted enum values in YAML', () => {
            setupS3SchemaWithEnums();

            const mockContext = createResourceContext('MyBucket', {
                text: `'Priv'`,
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'AccessControl'],
                data: {
                    Type: 'AWS::S3::Bucket',
                    Properties: { AccessControl: '' },
                },
                nodeType: 'single_quote_scalar', // Simulate single quoted context
            });

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBe(1); // Only Private matches

            // Find Private completion item
            const privateItem = result!.find((item) => item.label === 'Private');
            expect(privateItem).toBeDefined();

            // Should have textEdit with single quotes
            expect(privateItem!.textEdit).toBeDefined();
            expect(privateItem!.textEdit?.newText).toBe("'Private'");
            expect(privateItem!.filterText).toBe("'Private'");
        });
    });

    test('should exclude existing properties from array item when in array context', () => {
        const mockSchema = new ResourceSchema(Schemas.S3Bucket.contents);
        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::S3::Bucket', mockSchema);

        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => mockSchemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);

        const context = createContextFromYamlContentAndPath(
            `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - Key: test
          Value: test
        - 
          Value: test`,
            { line: 7, character: 10 }, // Position at the cursor location before "Value: test"
        );

        const result = provider.getCompletions(context, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0);

        // Value should be filtered out since it exists in the array item
        const valueItem = result?.find((item) => item.label === 'Value');
        expect(valueItem).toBeUndefined();

        // Key should be included since it doesn't exist in the array item
        const keyItem = result?.find((item) => item.label === 'Key');
        expect(keyItem).toBeDefined();
    });
});
