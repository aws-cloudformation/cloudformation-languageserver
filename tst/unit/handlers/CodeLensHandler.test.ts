import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeLensParams, CancellationToken } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeLensProvider } from '../../../src/codeLens/CodeLensProvider';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import { Document } from '../../../src/document/Document';
import { codeLensHandler } from '../../../src/handlers/CodeLensHandler';
import {
    createMockComponents,
    createMockDocumentManager,
    createMockManagedResourceCodeLens,
    createMockSyntaxTreeManager,
} from '../../utils/MockServerComponents';

vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

describe('CodeLensHandler', () => {
    const managedCodeLens = createMockManagedResourceCodeLens();
    const docManager = createMockDocumentManager();
    const syntaxTreeManager = createMockSyntaxTreeManager();
    const codeLensProvider = new CodeLensProvider(syntaxTreeManager, docManager, managedCodeLens);

    let handler: any;
    let mockGetEntityMap: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetEntityMap = vi.mocked(getEntityMap);

        handler = codeLensHandler(
            createMockComponents({
                codeLensProvider,
            }),
        );
    });

    it('should return undefined when document is not found', async () => {
        docManager.get.returns(undefined);

        const params: CodeLensParams = {
            textDocument: { uri: 'file:///test.yaml' },
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toBeUndefined();
    });

    it('should return stack actions and managed resource code lenses for valid CFN template', async () => {
        const document = new Document(
            TextDocument.create('file:///test.yaml', 'yaml', 1, 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket'),
        );

        docManager.get.returns(document);

        const mockSyntaxTree = { rootNode: {} };
        syntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree as any);

        const mockResourcesMap = new Map([['Bucket', { entity: {}, startPosition: {}, endPosition: {} }]]);
        mockGetEntityMap.mockReturnValue(mockResourcesMap);

        managedCodeLens.getCodeLenses.returns([
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

        expect(result).toHaveLength(2);
        expect(result[0].command?.title).toBe('Validate and Deploy');
        expect(result[1].command?.title).toBe('Open Stack Template');
    });

    it('should not return stack actions for empty files', async () => {
        const document = new Document(TextDocument.create('file:///test.yaml', 'yaml', 1, ''));

        docManager.get.returns(document);
        managedCodeLens.getCodeLenses.returns([]);

        const params: CodeLensParams = {
            textDocument: { uri: 'file:///test.yaml' },
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toHaveLength(0);
    });

    it('should not return stack actions for non-CFN files', async () => {
        const document = new Document(
            TextDocument.create('file:///test.yaml', 'yaml', 1, 'some: random\nyaml: content'),
        );

        docManager.get.returns(document);
        managedCodeLens.getCodeLenses.returns([]);

        const params: CodeLensParams = {
            textDocument: { uri: 'file:///test.yaml' },
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toHaveLength(0);
    });

    it('should not return stack actions when Resources section is missing', async () => {
        const document = new Document(
            TextDocument.create(
                'file:///test.yaml',
                'yaml',
                1,
                'AWSTemplateFormatVersion: "2010-09-09"\nDescription: Test',
            ),
        );

        docManager.get.returns(document);
        syntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(undefined);
        managedCodeLens.getCodeLenses.returns([]);

        const params: CodeLensParams = {
            textDocument: { uri: 'file:///test.yaml' },
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toHaveLength(0);
    });

    it('should pass correct arguments to stack action commands', async () => {
        const document = new Document(
            TextDocument.create('file:///test.yaml', 'yaml', 1, 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket'),
        );

        docManager.get.returns(document);

        const mockSyntaxTree = { rootNode: {} };
        syntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree as any);

        const mockResourcesMap = new Map([['Bucket', { entity: {}, startPosition: {}, endPosition: {} }]]);
        mockGetEntityMap.mockReturnValue(mockResourcesMap);

        managedCodeLens.getCodeLenses.returns([]);

        const params: CodeLensParams = {
            textDocument: { uri: 'file:///test.yaml' },
        };

        const result = await handler(params, CancellationToken.None);

        expect(result).toHaveLength(1);
        expect(result[0].command?.arguments).toEqual(['file:///test.yaml']);
    });
});
