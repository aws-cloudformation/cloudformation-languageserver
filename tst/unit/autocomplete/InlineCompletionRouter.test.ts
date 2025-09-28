import { describe, expect, test, beforeEach, vi } from 'vitest';
import { InlineCompletionParams, InlineCompletionTriggerKind } from 'vscode-languageserver-protocol';
import { InlineCompletionRouter } from '../../../src/autocomplete/InlineCompletionRouter';
import { DocumentType } from '../../../src/document/Document';
import { DefaultSettings } from '../../../src/settings/Settings';
import { createTopLevelContext } from '../../utils/MockContext';
import { createMockContextManager, createMockSettingsManager } from '../../utils/MockServerComponents';

describe('InlineCompletionRouter', () => {
    const mockContextManager = createMockContextManager();
    const mockSettingsManager = createMockSettingsManager();
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
        router = new InlineCompletionRouter(mockContextManager);
        router.configure(mockSettingsManager);
        vi.restoreAllMocks();
    });

    test('should return undefined when completion is disabled', () => {
        const disabledSettings = {
            ...DefaultSettings,
            completion: { ...DefaultSettings.completion, enabled: false },
        };
        const disabledSettingsManager = createMockSettingsManager(disabledSettings);
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
        const mockContext = createTopLevelContext('Resources', { text: 'AWS::' });
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
        test('should update completion settings when notified', () => {
            const newCompletionSettings = { ...DefaultSettings.completion, enabled: false };

            // Simulate settings change
            router['onCompletionSettingsChanged'](newCompletionSettings);

            // Verify settings were updated
            expect(router['completionSettings']).toEqual(newCompletionSettings);
        });

        test('should update editor settings when notified', () => {
            const newEditorSettings = { ...DefaultSettings.editor, tabSize: 8 };

            // Simulate settings change
            router['onEditorSettingsChanged'](newEditorSettings);

            // Verify settings were updated
            expect(router['editorSettings']).toEqual(newEditorSettings);
        });

        test('should configure with settings manager', () => {
            const customSettings = {
                ...DefaultSettings,
                completion: { ...DefaultSettings.completion, enabled: false },
                editor: { ...DefaultSettings.editor, tabSize: 8 },
            };
            const customSettingsManager = createMockSettingsManager(customSettings);

            router.configure(customSettingsManager);

            expect(router['completionSettings']).toEqual(customSettings.completion);
            expect(router['editorSettings']).toEqual(customSettings.editor);
        });

        test('should handle settings reconfiguration', () => {
            const firstSettings = {
                ...DefaultSettings,
                completion: { ...DefaultSettings.completion, enabled: false },
                editor: { ...DefaultSettings.editor, tabSize: 4 },
            };
            const secondSettings = {
                ...DefaultSettings,
                completion: { ...DefaultSettings.completion, enabled: true },
                editor: { ...DefaultSettings.editor, tabSize: 8 },
            };

            const firstSettingsManager = createMockSettingsManager(firstSettings);
            const secondSettingsManager = createMockSettingsManager(secondSettings);

            // Configure with first settings manager
            router.configure(firstSettingsManager);
            expect(router['completionSettings']).toEqual(firstSettings.completion);
            expect(router['editorSettings']).toEqual(firstSettings.editor);

            // Configure with second settings manager
            router.configure(secondSettingsManager);

            // Verify settings were updated to second manager's values
            expect(router['completionSettings']).toEqual(secondSettings.completion);
            expect(router['editorSettings']).toEqual(secondSettings.editor);
        });
    });

    describe('Resource Cleanup', () => {
        test('should maintain settings after close', () => {
            const customSettings = {
                ...DefaultSettings,
                completion: { ...DefaultSettings.completion, enabled: false },
                editor: { ...DefaultSettings.editor, tabSize: 6 },
            };
            const customSettingsManager = createMockSettingsManager(customSettings);

            router.configure(customSettingsManager);

            // Verify settings are applied
            expect(router['completionSettings']).toEqual(customSettings.completion);
            expect(router['editorSettings']).toEqual(customSettings.editor);

            router.close();

            // Settings should still be there after close
            expect(router['completionSettings']).toEqual(customSettings.completion);
            expect(router['editorSettings']).toEqual(customSettings.editor);
        });

        test('should handle close when no subscriptions exist', () => {
            // Don't configure, so no subscriptions exist
            expect(() => router.close()).not.toThrow();
        });
    });

    describe('Static Factory Method', () => {
        test('should create router with components', () => {
            const mockComponents = {
                contextManager: mockContextManager,
            } as any;

            const createdRouter = InlineCompletionRouter.create(mockComponents);

            expect(createdRouter).toBeInstanceOf(InlineCompletionRouter);
        });
    });
});
