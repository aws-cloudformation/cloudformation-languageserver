import { describe, expect, test, beforeEach, vi } from 'vitest';
import { InlineCompletionParams, InlineCompletionTriggerKind } from 'vscode-languageserver-protocol';
import {
    InlineCompletionRouter,
    createInlineCompletionProviders,
} from '../../../src/autocomplete/InlineCompletionRouter';
import { DocumentType } from '../../../src/document/Document';
import { DefaultSettings } from '../../../src/settings/Settings';
import { createTopLevelContext } from '../../utils/MockContext';
import {
    createMockContextManager,
    createMockDocumentManager,
    createMockRelationshipSchemaService,
    createMockSchemaRetriever,
    createMockSettingsManager,
    createMockSyntaxTreeManager,
} from '../../utils/MockServerComponents';

describe('InlineCompletionRouter', () => {
    const mockContextManager = createMockContextManager();
    const mockDocumentManager = createMockDocumentManager();
    const mockSettingsManager = createMockSettingsManager();
    const mockSchemaRetriever = createMockSchemaRetriever();
    const mockRelationshipSchemaService = createMockRelationshipSchemaService();
    const mockSyntaxTreeManager = createMockSyntaxTreeManager();
    let router: InlineCompletionRouter;

    const mockParams: InlineCompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 0, character: 0 },
        context: {
            triggerKind: InlineCompletionTriggerKind.Invoked,
        },
    };

    beforeEach(() => {
        mockContextManager.getContext.reset();
        const providers = createInlineCompletionProviders(
            mockDocumentManager,
            mockRelationshipSchemaService,
            mockSchemaRetriever,
            mockSyntaxTreeManager,
        );
        router = new InlineCompletionRouter(mockContextManager, providers, mockRelationshipSchemaService);
        router.configure(mockSettingsManager);
        vi.restoreAllMocks();
    });

    test('should return undefined when completion is disabled', () => {
        const disabledSettings = {
            ...DefaultSettings,
            completion: { ...DefaultSettings.completion, enabled: false },
        };
        const disabledSettingsManager = createMockSettingsManager(disabledSettings);
        disabledSettingsManager.subscribe.callsFake((path: keyof typeof disabledSettings, callback: any) => {
            callback(disabledSettings[path]);
            return {
                unsubscribe: () => {},
                isActive: () => true,
            };
        });
        router.configure(disabledSettingsManager);

        const result = router.getInlineCompletions(mockParams);

        expect(result).toBeUndefined();
        expect(mockContextManager.getContext.called).toBe(false);
    });

    test('should return undefined when context is not available', () => {
        mockContextManager.getContext.returns(undefined);

        const result = router.getInlineCompletions(mockParams);

        expect(result).toBeUndefined();
        expect(mockContextManager.getContext.calledOnce).toBe(true);
        expect(mockContextManager.getContext.calledWith(mockParams)).toBe(true);
    });

    test('should return undefined when context exists but no providers match', () => {
        const mockContext = createTopLevelContext('Parameters', { text: 'AWS::' });
        mockContextManager.getContext.returns(mockContext);

        const result = router.getInlineCompletions(mockParams);

        expect(result).toBeUndefined();
        expect(mockContextManager.getContext.calledOnce).toBe(true);
    });

    test('should handle YAML document context', () => {
        const mockContext = createTopLevelContext('Resources', {
            text: 'AWS::S3::',
            type: DocumentType.YAML,
        });
        mockContextManager.getContext.returns(mockContext);

        const result = router.getInlineCompletions(mockParams);

        expect(mockContextManager.getContext.calledOnce).toBe(true);
        expect(mockContextManager.getContext.calledWith(mockParams)).toBe(true);
        // Since no providers are implemented yet, should return undefined
        expect(result).toBeUndefined();
    });

    test('should handle JSON document context', () => {
        const mockContext = createTopLevelContext('Resources', {
            text: 'AWS::S3::',
            type: DocumentType.JSON,
        });
        mockContextManager.getContext.returns(mockContext);

        const result = router.getInlineCompletions(mockParams);

        expect(mockContextManager.getContext.calledOnce).toBe(true);
        expect(mockContextManager.getContext.calledWith(mockParams)).toBe(true);
        // Since no providers are implemented yet, should return undefined
        expect(result).toBeUndefined();
    });

    test('should handle different trigger kinds', () => {
        const automaticParams: InlineCompletionParams = {
            ...mockParams,
            context: {
                triggerKind: InlineCompletionTriggerKind.Automatic,
            },
        };

        const mockContext = createTopLevelContext('Resources', { text: 'Type: ' });
        mockContextManager.getContext.returns(mockContext);

        const result = router.getInlineCompletions(automaticParams);

        expect(mockContextManager.getContext.calledWith(automaticParams)).toBe(true);
        // Since no providers are implemented yet, should return undefined
        expect(result).toBeUndefined();
    });

    test('should handle different positions', () => {
        const positionParams: InlineCompletionParams = {
            ...mockParams,
            position: { line: 5, character: 10 },
        };

        const mockContext = createTopLevelContext('Resources', { text: 'Properties:' });
        mockContextManager.getContext.returns(mockContext);

        const result = router.getInlineCompletions(positionParams);

        expect(mockContextManager.getContext.calledWith(positionParams)).toBe(true);
        // Since no providers are implemented yet, should return undefined
        expect(result).toBeUndefined();
    });

    describe('Settings Management', () => {
        test('should configure with settings manager', () => {
            const customSettings = {
                ...DefaultSettings,
                completion: { ...DefaultSettings.completion, enabled: false },
                editor: { ...DefaultSettings.editor, tabSize: 8 },
            };
            const customSettingsManager = createMockSettingsManager(customSettings);
            customSettingsManager.subscribe.callsFake((path: keyof typeof customSettings, callback: any) => {
                callback(customSettings[path]);
                return {
                    unsubscribe: () => {},
                    isActive: () => true,
                };
            });

            router.configure(customSettingsManager);

            expect(router['completionSettings']).toEqual(customSettings.completion);
        });

        test('should handle settings reconfiguration', () => {
            const firstSettings = {
                ...DefaultSettings,
                completion: { ...DefaultSettings.completion, enabled: false },
            };
            const secondSettings = {
                ...DefaultSettings,
                completion: { ...DefaultSettings.completion, enabled: true },
            };

            const firstSettingsManager = createMockSettingsManager(firstSettings);
            firstSettingsManager.subscribe.callsFake((path: keyof typeof firstSettings, callback: any) => {
                callback(firstSettings[path]);
                return {
                    unsubscribe: () => {},
                    isActive: () => true,
                };
            });
            const secondSettingsManager = createMockSettingsManager(secondSettings);
            secondSettingsManager.subscribe.callsFake((path: keyof typeof secondSettings, callback: any) => {
                callback(secondSettings[path]);
                return {
                    unsubscribe: () => {},
                    isActive: () => true,
                };
            });

            // Configure with first settings manager
            router.configure(firstSettingsManager);
            expect(router['completionSettings']).toEqual(firstSettings.completion);

            // Configure with second settings manager
            router.configure(secondSettingsManager);

            // Verify settings were updated to second manager's values
            expect(router['completionSettings']).toEqual(secondSettings.completion);
        });
    });

    describe('Resource Cleanup', () => {
        test('should maintain settings after close', () => {
            const customSettings = {
                ...DefaultSettings,
                completion: { ...DefaultSettings.completion, enabled: false },
            };
            const customSettingsManager = createMockSettingsManager(customSettings);
            customSettingsManager.subscribe.callsFake((path: keyof typeof customSettings, callback: any) => {
                callback(customSettings[path]);
                return {
                    unsubscribe: () => {},
                    isActive: () => true,
                };
            });

            router.configure(customSettingsManager);

            // Verify settings are applied
            expect(router['completionSettings']).toEqual(customSettings.completion);

            router.close();

            // Settings should still be there after close
            expect(router['completionSettings']).toEqual(customSettings.completion);
        });

        test('should handle close when no subscriptions exist', () => {
            // Don't configure, so no subscriptions exist
            expect(() => router.close()).not.toThrow();
        });
    });

    describe('Related Resources Provider', () => {
        test('should attempt to use related resources provider for Resources section at top level', () => {
            const mockContext = createTopLevelContext('Resources', {
                text: '',
                propertyPath: ['Resources'],
            });
            mockContextManager.getContext.returns(mockContext);

            const result = router.getInlineCompletions(mockParams);

            expect(mockContextManager.getContext.calledOnce).toBe(true);
            // Should attempt to use related resources provider but return undefined due to no existing resources
            expect(result).toBeUndefined();
        });

        test('should not use related resources provider for non-Resources section', () => {
            const mockContext = createTopLevelContext('Parameters', {
                text: '',
                propertyPath: ['Parameters'],
            });
            mockContextManager.getContext.returns(mockContext);

            const result = router.getInlineCompletions(mockParams);

            expect(result).toBeUndefined();
            expect(mockContextManager.getContext.calledOnce).toBe(true);
        });

        test('should handle Resources section with resource-level context', () => {
            const mockContext = createTopLevelContext('Resources', {
                text: 'MyResource',
                propertyPath: ['Resources', 'MyResource'],
            });
            mockContextManager.getContext.returns(mockContext);

            const result = router.getInlineCompletions(mockParams);

            expect(mockContextManager.getContext.calledOnce).toBe(true);
            // Should return undefined since no existing resources to suggest from
            expect(result).toBeUndefined();
        });

        test('should not use related resources provider for deep property paths', () => {
            const mockContext = createTopLevelContext('Resources', {
                text: 'BucketName',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketName'],
            });
            mockContextManager.getContext.returns(mockContext);

            const result = router.getInlineCompletions(mockParams);

            expect(result).toBeUndefined();
            expect(mockContextManager.getContext.calledOnce).toBe(true);
        });
    });
});
