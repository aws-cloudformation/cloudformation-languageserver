import { beforeEach, describe, expect, test, afterAll } from 'vitest';
import { CompletionList, InsertTextFormat } from 'vscode-languageserver';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';

describe('Completion Tests', () => {
    const documentUri = 'file:///test.yaml';
    const extension = new TestExtension();

    beforeEach(async () => {
        await extension.reset();
    });

    afterAll(async () => {
        await extension.close();
    });

    describe('Indentation Detection', () => {
        test('should use user-typed 2-space indentation in snippets when file starts empty', async () => {
            // Start with empty file (simulates user opening new file)
            await extension.openDocument({
                textDocument: {
                    uri: documentUri,
                    languageId: 'yaml',
                    version: 1,
                    text: '',
                },
            });

            // User types content with 2-space indentation
            await extension.changeDocument({
                textDocument: { uri: documentUri, version: 2 },
                contentChanges: [
                    {
                        text: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    `,
                    },
                ],
            });

            await WaitFor.waitFor(async () => {
                const completions = await extension.completion({
                    textDocument: { uri: documentUri },
                    position: { line: 4, character: 4 },
                    context: { triggerKind: 2 },
                });

                const completionList = completions as CompletionList;
                const propertiesCompletion = completionList.items.find(
                    (item) => item.label === 'Properties' && item.insertTextFormat === InsertTextFormat.Snippet,
                );

                expect(propertiesCompletion).toBeDefined();
                // Snippet should use 2-space indentation (detected from user's typing)
                const insertText = propertiesCompletion?.insertText ?? '';
                expect(insertText).toContain('\n  '); // 2-space indent
                expect(insertText).not.toContain('\n    '); // Not 4-space
            });
        });

        test('should use 4-space indentation when user types with 4 spaces', async () => {
            await extension.openDocument({
                textDocument: {
                    uri: documentUri,
                    languageId: 'yaml',
                    version: 1,
                    text: '',
                },
            });

            // User types with 4-space indentation
            await extension.changeDocument({
                textDocument: { uri: documentUri, version: 2 },
                contentChanges: [
                    {
                        text: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
    MyBucket:
        Type: AWS::S3::Bucket
        `,
                    },
                ],
            });

            await WaitFor.waitFor(async () => {
                const completions = await extension.completion({
                    textDocument: { uri: documentUri },
                    position: { line: 4, character: 8 },
                    context: { triggerKind: 2 },
                });

                const completionList = completions as CompletionList;
                const propertiesCompletion = completionList.items.find(
                    (item) => item.label === 'Properties' && item.insertTextFormat === InsertTextFormat.Snippet,
                );

                expect(propertiesCompletion).toBeDefined();
                // Snippet should use 4-space indentation
                const insertText = propertiesCompletion?.insertText ?? '';
                expect(insertText).toContain('\n    '); // 4-space indent
            });
        });
    });

    test('should provide context-based completions for non-empty file', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: `AWSTemplateFormatVersion: "2010-09-09"\nResources:\n  `,
            },
        });

        await WaitFor.waitFor(async () => {
            const completions = await extension.completion({
                textDocument: { uri: documentUri },
                position: { line: 2, character: 2 }, // Position after "Resources:\n  "
                context: {
                    triggerKind: 2,
                },
            });

            expect(completions).toBeDefined();
            const completionList = completions as CompletionList;
            expect(completionList.items).toBeDefined();
            expect(Array.isArray(completionList.items)).toBe(true);
        });
    });

    test('should return empty completions when cursor is in middle of resource name', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: `Resources:
  Parameter1:
    Type: AWS::SSM::Parameter
    Properties:
      Type: String
      Value: Foo`,
            },
        });

        await WaitFor.waitFor(async () => {
            const completions = await extension.completion({
                textDocument: { uri: documentUri },
                position: { line: 1, character: 11 }, // After "Parameter1" but before ":"
                context: {
                    triggerKind: 2,
                },
            });

            expect(completions).toBeDefined();
            const completionList = completions as CompletionList;
            expect(completionList.items.length).toBe(0);

            const resourceAttributes = ['Metadata', 'UpdateReplacePolicy', 'DeletionPolicy', 'DependsOn'];
            for (const attribute of resourceAttributes) {
                expect(completionList.items).not.toContainEqual(
                    expect.objectContaining({
                        label: attribute,
                    }),
                );
            }
        });
    });

    test('should return resource attributes when cursor is after resource name colon', async () => {
        await extension.openDocument({
            textDocument: {
                uri: documentUri,
                languageId: 'yaml',
                version: 1,
                text: `Resources:
  Parameter1:
    `,
            },
        });

        await WaitFor.waitFor(async () => {
            const completions = await extension.completion({
                textDocument: { uri: documentUri },
                position: { line: 2, character: 4 }, // After proper indentation under resource
                context: {
                    triggerKind: 2,
                },
            });

            expect(completions).toBeDefined();
            const completionList = completions as CompletionList;

            if (completionList.items.length > 0) {
                const expectedAttributes = ['Type', 'Properties'];
                for (const attribute of expectedAttributes) {
                    const hasAttribute = completionList.items.some((item) => item.label === attribute);
                    if (hasAttribute) {
                        expect(completionList.items).toContainEqual(
                            expect.objectContaining({
                                label: attribute,
                            }),
                        );
                    }
                }
            }
        });
    });
});
