import { describe, expect, test } from 'vitest';
import { CancellationToken } from 'vscode-jsonrpc';
import { CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { completionHandler } from '../../../src/handlers/CompletionHandler';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';
import { createTopLevelContext } from '../../utils/MockContext';
import { createMockComponents } from '../../utils/MockServerComponents';
import { createMockYamlSyntaxTree } from '../../utils/TestTree';

describe('CompletionHandler', () => {
    const uri = 'file:///test.yaml';
    const mockSyntaxTree = createMockYamlSyntaxTree();
    const mockServices = createMockComponents();

    test('should return completion list with fuzzy search results when context exists', () => {
        const mockContext = createTopLevelContext('Unknown', { text: 'Res' });
        mockServices.contextManager.getContext.returns(mockContext);
        mockServices.syntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

        // Mock completionRouter to return some completion items
        const mockCompletions = {
            isIncomplete: false,
            items: [
                {
                    label: 'Resources',
                    kind: CompletionItemKind.Class,
                    detail: ExtensionName,
                },
            ],
        };
        mockServices.completionRouter.getCompletions.returns(mockCompletions);

        const mockParams: CompletionParams = {
            textDocument: { uri: uri },
            position: { line: 0, character: 0 },
        };

        const handler = completionHandler(mockServices);
        const result = handler(mockParams, CancellationToken.None, undefined as any, undefined as any) as any;

        expect(result).toBeDefined();
        expect(result?.isIncomplete).toBe(false);
        expect(result?.items.length).toBeGreaterThan(0);

        const resourcesItem = result?.items.find((item: any) => item?.label === 'Resources');
        expect(resourcesItem).toBeDefined();
        expect(resourcesItem!.kind).toBe(CompletionItemKind.Class);
        expect(resourcesItem!.detail).toBe(ExtensionName);
    });
});
