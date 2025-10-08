import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeLensParams, CancellationToken } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { codeLensHandler } from '../../../src/handlers/CodeLensHandler';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('CodeLensHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let handler: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockComponents = createMockComponents();
        handler = codeLensHandler(mockComponents);
    });

    it('should return empty array when document is not found', async () => {
        // Mock documents.documents.get to return undefined
        const mockDocuments = {
            get: vi.fn().mockReturnValue(undefined),
        };
        (mockComponents.documents as any).documents = mockDocuments;

        const params: CodeLensParams = {
            textDocument: { uri: 'file:///test.yaml' },
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toEqual([]);
    });

    it('should return stack actions and managed resource code lenses', async () => {
        const document = TextDocument.create(
            'file:///test.yaml',
            'yaml',
            1,
            'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket',
        );

        // Mock documents.documents.get to return the document
        const mockDocuments = {
            get: vi.fn().mockReturnValue(document),
        };
        (mockComponents.documents as any).documents = mockDocuments;

        mockComponents.managedResourceCodeLens.getCodeLenses.returns([
            {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                command: {
                    title: 'Open Stack Template',
                    command: 'aws.cloudformation.api.openStackTemplate',
                    arguments: ['test-stack', 'bucket-id'],
                },
            },
        ]);

        const params: CodeLensParams = {
            textDocument: { uri: 'file:///test.yaml' },
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toHaveLength(3); // 2 stack actions + 1 managed resource
        expect(result[0].command?.title).toBe('Dry Run Deployment');
        expect(result[1].command?.title).toBe('Deploy');
        expect(result[2].command?.title).toBe('Open Stack Template');
    });

    it('should pass correct arguments to stack action commands', async () => {
        const document = TextDocument.create(
            'file:///test.yaml',
            'yaml',
            1,
            'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket',
        );

        // Mock documents.documents.get to return the document
        const mockDocuments = {
            get: vi.fn().mockReturnValue(document),
        };
        (mockComponents.documents as any).documents = mockDocuments;

        mockComponents.managedResourceCodeLens.getCodeLenses.returns([]);

        const params: CodeLensParams = {
            textDocument: { uri: 'file:///test.yaml' },
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toHaveLength(2);
        expect(result[0].command?.arguments).toEqual(['file:///test.yaml']);
        expect(result[1].command?.arguments).toEqual(['file:///test.yaml']);
    });
});
