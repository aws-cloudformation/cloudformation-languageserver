import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';

describe('DocumentHandler', () => {
    const uri = 'file:///test.yaml';

    let extension: TestExtension;

    beforeEach(async () => {
        extension = new TestExtension();
        await extension.ready();
    });

    afterEach(async () => {
        await extension.close();
    });

    it('should handle document open and add to DocumentManager', async () => {
        const content = 'AWSTemplateFormatVersion: "2010-09-09"';

        await extension.openDocument({
            textDocument: {
                uri,
                languageId: 'yaml',
                version: 1,
                text: content,
            },
        });

        await WaitFor.waitFor(() => {
            const document = extension.components.documentManager.get(uri);
            expect(document).toBeDefined();
            expect(document?.contents()).toBe(content);
        });
    });

    it('should handle document change and update DocumentManager', async () => {
        await extension.openDocument({
            textDocument: {
                uri,
                languageId: 'yaml',
                version: 1,
                text: 'Hello',
            },
        });

        const newContent = 'AWSTemplateFormatVersion: "2010-09-09"';
        await extension.changeDocument({
            textDocument: { uri, version: 2 },
            contentChanges: [
                {
                    range: {
                        start: { line: 0, character: 5 },
                        end: { line: 0, character: 5 },
                    },
                    text: newContent,
                },
            ],
        });

        await WaitFor.waitFor(() => {
            const document = extension.components.documentManager.get(uri);
            expect(document?.contents()).toBe(`Hello${newContent}`);
        });

        const replaceContent = 'SomeRandomContent';
        await extension.changeDocument({
            textDocument: { uri, version: 2 },
            contentChanges: [{ text: replaceContent }],
        });

        await WaitFor.waitFor(() => {
            const document = extension.components.documentManager.get(uri);
            expect(document?.contents()).toBe(replaceContent);
        });
    });

    it('should handle document close and remove from DocumentManager', async () => {
        const content = 'AWSTemplateFormatVersion: "2010-09-09"';

        await extension.openDocument({
            textDocument: {
                uri,
                languageId: 'yaml',
                version: 1,
                text: content,
            },
        });

        await WaitFor.waitFor(() => {
            expect(extension.components.documentManager.get(uri)).toBeDefined();
        });

        await extension.closeDocument({
            textDocument: { uri },
        });

        await WaitFor.waitFor(() => {
            expect(extension.components.documentManager.get(uri)).toBeUndefined();
        });
    });
});
