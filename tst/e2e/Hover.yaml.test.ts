import { describe, expect, test, beforeEach, afterAll } from 'vitest';
import { Hover, MarkupContent, MarkupKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { templateSectionDocsMap } from '../../src/artifacts/TemplateSectionDocs';
import { TopLevelSection } from '../../src/context/ContextType';
import { getSimpleYamlTemplateText } from '../utils/TemplateUtils';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';

describe('Hover Tests', () => {
    const documentUri = 'file:///test.yaml';
    const extension = new TestExtension();

    beforeEach(async () => {
        await extension.reset();
    });

    afterAll(async () => {
        await extension.close();
    });

    test('should provide hover information for CloudFormation outputs', async () => {
        const textDocument = TextDocument.create(documentUri, 'yaml', 1, getSimpleYamlTemplateText());

        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                text: textDocument.getText(),
                languageId: textDocument.languageId,
                version: textDocument.version,
            },
        });

        await WaitFor.waitFor(async () => {
            const hover = await extension.hover({
                textDocument: { uri: documentUri },
                position: { line: 1, character: 1 },
            });

            expect(hover).toBeDefined();
            expect(((hover as Hover).contents as MarkupContent).value).toEqual(
                templateSectionDocsMap.get(TopLevelSection.Resources),
            );
            expect(((hover as Hover).contents as MarkupContent).kind).toEqual(MarkupKind.Markdown);
        });
    });
});
