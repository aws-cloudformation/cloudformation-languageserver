import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HoverParams, CancellationToken } from 'vscode-languageserver-protocol';
import { hoverHandler } from '../../../src/handlers/HoverHandler';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('HoverHandler', () => {
    let mockServices: ReturnType<typeof createMockComponents>;
    let handler: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockServices = createMockComponents();
        handler = hoverHandler(mockServices);
    });

    it('should return empty hover when hover feature is disabled', () => {
        mockServices.hoverRouter.getHoverDoc.returns(undefined);

        const params: HoverParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 1, character: 5 },
        };

        const result = handler(params, CancellationToken.None);

        expect(result).toEqual({ contents: [] });
        expect(mockServices.hoverRouter.getHoverDoc.calledWith(params)).toBe(true);
    });

    it('should return empty hover when no documentation is found', async () => {
        const params: HoverParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
        };
        const token = {} as CancellationToken;

        mockServices.hoverRouter.getHoverDoc.returns(undefined);

        const result = await handler(params, token);

        expect(result).toEqual({ contents: [] });
        expect(mockServices.hoverRouter.getHoverDoc.calledWith(params)).toBe(true);
    });

    it('should return hover with markdown content when documentation is found', async () => {
        const params: HoverParams = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
        };
        const token = {} as CancellationToken;

        const mockDoc = '### Resources\nThe `Resources` section is a required top-level section...';
        mockServices.hoverRouter.getHoverDoc.returns(mockDoc);

        const result = await handler(params, token);

        expect(result).toEqual({
            contents: {
                kind: 'markdown',
                value: mockDoc,
            },
        });
        expect(mockServices.hoverRouter.getHoverDoc.calledWith(params)).toBe(true);
    });

    it('should return empty hover when syntax tree does not exist', async () => {
        // Override the default mock to return undefined for syntax tree
        mockServices.syntaxTreeManager.getSyntaxTree.returns(undefined);

        const params: HoverParams = {
            textDocument: { uri: 'file:///package.json' },
            position: { line: 0, character: 0 },
        };
        const token = {} as CancellationToken;

        const result = await handler(params, token);

        expect(result).toEqual({ contents: [] });
    });
});
