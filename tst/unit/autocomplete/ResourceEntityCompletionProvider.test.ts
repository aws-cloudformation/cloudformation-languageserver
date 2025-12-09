import { describe, expect, test, beforeEach } from 'vitest';
import { CompletionParams, CompletionItemKind, CompletionItem, InsertTextFormat } from 'vscode-languageserver';
import { ResourceEntityCompletionProvider } from '../../../src/autocomplete/ResourceEntityCompletionProvider';
import { ResourceAttribute } from '../../../src/context/ContextType';
import { YamlNodeTypes } from '../../../src/context/syntaxtree/utils/TreeSitterTypes';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';
import { createForEachResourceContext, createResourceContext } from '../../utils/MockContext';
import { createMockComponents } from '../../utils/MockServerComponents';
import { combinedSchemas, createSchemaFrom, Schemas } from '../../utils/SchemaUtils';

describe('ResourceEntityCompletionProvider', () => {
    const mockComponents = createMockComponents();
    const provider = new ResourceEntityCompletionProvider(
        mockComponents.schemaRetriever,
        mockComponents.documentManager,
    );

    const mockParams: CompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 0, character: 0 },
    };

    // Create schemas once at describe level
    const ec2Schema = new ResourceSchema(Schemas.EC2Instance.contents);
    const ec2WithRequiredProps = createSchemaFrom(ec2Schema, 'AWS::EC2::Instance', {
        required: ['InstanceType', 'ImageId'],
    });
    const ec2WithNoRequiredProps = createSchemaFrom(ec2Schema, 'AWS::EC2::Instance', {
        required: [],
    });
    const schemasWithRequired = combinedSchemas([ec2WithRequiredProps]);
    const schemasWithNoRequired = combinedSchemas([ec2WithNoRequiredProps]);
    const emptySchemas = combinedSchemas([]);

    beforeEach(() => {
        mockComponents.schemaRetriever.getDefault.reset();
    });

    test('should return resource heading completions when inside Resources section but not inside a resource type', () => {
        const mockContext = createResourceContext('MyResource', {
            text: '',
            nodeType: YamlNodeTypes.STRING_SCALAR,
            propertyPath: ['Resources', 'MyResource', ''],
        });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();

        // Should include Type and Properties at the beginning
        const typeItem = result!.find((item) => item.label === 'Type');
        expect(typeItem).toBeDefined();
        expect(typeItem!.kind).toBe(CompletionItemKind.Property);
        expect(typeItem!.detail).toBe(ExtensionName);

        const propertiesItem = result!.find((item) => item.label === 'Properties');
        expect(propertiesItem).toBeDefined();
        expect(propertiesItem!.kind).toBe(CompletionItemKind.Property);
        expect(propertiesItem!.detail).toBe(ExtensionName);

        // Should include resource attributes
        const dependsOnItem = result!.find((item) => item.label === ResourceAttribute.DependsOn.toString());
        expect(dependsOnItem).toBeDefined();

        const metadataItem = result!.find((item) => item.label === ResourceAttribute.Metadata.toString());
        expect(metadataItem).toBeDefined();

        const creationPolicyItem = result!.find((item) => item.label === ResourceAttribute.CreationPolicy.toString());
        expect(creationPolicyItem).toBeDefined();

        const updatePolicyItem = result!.find((item) => item.label === ResourceAttribute.UpdatePolicy.toString());
        expect(updatePolicyItem).toBeDefined();

        const deletionPolicyItem = result!.find((item) => item.label === ResourceAttribute.DeletionPolicy.toString());
        expect(deletionPolicyItem).toBeDefined();
    });

    test('should return filtered resource heading completions when text is provided', () => {
        const mockContext = createResourceContext('MyResource', {
            text: '',
            propertyPath: ['Resources', 'MyResource', ''],
        });

        const result = provider.getCompletions(mockContext, mockParams);

        expect(result).toBeDefined();
        expect(result!.length).toBeGreaterThan(0); // Should match multiple items with fuzzy search

        const propertiesItem = result!.find((item) => item.label === 'Properties');
        expect(propertiesItem).toBeDefined();
        expect(propertiesItem!.kind).toBe(CompletionItemKind.Property);
        expect(propertiesItem!.detail).toBe(ExtensionName);
    });

    test('should provide correct insert text for resource properties', () => {
        const mockContext = createResourceContext('MyResource', {
            text: '',
            propertyPath: ['Resources', 'MyResource', ''],
        });
        const completions = provider.getCompletions(mockContext, mockParams);

        expect(completions).toBeDefined();

        // Test Type property
        const typeItem = completions!.find((item: CompletionItem) => item.label === 'Type');
        expect(typeItem).toBeDefined();
        expect(typeItem!.insertText).toBe('Type');

        // Test Properties property
        const propertiesItem = completions!.find((item: CompletionItem) => item.label === 'Properties');
        expect(propertiesItem).toBeDefined();
        expect(propertiesItem!.insertText).toBe('Properties');

        // Test resource attributes
        const creationPolicyItem = completions!.find((item: CompletionItem) => item.label === 'CreationPolicy');
        expect(creationPolicyItem).toBeDefined();
        expect(creationPolicyItem!.insertText).toBe('CreationPolicy');

        const updatePolicyItem = completions!.find((item: CompletionItem) => item.label === 'UpdatePolicy');
        expect(updatePolicyItem).toBeDefined();
        expect(updatePolicyItem!.insertText).toBe('UpdatePolicy');

        const metadataItem = completions!.find((item: CompletionItem) => item.label === 'Metadata');
        expect(metadataItem).toBeDefined();
        expect(metadataItem!.insertText).toBe('Metadata');

        const dependsOnItem = completions!.find((item: CompletionItem) => item.label === 'DependsOn');
        expect(dependsOnItem).toBeDefined();
        expect(dependsOnItem!.insertText).toBe('DependsOn');

        const deletionPolicyItem = completions!.find((item: CompletionItem) => item.label === 'DeletionPolicy');
        expect(deletionPolicyItem).toBeDefined();
        expect(deletionPolicyItem!.insertText).toBe('DeletionPolicy');
    });

    test('should enhance Properties completion with snippet when resource type is available', () => {
        // Setup context with a resource that has a Type
        const mockContext = createResourceContext('MyInstance', {
            text: '',
            propertyPath: ['Resources', 'MyInstance', ''],
            data: {
                Type: 'AWS::EC2::Instance',
            },
        });

        // Setup schema with required properties
        mockComponents.schemaRetriever.getDefault.returns(schemasWithRequired);

        // Get completions
        const result = provider.getCompletions(mockContext, mockParams);

        // Find the Properties completion item
        const propertiesItem = result!.find((item) => item.label === 'Properties');
        expect(propertiesItem).toBeDefined();

        // Verify it's a snippet
        expect(propertiesItem!.kind).toBe(CompletionItemKind.File);
        expect(propertiesItem!.insertTextFormat).toBe(InsertTextFormat.Snippet);

        // Verify data type is object
        expect(propertiesItem!.data).toBeDefined();
        expect(propertiesItem!.data!.type).toBe('object');
    });

    test('should include all required properties in YAML snippet', () => {
        // Setup context with a resource that has a Type
        const mockContext = createResourceContext('MyInstance', {
            text: '',
            propertyPath: ['Resources', 'MyInstance', ''],
            data: {
                Type: 'AWS::EC2::Instance',
            },
        });

        // Setup schema with required properties
        mockComponents.schemaRetriever.getDefault.returns(schemasWithRequired);

        // Get completions
        const result = provider.getCompletions(mockContext, mockParams);

        // Find the Properties completion item
        const propertiesItem = result!.find((item) => item.label === 'Properties');
        expect(propertiesItem).toBeDefined();

        // Verify the snippet content includes required properties
        const snippetText = propertiesItem!.insertText as string;
        expect(snippetText).toContain('Properties:');
        expect(snippetText).toContain('InstanceType: $1');
        expect(snippetText).toContain('ImageId: $2');
    });

    test('should create simple snippet when no required properties exist', () => {
        // Setup context with a resource that has a Type
        const mockContext = createResourceContext('MyInstance', {
            text: '',
            propertyPath: ['Resources', 'MyInstance', ''],
            data: {
                Type: 'AWS::EC2::Instance',
            },
        });

        // Setup schema with no required properties
        mockComponents.schemaRetriever.getDefault.returns(schemasWithNoRequired);

        // Get completions
        const result = provider.getCompletions(mockContext, mockParams);

        // Find the Properties completion item
        const propertiesItem = result!.find((item) => item.label === 'Properties');
        expect(propertiesItem).toBeDefined();

        // Verify the snippet content is a simple placeholder for YAML
        const snippetText = propertiesItem!.insertText as string;
        expect(snippetText).toBe('Properties:\n  $1');
    });

    test('should not enhance Properties completion when resource type is not available', () => {
        // Setup context with a resource that has no Type
        const mockContext = createResourceContext('MyResource', {
            text: '',
            propertyPath: ['Resources', 'MyResource', ''],
            data: {},
        });

        // Get completions
        const result = provider.getCompletions(mockContext, mockParams);

        // Find the Properties completion item
        const propertiesItem = result!.find((item) => item.label === 'Properties');
        expect(propertiesItem).toBeDefined();

        // Verify it's not a snippet
        expect(propertiesItem!.kind).toBe(CompletionItemKind.Property);
        expect(propertiesItem!.insertTextFormat).toBeUndefined();
    });

    test('should not enhance Properties completion when schema is not found', () => {
        // Setup context with a resource that has a Type
        const mockContext = createResourceContext('MyResource', {
            text: '',
            propertyPath: ['Resources', 'MyResource', ''],
            data: {
                Type: 'AWS::Unknown::Resource',
            },
        });

        // Setup empty schemas
        mockComponents.schemaRetriever.getDefault.returns(emptySchemas);

        // Get completions
        const result = provider.getCompletions(mockContext, mockParams);

        // Find the Properties completion item
        const propertiesItem = result!.find((item) => item.label === 'Properties');
        expect(propertiesItem).toBeDefined();

        // Verify it's not a snippet
        expect(propertiesItem!.kind).toBe(CompletionItemKind.Property);
        expect(propertiesItem!.insertTextFormat).toBeUndefined();
    });

    describe('Fn::ForEach Resource Entity Completions', () => {
        test('should return resource entity completions for ForEach resource', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Buckets', 'S3Bucket${BucketName}', {
                text: '',
                propertyPath: ['Resources', 'Fn::ForEach::Buckets', 2, 'S3Bucket${BucketName}', ''],
                data: {},
            });

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();

            const typeItem = result!.find((item) => item.label === 'Type');
            expect(typeItem).toBeDefined();
            expect(typeItem!.kind).toBe(CompletionItemKind.Property);

            const propertiesItem = result!.find((item) => item.label === 'Properties');
            expect(propertiesItem).toBeDefined();
            expect(propertiesItem!.kind).toBe(CompletionItemKind.Property);

            const dependsOnItem = result!.find((item) => item.label === ResourceAttribute.DependsOn.toString());
            expect(dependsOnItem).toBeDefined();
        });

        test('should enhance Properties completion with snippet for ForEach resource', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Instances', 'Instance${Name}', {
                text: '',
                propertyPath: ['Resources', 'Fn::ForEach::Instances', 2, 'Instance${Name}', ''],
                data: {
                    Type: 'AWS::EC2::Instance',
                },
            });

            mockComponents.schemaRetriever.getDefault.returns(schemasWithRequired);

            const result = provider.getCompletions(mockContext, mockParams);

            const propertiesItem = result!.find((item) => item.label === 'Properties');
            expect(propertiesItem).toBeDefined();
            expect(propertiesItem!.kind).toBe(CompletionItemKind.File);
            expect(propertiesItem!.insertTextFormat).toBe(InsertTextFormat.Snippet);

            const snippetText = propertiesItem!.insertText as string;
            expect(snippetText).toContain('Properties:');
            expect(snippetText).toContain('InstanceType: $1');
            expect(snippetText).toContain('ImageId: $2');
        });

        test('should return empty when ForEach resource has no resource property', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Buckets', 'S3Bucket${BucketName}', {
                text: '',
                propertyPath: ['Resources', 'Fn::ForEach::Buckets', 2, 'S3Bucket${BucketName}', ''],
                data: undefined,
            });

            const result = provider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBe(0);
        });

        test('should not enhance Properties when ForEach resource has no Type', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Resources', 'Resource${Name}', {
                text: '',
                propertyPath: ['Resources', 'Fn::ForEach::Resources', 2, 'Resource${Name}', ''],
                data: {},
            });

            const result = provider.getCompletions(mockContext, mockParams);

            const propertiesItem = result!.find((item) => item.label === 'Properties');
            expect(propertiesItem).toBeDefined();
            expect(propertiesItem!.kind).toBe(CompletionItemKind.Property);
            expect(propertiesItem!.insertTextFormat).toBeUndefined();
        });

        test('should not enhance Properties when schema not found for ForEach resource', () => {
            const mockContext = createForEachResourceContext('Fn::ForEach::Resources', 'Resource${Name}', {
                text: '',
                propertyPath: ['Resources', 'Fn::ForEach::Resources', 2, 'Resource${Name}', ''],
                data: {
                    Type: 'AWS::Unknown::Resource',
                },
            });

            mockComponents.schemaRetriever.getDefault.returns(emptySchemas);

            const result = provider.getCompletions(mockContext, mockParams);

            const propertiesItem = result!.find((item) => item.label === 'Properties');
            expect(propertiesItem).toBeDefined();
            expect(propertiesItem!.kind).toBe(CompletionItemKind.Property);
            expect(propertiesItem!.insertTextFormat).toBeUndefined();
        });
    });
});
