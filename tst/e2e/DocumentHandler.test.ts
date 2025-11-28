import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';

describe('DocumentHandler', () => {
    const uri = 'file:///test.yaml';

    const extension = new TestExtension();

    beforeEach(async () => {
        await extension.reset();
    });

    beforeEach(async () => {
        await extension.reset();
    });

    afterAll(async () => {
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

    it('should create syntax tree for template documents on open', async () => {
        const content = 'AWSTemplateFormatVersion: "2010-09-09"\nResources: {}';

        await extension.openDocument({
            textDocument: {
                uri,
                languageId: 'yaml',
                version: 1,
                text: content,
            },
        });

        await WaitFor.waitFor(() => {
            const tree = extension.components.syntaxTreeManager.getSyntaxTree(uri);
            expect(tree).toBeDefined();
            expect(tree?.content()).toBe(content);
        });
    });

    it('should update syntax tree on incremental document changes', async () => {
        const initialContent = 'AWSTemplateFormatVersion: "2010-09-09"\nResources: {}';

        await extension.openDocument({
            textDocument: {
                uri,
                languageId: 'yaml',
                version: 1,
                text: initialContent,
            },
        });

        await WaitFor.waitFor(() => {
            expect(extension.components.syntaxTreeManager.getSyntaxTree(uri)).toBeDefined();
        });

        const editRange = { start: { line: 0, character: 35 }, end: { line: 0, character: 37 } };
        const editText = '00';
        const expectedContent = TestExtension.applyEdit(initialContent, editRange, editText);

        await extension.changeDocument({
            textDocument: { uri, version: 2 },
            contentChanges: [
                {
                    range: editRange,
                    text: editText,
                },
            ],
        });

        await WaitFor.waitFor(() => {
            const tree = extension.components.syntaxTreeManager.getSyntaxTree(uri);
            expect(tree).toBeDefined();
            expect(tree?.content()).toBe(expectedContent);
        });
    });

    it('should delete syntax tree when document is closed', async () => {
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
            expect(extension.components.syntaxTreeManager.getSyntaxTree(uri)).toBeDefined();
        });

        await extension.closeDocument({
            textDocument: { uri },
        });

        await WaitFor.waitFor(() => {
            expect(extension.components.syntaxTreeManager.getSyntaxTree(uri)).toBeUndefined();
        });
    });

    it('should not create syntax tree for non-template documents', async () => {
        const content = 'someKey: someValue\nanotherKey: anotherValue';

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

        // Give it time to potentially create a tree (it shouldn't)
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(extension.components.syntaxTreeManager.getSyntaxTree(uri)).toBeUndefined();
    });
});
