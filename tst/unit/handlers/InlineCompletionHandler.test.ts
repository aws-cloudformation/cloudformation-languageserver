import { describe, expect, test, beforeEach } from 'vitest';
import { CancellationToken } from 'vscode-jsonrpc';
import { InlineCompletionParams, InlineCompletionTriggerKind } from 'vscode-languageserver-protocol';
import { inlineCompletionHandler } from '../../../src/handlers/InlineCompletionHandler';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('InlineCompletionHandler', () => {
    const uri = 'file:///test.yaml';
    const mockServices = createMockComponents();

    const mockParams: InlineCompletionParams = {
        textDocument: { uri: uri },
        position: { line: 0, character: 0 },
        context: {
            triggerKind: InlineCompletionTriggerKind.Invoked,
        },
    };

    beforeEach(() => {
        mockServices.inlineCompletionRouter.getInlineCompletions.reset();
    });

    test('should call inlineCompletionRouter.getInlineCompletions with correct parameters', async () => {
        const mockInlineCompletions = {
            items: [
                {
                    insertText: 'Type: AWS::S3::Bucket',
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: 0, character: 0 },
                    },
                },
            ],
        };

        mockServices.inlineCompletionRouter.getInlineCompletions.resolves(mockInlineCompletions);

        const handler = inlineCompletionHandler(mockServices);
        const result = await handler(mockParams, CancellationToken.None);

        expect(mockServices.inlineCompletionRouter.getInlineCompletions.calledOnce).toBe(true);
        expect(mockServices.inlineCompletionRouter.getInlineCompletions.calledWith(mockParams)).toBe(true);
        expect(result).toEqual(mockInlineCompletions);
    });

    test('should return undefined when router returns undefined', async () => {
        mockServices.inlineCompletionRouter.getInlineCompletions.resolves(undefined);

        const handler = inlineCompletionHandler(mockServices);
        const result = await handler(mockParams, CancellationToken.None);

        expect(result).toBeUndefined();
    });

    test('should handle Promise return from router', async () => {
        const mockInlineCompletions = {
            items: [
                {
                    insertText: 'Properties:\n  BucketName: MyBucket',
                    range: {
                        start: { line: 1, character: 2 },
                        end: { line: 1, character: 2 },
                    },
                },
            ],
        };

        mockServices.inlineCompletionRouter.getInlineCompletions.returns(Promise.resolve(mockInlineCompletions));

        const handler = inlineCompletionHandler(mockServices);
        const result = await handler(mockParams, CancellationToken.None);

        expect(result).toEqual(mockInlineCompletions);
    });

    test('should handle different trigger kinds', () => {
        const automaticParams: InlineCompletionParams = {
            ...mockParams,
            context: {
                triggerKind: InlineCompletionTriggerKind.Automatic,
            },
        };

        mockServices.inlineCompletionRouter.getInlineCompletions.resolves({ items: [] });

        const handler = inlineCompletionHandler(mockServices);
        handler(automaticParams, CancellationToken.None);

        expect(mockServices.inlineCompletionRouter.getInlineCompletions.calledWith(automaticParams)).toBe(true);
    });

    test('should handle different document URIs', () => {
        const jsonParams: InlineCompletionParams = {
            ...mockParams,
            textDocument: { uri: 'file:///test.json' },
        };

        mockServices.inlineCompletionRouter.getInlineCompletions.resolves({ items: [] });

        const handler = inlineCompletionHandler(mockServices);
        handler(jsonParams, CancellationToken.None);

        expect(mockServices.inlineCompletionRouter.getInlineCompletions.calledWith(jsonParams)).toBe(true);
    });

    test('should handle different positions', () => {
        const positionParams: InlineCompletionParams = {
            ...mockParams,
            position: { line: 5, character: 10 },
        };

        mockServices.inlineCompletionRouter.getInlineCompletions.resolves({ items: [] });

        const handler = inlineCompletionHandler(mockServices);
        handler(positionParams, CancellationToken.None);

        expect(mockServices.inlineCompletionRouter.getInlineCompletions.calledWith(positionParams)).toBe(true);
    });
});
