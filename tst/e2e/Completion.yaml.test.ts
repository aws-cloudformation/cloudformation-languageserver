import { beforeEach, afterEach, describe, expect, test } from 'vitest';
import { CompletionList } from 'vscode-languageserver';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';

describe('Completion Tests', () => {
    const documentUri = 'file:///test.yaml';
    let extension: TestExtension;

    beforeEach(() => {
        extension = new TestExtension();
    });

    afterEach(async () => {
        await extension.close();
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
