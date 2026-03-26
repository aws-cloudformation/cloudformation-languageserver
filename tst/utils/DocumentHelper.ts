import { TestExtension } from './TestExtension';
import { WaitFor } from './Utils';

export const DocumentHelper = {
    async replaceDocumentContent(
        testExtension: TestExtension,
        uri: string,
        version: number,
        content: string,
    ): Promise<void> {
        await testExtension.changeDocument({
            textDocument: { uri, version },
            contentChanges: [{ text: content }],
        });

        await WaitFor.waitFor(() => {
            const docContent = testExtension.components.documentManager.get(uri)?.contents() ?? '';
            if (docContent !== content) {
                throw new Error('Document not updated');
            }
        }, 2500);
    },

    async appendDocumentContent(
        testExtension: TestExtension,
        uri: string,
        version: number,
        line: number,
        text: string,
        expectedTexts: string[],
    ): Promise<void> {
        await testExtension.changeDocument({
            textDocument: { uri, version },
            contentChanges: [
                {
                    range: { start: { line, character: 0 }, end: { line, character: 0 } },
                    text,
                },
            ],
        });

        await WaitFor.waitFor(() => {
            const content = testExtension.components.documentManager.get(uri)?.contents() ?? '';
            if (!expectedTexts.every((expected) => content.includes(expected))) {
                throw new Error('Document not updated');
            }
        }, 2500);
    },
};
