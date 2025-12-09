import { describe, expect, test, beforeEach, vi } from 'vitest';
import { CompletionParams, CompletionItemKind, CompletionTriggerKind } from 'vscode-languageserver';
import { ResourceSectionCompletionProvider } from '../../../src/autocomplete/ResourceSectionCompletionProvider';
import { createResourceContext } from '../../utils/MockContext';
import {
    createMockComponents,
    createMockDocumentManager,
    createMockResourceStateManager,
    createMockSettingsManager,
} from '../../utils/MockServerComponents';
import { combinedSchemas, Schemas } from '../../utils/SchemaUtils';

describe('ResourceSectionCompletionProvider', () => {
    const mockComponents = createMockComponents();
    const mockDocumentManager = createMockDocumentManager();
    const mockResourceStateManager = createMockResourceStateManager();

    const mockSettingsManager = createMockSettingsManager();

    const mockTestComponents = createMockComponents({
        schemaRetriever: mockComponents.schemaRetriever,
        documentManager: mockDocumentManager,
        resourceStateManager: mockResourceStateManager,
        settingsManager: mockSettingsManager,
    });

    const provider = new ResourceSectionCompletionProvider(
        mockTestComponents.core,
        mockTestComponents.external,
        mockTestComponents.providers,
    );

    const resourceProviders = provider['resourceProviders'];

    const mockParams: CompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 0, character: 0 },
        context: {
            triggerKind: CompletionTriggerKind.TriggerCharacter,
        },
    };

    // Create schemas once at describe level
    const testSchemas = combinedSchemas([Schemas.S3Bucket, Schemas.EC2Instance, Schemas.LambdaFunction]);

    beforeEach(() => {
        mockComponents.schemaRetriever.getDefault.reset();
        mockComponents.schemaRetriever.getDefault.returns(testSchemas);
    });

    test('should delegate to entity provider when at entity key level', async () => {
        const mockContext = createResourceContext('MyResource', {
            text: '',
            propertyPath: ['Resources', 'MyResource', ''],
        });
        const entityProvider = resourceProviders.get('Entity' as any)!;
        const mockCompletions = [
            { label: 'Type', kind: CompletionItemKind.Property },
            { label: 'Properties', kind: CompletionItemKind.Property },
        ];
        const spy = vi.spyOn(entityProvider, 'getCompletions').mockReturnValue(mockCompletions);

        const result = await provider.getCompletions(mockContext, mockParams);

        expect(spy).toHaveBeenCalledWith(mockContext, mockParams);
        expect(result).toEqual(mockCompletions);
        spy.mockRestore();
    });

    test('should delegate to type provider when entitySection is Type', async () => {
        const mockContext = createResourceContext('MyResource', {
            text: 'AWS::',
            propertyPath: ['Resources', 'MyResource', 'Type'],
            data: { Type: 'AWS::' },
        });

        const typeProvider = resourceProviders.get('Type' as any)!;
        const mockCompletions = [{ label: 'AWS::S3::Bucket', kind: CompletionItemKind.Class }];
        const spy = vi.spyOn(typeProvider, 'getCompletions').mockReturnValue(mockCompletions);

        const result = await provider.getCompletions(mockContext, mockParams);

        expect(spy).toHaveBeenCalledWith(mockContext, mockParams);
        expect(result).toEqual(mockCompletions);
        spy.mockRestore();
    });

    test('should delegate to property provider when at nested entity key level Properties', async () => {
        const mockContext = createResourceContext('MyBucket', {
            text: 'Bucket',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'Bucket'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {},
            },
        });

        const propertyProvider = resourceProviders.get('Property' as any)!;
        const mockCompletions = [
            { label: 'BucketName', kind: CompletionItemKind.Property },
            { label: 'AccessControl', kind: CompletionItemKind.Property },
        ];
        const spy = vi.spyOn(propertyProvider, 'getCompletions').mockReturnValue(mockCompletions);

        const result = await provider.getCompletions(mockContext, mockParams);

        expect(spy).toHaveBeenCalledWith(mockContext, mockParams);
        expect(result).toEqual(mockCompletions);
        spy.mockRestore();
    });

    test('should delegate to property provider when inside property value (now handles enums)', async () => {
        const mockContext = createResourceContext('MyBucket', {
            text: 'Private',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'AccessControl', 'Value'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: { AccessControl: {} },
            },
        });

        const propertyProvider = resourceProviders.get('Property' as any)!;
        const mockCompletions = [
            { label: 'Private', kind: CompletionItemKind.EnumMember },
            { label: 'PublicRead', kind: CompletionItemKind.EnumMember },
        ];
        const spy = vi.spyOn(propertyProvider, 'getCompletions').mockReturnValue(mockCompletions);

        const result = await provider.getCompletions(mockContext, mockParams);

        expect(spy).toHaveBeenCalledWith(mockContext, mockParams);
        expect(result).toEqual(mockCompletions);
        spy.mockRestore();
    });

    test('should delegate to property provider when entitySection is a resource attribute (CreationPolicy)', async () => {
        const mockContext = createResourceContext('MyInstance', {
            text: '',
            propertyPath: ['Resources', 'MyInstance', 'CreationPolicy', ''],
            data: {
                Type: 'AWS::EC2::Instance',
                CreationPolicy: {},
            },
        });

        const propertyProvider = resourceProviders.get('Property' as any)!;
        const mockCompletions = [
            { label: 'ResourceSignal', kind: CompletionItemKind.Property },
            { label: 'AutoScalingCreationPolicy', kind: CompletionItemKind.Property },
        ];
        const spy = vi.spyOn(propertyProvider, 'getCompletions').mockReturnValue(mockCompletions);

        const result = await provider.getCompletions(mockContext, mockParams);

        expect(spy).toHaveBeenCalledWith(mockContext, mockParams);
        expect(result).toEqual(mockCompletions);
        spy.mockRestore();
    });

    test('should delegate to property provider when in nested object within Properties (matchPathWithLogicalIds)', async () => {
        const mockContext = createResourceContext('MyBucket', {
            text: 'Topic',
            propertyPath: ['Resources', 'MyBucket', 'Properties', 'NotificationConfiguration', 'Topic'],
            data: {
                Type: 'AWS::S3::Bucket',
                Properties: {
                    NotificationConfiguration: {},
                },
            },
        });

        const propertyProvider = resourceProviders.get('Property' as any)!;
        const mockCompletions = [
            { label: 'TopicConfigurations', kind: CompletionItemKind.Property },
            { label: 'QueueConfigurations', kind: CompletionItemKind.Property },
            { label: 'LambdaConfigurations', kind: CompletionItemKind.Property },
            { label: 'EventBridgeConfiguration', kind: CompletionItemKind.Property },
        ];
        const spy = vi.spyOn(propertyProvider, 'getCompletions').mockReturnValue(mockCompletions);

        const result = await provider.getCompletions(mockContext, mockParams);

        expect(spy).toHaveBeenCalledWith(mockContext, mockParams);
        expect(result).toEqual(mockCompletions);
        spy.mockRestore();
    });

    test('should return empty array when no provider matches', async () => {
        const mockContext = createResourceContext('MyResource', {
            text: '',
            propertyPath: ['Resources', 'MyResource', 'SomeOtherSection'],
            data: {},
        });

        const result = await provider.getCompletions(mockContext, mockParams);

        expect(result).toEqual([]);
    });
});
