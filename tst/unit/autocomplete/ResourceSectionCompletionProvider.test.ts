import { describe, expect, test, beforeEach, vi } from 'vitest';
import { CompletionParams, CompletionItemKind, CompletionTriggerKind } from 'vscode-languageserver';
import { ResourceSectionCompletionProvider } from '../../../src/autocomplete/ResourceSectionCompletionProvider';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { ResourceSchema } from '../../../src/schema/ResourceSchema';
import { createResourceContext } from '../../utils/MockContext';
import {
    createMockComponents,
    createMockDocumentManager,
    createMockResourceStateManager,
    createMockSettingsManager,
} from '../../utils/MockServerComponents';

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

    // Common mock schemas
    const createMockResourceSchemas = () => {
        const mockS3Schema = {
            typeName: 'AWS::S3::Bucket',
            propertyKeys: new Set(['BucketName', 'AccessControl']),
            isReadOnly: () => false,
            isRequired: () => false,
            getByPath: (path: string) => {
                if (path === '/properties/AccessControl') {
                    return { type: 'string', enum: ['Private', 'PublicRead'] };
                }
                return { type: 'string' };
            },
            resolveJsonPointerPath: (jsonPointerPath: string) => {
                switch (jsonPointerPath) {
                    case '/properties/AccessControl': {
                        return [{ type: 'string', enum: ['Private', 'PublicRead'] }];
                    }
                    case '/properties/BucketName': {
                        return [{ type: 'string' }];
                    }
                    case '/properties': {
                        return [
                            {
                                type: 'object',
                                properties: {
                                    AccessControl: { type: 'string', enum: ['Private', 'PublicRead'] },
                                    BucketName: { type: 'string' },
                                },
                            },
                        ];
                    }
                    // No default
                }
                return [];
            },
        } as unknown as ResourceSchema;

        const mockSchemas = new Map<string, ResourceSchema>();
        mockSchemas.set('AWS::EC2::Instance', {} as ResourceSchema);
        mockSchemas.set('AWS::S3::Bucket', mockS3Schema);
        mockSchemas.set('AWS::S3::BucketPolicy', {} as ResourceSchema);
        mockSchemas.set('AWS::Lambda::Function', {} as ResourceSchema);
        return mockSchemas;
    };

    const setupMockSchemas = (schemas: Map<string, ResourceSchema>) => {
        const combinedSchemas = new CombinedSchemas();
        Object.defineProperty(combinedSchemas, 'schemas', {
            get: () => schemas,
        });
        mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);
        return combinedSchemas;
    };

    beforeEach(() => {
        mockComponents.schemaRetriever.getDefault.reset();
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

        const mockSchemas = createMockResourceSchemas();
        setupMockSchemas(mockSchemas);

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

        const mockSchemas = createMockResourceSchemas();
        setupMockSchemas(mockSchemas);

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

        const mockSchemas = createMockResourceSchemas();
        setupMockSchemas(mockSchemas);

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
