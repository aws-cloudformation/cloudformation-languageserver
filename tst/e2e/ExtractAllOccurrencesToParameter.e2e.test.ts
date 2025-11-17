import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CodeAction, CodeActionKind, Range, TextEdit } from 'vscode-languageserver';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';

describe('Extract All Occurrences to Parameter - End-to-End Tests', () => {
    let extension: TestExtension;

    beforeEach(() => {
        extension = new TestExtension();
    });

    afterEach(async () => {
        await extension.close();
    });

    describe('JSON Template Tests', () => {
        it('should offer both single and all occurrences extraction when multiple literals exist', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        Bucket1: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                BucketName: 'my-test-bucket',
                            },
                        },
                        Bucket2: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                BucketName: 'my-test-bucket',
                            },
                        },
                    },
                },
                null,
                2,
            );

            // Open document
            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'json',
                    version: 1,
                    text: template,
                },
            });

            // Wait for document to be processed
            await WaitFor.waitFor(() => {
                const document = extension.components.documentManager.get(uri);
                expect(document).toBeDefined();
            });

            // Request CodeActions for the first occurrence of the string literal
            const range: Range = {
                start: { line: 6, character: 25 },
                end: { line: 6, character: 40 },
            };

            const codeActions = await extension.codeAction({
                textDocument: { uri },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            });

            // Verify both actions are offered
            expect(codeActions).toBeDefined();
            const actions = Array.isArray(codeActions) ? codeActions : [];

            const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');
            const extractAllAction = actions.find(
                (action: CodeAction) => action.title === 'Extract All Occurrences to Parameter',
            );

            expect(extractAction).toBeDefined();
            expect(extractAllAction).toBeDefined();

            // Verify the "Extract All Occurrences" action has multiple replacement edits
            const allOccurrencesEdit = extractAllAction?.edit;
            expect(allOccurrencesEdit).toBeDefined();
            expect(allOccurrencesEdit?.changes).toBeDefined();
            expect(allOccurrencesEdit?.changes?.[uri]).toBeDefined();

            const changes = allOccurrencesEdit?.changes?.[uri];
            expect(changes).toBeDefined();

            // Should have parameter insertion + multiple replacements (at least 3 edits total)
            expect(changes!.length).toBeGreaterThanOrEqual(3);

            // Should have one parameter insertion edit
            const parameterEdit = changes?.find(
                (change: TextEdit) => change.newText.includes('"Parameters"') || change.newText.includes('"Type":'),
            );
            expect(parameterEdit).toBeDefined();

            // Should have multiple replacement edits
            const replacementEdits = changes?.filter((change: TextEdit) => change.newText.includes('"Ref":'));
            expect(replacementEdits).toBeDefined();
            expect(replacementEdits!.length).toBe(2); // Two occurrences of "my-test-bucket"
        });

        it('should only offer single extraction when only one occurrence exists', async () => {
            const uri = 'file:///test-single.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        Bucket1: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                BucketName: 'unique-bucket',
                            },
                        },
                    },
                },
                null,
                2,
            );

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'json',
                    version: 1,
                    text: template,
                },
            });

            await WaitFor.waitFor(() => {
                const document = extension.components.documentManager.get(uri);
                expect(document).toBeDefined();
            });

            const range: Range = {
                start: { line: 6, character: 25 },
                end: { line: 6, character: 39 },
            };

            const codeActions = await extension.codeAction({
                textDocument: { uri },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            });

            const actions = Array.isArray(codeActions) ? codeActions : [];

            const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');
            const extractAllAction = actions.find(
                (action: CodeAction) => action.title === 'Extract All Occurrences to Parameter',
            );

            // Should only offer single extraction
            expect(extractAction).toBeDefined();
            expect(extractAllAction).toBeUndefined();
        });
    });

    describe('YAML Template Tests', () => {
        it('should offer both extraction options for YAML templates with multiple occurrences', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  Bucket1:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-test-bucket
  Bucket2:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-test-bucket`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            await WaitFor.waitFor(() => {
                const document = extension.components.documentManager.get(uri);
                expect(document).toBeDefined();
            });

            // Target the first occurrence of "my-test-bucket"
            const range: Range = {
                start: { line: 5, character: 18 },
                end: { line: 5, character: 32 },
            };

            const codeActions = await extension.codeAction({
                textDocument: { uri },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            });

            const actions = Array.isArray(codeActions) ? codeActions : [];

            const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');
            const extractAllAction = actions.find(
                (action: CodeAction) => action.title === 'Extract All Occurrences to Parameter',
            );

            expect(extractAction).toBeDefined();
            expect(extractAllAction).toBeDefined();

            // Verify YAML reference syntax is used
            const allOccurrencesEdit = extractAllAction?.edit;
            const changes = allOccurrencesEdit?.changes?.[uri];

            const replacementEdits = changes?.filter((change: TextEdit) => change.newText.includes('!Ref'));
            expect(replacementEdits).toBeDefined();
            expect(replacementEdits!.length).toBe(2);
        });
    });

    describe('Mixed Value Types', () => {
        it('should handle multiple occurrences of number literals', async () => {
            const uri = 'file:///test-numbers.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        Instance1: {
                            Type: 'AWS::EC2::Instance',
                            Properties: {
                                MinCount: 1,
                                MaxCount: 1,
                            },
                        },
                    },
                },
                null,
                2,
            );

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'json',
                    version: 1,
                    text: template,
                },
            });

            await WaitFor.waitFor(() => {
                const document = extension.components.documentManager.get(uri);
                expect(document).toBeDefined();
            });

            // Target the first occurrence of "1" - be more flexible with positioning
            const range: Range = {
                start: { line: 6, character: 20 },
                end: { line: 6, character: 25 },
            };

            const codeActions = await extension.codeAction({
                textDocument: { uri },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            });

            const actions = Array.isArray(codeActions) ? codeActions : [];

            const extractAllAction = actions.find(
                (action: CodeAction) => action.title === 'Extract All Occurrences to Parameter',
            );

            expect(extractAllAction).toBeDefined();

            // Verify multiple number replacements
            const changes = extractAllAction?.edit?.changes?.[uri];
            const replacementEdits = changes?.filter((change: TextEdit) => change.newText.includes('"Ref":'));
            expect(replacementEdits!.length).toBe(2);
        });

        it('should handle multiple occurrences of boolean literals', async () => {
            const uri = 'file:///test-booleans.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        Bucket1: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                PublicReadEnabled: true,
                                VersioningEnabled: true,
                            },
                        },
                    },
                },
                null,
                2,
            );

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'json',
                    version: 1,
                    text: template,
                },
            });

            await WaitFor.waitFor(() => {
                const document = extension.components.documentManager.get(uri);
                expect(document).toBeDefined();
            });

            // Target the first occurrence of "true"
            const range: Range = {
                start: { line: 6, character: 31 },
                end: { line: 6, character: 35 },
            };

            const codeActions = await extension.codeAction({
                textDocument: { uri },
                range,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            });

            const actions = Array.isArray(codeActions) ? codeActions : [];

            const extractAllAction = actions.find(
                (action: CodeAction) => action.title === 'Extract All Occurrences to Parameter',
            );

            expect(extractAllAction).toBeDefined();

            // Verify multiple boolean replacements
            const changes = extractAllAction?.edit?.changes?.[uri];
            const replacementEdits = changes?.filter((change: TextEdit) => change.newText.includes('"Ref":'));
            expect(replacementEdits!.length).toBe(2);
        });
    });
});
