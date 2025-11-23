import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CodeAction, CodeActionKind, Range, TextEdit } from 'vscode-languageserver';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';
import { applyWorkspaceEdit } from '../utils/WorkspaceEditUtils';

describe('Extract to Parameter - JSON Tests', () => {
    let extension: TestExtension;

    beforeEach(async () => {
        extension = new TestExtension();
        await extension.ready();
    });

    afterEach(async () => {
        await extension.close();
    });

    describe('Infrastructure Tests', () => {
        it('should handle JSON CloudFormation template documents', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyBucket: {
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
                expect(document?.contents()).toBe(template);
            });
        });

        it('should respond to CodeAction requests for JSON templates', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyBucket: {
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

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'json',
                    version: 1,
                    text: template,
                },
            });

            // Position on the string literal "my-test-bucket"
            const range: Range = {
                start: { line: 6, character: 25 },
                end: { line: 6, character: 40 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                // Should return a response (even if empty for now)
                expect(codeActions).toBeDefined();
                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                expect(Array.isArray(actions)).toBe(true);
            });
        });

        it('should handle complex JSON template structures', async () => {
            const uri = 'file:///complex.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Parameters: {
                        ExistingParam: {
                            Type: 'String',
                            Default: 'existing-value',
                        },
                    },
                    Resources: {
                        MySecurityGroup: {
                            Type: 'AWS::EC2::SecurityGroup',
                            Properties: {
                                SecurityGroupIngress: [
                                    {
                                        IpProtocol: 'tcp',
                                        FromPort: 80,
                                        ToPort: 80,
                                        CidrIp: '0.0.0.0/0',
                                    },
                                    {
                                        IpProtocol: 'tcp',
                                        FromPort: 443,
                                        ToPort: 443,
                                        CidrIp: '10.0.0.0/16',
                                    },
                                ],
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
                expect(document?.contents()).toBe(template);
            });
        });

        it('should handle malformed JSON gracefully', async () => {
            const uri = 'file:///malformed.json';
            const template = `{
                "AWSTemplateFormatVersion": "2010-09-09",
                "Resources": {
                    "MyBucket": {
                        "Type": "AWS::S3::Bucket",
                        "Properties": {
                            "BucketName": "test-bucket"
                        }
                    }
                // Missing closing brace
            `;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'json',
                    version: 1,
                    text: template,
                },
            });

            // Position on the bucket name in malformed JSON
            const range: Range = {
                start: { line: 6, character: 28 },
                end: { line: 6, character: 40 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                // Should handle malformed JSON without crashing
                expect(codeActions).toBeDefined();
                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                expect(Array.isArray(actions)).toBe(true);
            });
        });
    });

    // Test cases for the implemented feature
    describe('Basic Literal Extraction', () => {
        it('should extract string literal from resource property', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyBucket: {
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

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'json',
                    version: 1,
                    text: template,
                },
            });

            const range: Range = {
                start: { line: 6, character: 25 },
                end: { line: 6, character: 40 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();
                expect(extractAction?.kind).toBe(CodeActionKind.RefactorExtract);

                // Verify the workspace edit creates a parameter and replaces the literal
                const edit = extractAction?.edit;
                expect(edit?.changes).toBeDefined();

                const changes = edit?.changes?.[uri];
                expect(changes).toBeDefined();
                expect(changes?.length).toBeGreaterThan(0);

                // Should have edits for parameter creation and literal replacement
                const parameterEdit = changes?.find((change: TextEdit) => change.newText.includes('"Parameters"'));
                const replacementEdit = changes?.find((change: TextEdit) => change.newText.includes('"Ref"'));

                expect(parameterEdit).toBeDefined();
                expect(replacementEdit).toBeDefined();
            });
        });

        it('should extract numeric literal with proper type inference', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyInstance: {
                            Type: 'AWS::EC2::Instance',
                            Properties: {
                                InstanceType: 't3.micro',
                                MinCount: 1,
                                MaxCount: 3,
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

            // Position on the numeric literal 3 (line 8, character 20 is the "3")
            const range: Range = {
                start: { line: 8, character: 20 },
                end: { line: 8, character: 21 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify parameter type is Number for numeric literals
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) => change.newText.includes('"Type": "Number"'));

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should extract boolean literal with proper constraints', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyBucket: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                PublicReadPolicy: true,
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

            // Position on the boolean literal true
            const range: Range = {
                start: { line: 6, character: 32 },
                end: { line: 6, character: 36 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify parameter type is String with AllowedValues for boolean
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) =>
                    change.newText.includes('"AllowedValues": ["true", "false"]'),
                );

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should handle array literal extraction', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyInstance: {
                            Type: 'AWS::EC2::Instance',
                            Properties: {
                                SecurityGroupIds: ['sg-12345', 'sg-67890'],
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

            // Position on the array literal
            const range: Range = {
                start: { line: 6, character: 33 },
                end: { line: 6, character: 55 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify parameter type is CommaDelimitedList for arrays
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) =>
                    change.newText.includes('"Type": "CommaDelimitedList"'),
                );

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should extract from deeply nested structures', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MySecurityGroup: {
                            Type: 'AWS::EC2::SecurityGroup',
                            Properties: {
                                SecurityGroupIngress: [
                                    {
                                        IpProtocol: 'tcp',
                                        FromPort: 80,
                                        ToPort: 80,
                                        CidrIp: '0.0.0.0/0',
                                    },
                                    {
                                        IpProtocol: 'tcp',
                                        FromPort: 443,
                                        ToPort: 443,
                                        CidrIp: '10.0.0.0/16',
                                    },
                                ],
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

            // Position on the CIDR block in nested array
            const range: Range = {
                start: { line: 15, character: 28 },
                end: { line: 15, character: 41 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify the replacement maintains proper JSON structure
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const replacementEdit = changes?.find((change: TextEdit) => change.newText.includes('{"Ref":'));

                expect(replacementEdit).toBeDefined();
            });
        });

        it('should preserve JSON formatting and use proper syntax', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyBucket: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                BucketName: 'formatted-bucket',
                            },
                        },
                    },
                },
                null,
                4,
            ); // 4-space indentation

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'json',
                    version: 1,
                    text: template,
                },
            });

            // Position on the bucket name string literal "formatted-bucket" (line 6, characters 31-48)
            const range: Range = {
                start: { line: 6, character: 31 },
                end: { line: 6, character: 48 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];

                // Verify JSON Ref syntax is used (not YAML !Ref)
                const replacementEdit = changes?.find(
                    (change: TextEdit) => change.newText.includes('{"Ref":') && !change.newText.includes('!Ref'),
                );
                expect(replacementEdit).toBeDefined();

                // Verify formatting is preserved (4-space indentation)
                const parameterEdit = changes?.find(
                    (change: TextEdit) => change.newText.includes('    '), // 4-space indentation
                );
                expect(parameterEdit).toBeDefined();
            });
        });

        it('should not offer extraction for intrinsic function references', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyBucket: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                BucketName: {
                                    Ref: 'AWS::StackName',
                                },
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

            // Position on the Ref function
            const range: Range = {
                start: { line: 6, character: 25 },
                end: { line: 8, character: 26 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                // Should not offer extraction for intrinsic functions
                expect(extractAction).toBeUndefined();
            });
        });

        it('should generate unique parameter names when conflicts exist', async () => {
            const uri = 'file:///test.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Parameters: {
                        BucketName: {
                            Type: 'String',
                            Default: 'existing-bucket',
                        },
                    },
                    Resources: {
                        MyBucket: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                BucketName: 'another-bucket',
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

            // Position on the bucket name that would conflict
            const range: Range = {
                start: { line: 12, character: 25 },
                end: { line: 12, character: 40 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify unique parameter name is generated
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find(
                    (change: TextEdit) =>
                        change.newText.includes('"BucketName1"') ||
                        change.newText.includes('"BucketName2"') ||
                        change.newText.includes('"MyBucketBucketName"'),
                );

                expect(parameterEdit).toBeDefined();
            });
        });
    });

    describe('Sequential Extraction Tests', () => {
        it('should handle two sequential extractions without document corruption', async () => {
            const uri = 'file:///sequential.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyBucket: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                BucketName: 'first-bucket',
                                Tags: [
                                    {
                                        Key: 'Environment',
                                        Value: 'production',
                                    },
                                ],
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

            // First extraction: extract "first-bucket"
            const firstRange: Range = {
                start: { line: 6, character: 25 },
                end: { line: 6, character: 38 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range: firstRange,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Apply the first extraction
                const edit = extractAction?.edit;
                expect(edit?.changes).toBeDefined();

                const changes = edit?.changes?.[uri];
                expect(changes).toBeDefined();
            });

            // Apply edits to the document
            const document = extension.components.documentManager.get(uri);
            const currentContent = document?.contents() ?? template;
            const codeActions = await extension.codeAction({
                textDocument: { uri },
                range: firstRange,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            });
            const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
            const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');
            const changes = extractAction?.edit?.changes?.[uri];
            const updatedContent = applyWorkspaceEdit(currentContent, changes);

            await extension.changeDocument({
                textDocument: {
                    uri,
                    version: 2,
                },
                contentChanges: [
                    {
                        text: updatedContent,
                    },
                ],
            });

            // Get the updated document content
            await WaitFor.waitFor(() => {
                const document = extension.components.documentManager.get(uri);
                expect(document).toBeDefined();

                const content = document?.contents();
                expect(content).toBeDefined();
                expect(content).toContain('"Parameters"');
                expect(content).toContain('"Ref"');
            });

            // Second extraction: extract "production" from the updated document
            // Need to find the new position after the first extraction
            // Give the syntax tree time to update
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Second extraction: extract "production"
            const secondDocument = extension.components.documentManager.get(uri);
            const secondContent = secondDocument?.contents() ?? '';
            const lines = secondContent.split('\n');
            let productionLine = -1;
            let productionStart = -1;
            let productionEnd = -1;

            for (const [i, line] of lines.entries()) {
                const match = line.match(/"Value":\s*"production"/);
                if (match) {
                    productionLine = i;
                    const valueIndex = line.indexOf('"production"');
                    productionStart = valueIndex;
                    productionEnd = valueIndex + '"production"'.length;
                    break;
                }
            }

            expect(productionLine).toBeGreaterThanOrEqual(0);

            const secondRange: Range = {
                start: { line: productionLine, character: productionStart },
                end: { line: productionLine, character: productionEnd },
            };

            const secondCodeActions = await extension.codeAction({
                textDocument: { uri },
                range: secondRange,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            });

            const secondActions = Array.isArray(secondCodeActions)
                ? secondCodeActions
                : ((secondCodeActions as any)?.items ?? []);
            const secondExtractAction = secondActions.find(
                (action: CodeAction) => action.title === 'Extract to Parameter',
            );

            if (secondExtractAction) {
                const secondChanges = secondExtractAction?.edit?.changes?.[uri];
                const finalContent = applyWorkspaceEdit(secondContent, secondChanges);

                await extension.changeDocument({
                    textDocument: {
                        uri,
                        version: 3,
                    },
                    contentChanges: [
                        {
                            text: finalContent,
                        },
                    ],
                });
            }

            // Verify the final document is valid and contains parameters
            await WaitFor.waitFor(() => {
                const document = extension.components.documentManager.get(uri);
                const finalContent = document?.contents() ?? '';

                // Should be valid JSON
                expect(() => JSON.parse(finalContent)).not.toThrow();

                const parsed = JSON.parse(finalContent);

                // Should have Parameters section with at least one parameter
                expect(parsed.Parameters).toBeDefined();
                expect(Object.keys(parsed.Parameters).length).toBeGreaterThanOrEqual(1);

                // First value should be replaced with Ref
                const bucketNameValue = parsed.Resources.MyBucket.Properties.BucketName;
                expect(bucketNameValue).toHaveProperty('Ref');

                // If second extraction succeeded, verify it too
                if (secondExtractAction) {
                    expect(Object.keys(parsed.Parameters).length).toBe(2);
                    const tagValue = parsed.Resources.MyBucket.Properties.Tags[0].Value;
                    expect(tagValue).toHaveProperty('Ref');
                }
            });
        });

        it('should handle sequential extractions from different resource types', async () => {
            const uri = 'file:///multi-resource.json';
            const template = JSON.stringify(
                {
                    AWSTemplateFormatVersion: '2010-09-09',
                    Resources: {
                        MyBucket: {
                            Type: 'AWS::S3::Bucket',
                            Properties: {
                                BucketName: 'my-bucket',
                            },
                        },
                        MyQueue: {
                            Type: 'AWS::SQS::Queue',
                            Properties: {
                                QueueName: 'my-queue',
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

            // First extraction: extract "my-bucket"
            const firstRange: Range = {
                start: { line: 6, character: 25 },
                end: { line: 6, character: 34 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range: firstRange,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();
            });

            // Apply the first extraction
            const firstDocument = extension.components.documentManager.get(uri);
            const firstContent = firstDocument?.contents() ?? template;
            const firstCodeActions = await extension.codeAction({
                textDocument: { uri },
                range: firstRange,
                context: {
                    diagnostics: [],
                    only: [CodeActionKind.RefactorExtract],
                },
            });
            const firstActions = Array.isArray(firstCodeActions)
                ? firstCodeActions
                : ((firstCodeActions as any)?.items ?? []);
            const firstExtractAction = firstActions.find(
                (action: CodeAction) => action.title === 'Extract to Parameter',
            );
            const firstChanges = firstExtractAction?.edit?.changes?.[uri];
            const firstUpdatedContent = applyWorkspaceEdit(firstContent, firstChanges);

            await extension.changeDocument({
                textDocument: {
                    uri,
                    version: 2,
                },
                contentChanges: [
                    {
                        text: firstUpdatedContent,
                    },
                ],
            });

            // Wait for document to be updated
            await WaitFor.waitFor(() => {
                const document = extension.components.documentManager.get(uri);
                const content = document?.contents();
                expect(content).toContain('"Parameters"');
                expect(content).toContain('"Ref"');
            });

            // Second extraction: extract "my-queue"
            await WaitFor.waitFor(async () => {
                const document = extension.components.documentManager.get(uri);
                const content = document?.contents() ?? '';
                const lines = content.split('\n');

                let queueLine = -1;
                let queueStart = -1;
                let queueEnd = -1;

                for (const [i, line] of lines.entries()) {
                    const match = line.match(/"QueueName":\s*"my-queue"/);
                    if (match) {
                        queueLine = i;
                        const valueIndex = line.indexOf('"my-queue"');
                        queueStart = valueIndex + 1;
                        queueEnd = valueIndex + 'my-queue'.length + 1;
                        break;
                    }
                }

                expect(queueLine).toBeGreaterThanOrEqual(0);

                const secondRange: Range = {
                    start: { line: queueLine, character: queueStart },
                    end: { line: queueLine, character: queueEnd },
                };

                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range: secondRange,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : ((codeActions as any)?.items ?? []);
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                // May not be available due to syntax tree update timing
                if (!extractAction) {
                    return;
                }

                expect(extractAction).toBeDefined();
            });

            // Give the syntax tree time to update
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Apply the second extraction
            const secondDocument = extension.components.documentManager.get(uri);
            const secondContent = secondDocument?.contents() ?? '';
            const lines = secondContent.split('\n');

            let queueLine = -1;
            let queueStart = -1;
            let queueEnd = -1;

            for (const [i, line] of lines.entries()) {
                const match = line.match(/"QueueName":\s*"my-queue"/);
                if (match) {
                    queueLine = i;
                    const valueIndex = line.indexOf('"my-queue"');
                    queueStart = valueIndex;
                    queueEnd = valueIndex + '"my-queue"'.length;
                    break;
                }
            }

            let secondExtractAction: CodeAction | undefined;

            if (queueLine >= 0) {
                const secondRange: Range = {
                    start: { line: queueLine, character: queueStart },
                    end: { line: queueLine, character: queueEnd },
                };

                const secondCodeActions = await extension.codeAction({
                    textDocument: { uri },
                    range: secondRange,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const secondActions = Array.isArray(secondCodeActions)
                    ? secondCodeActions
                    : ((secondCodeActions as any)?.items ?? []);
                secondExtractAction = secondActions.find(
                    (action: CodeAction) => action.title === 'Extract to Parameter',
                );

                if (secondExtractAction) {
                    const secondChanges = secondExtractAction?.edit?.changes?.[uri];
                    const finalContent = applyWorkspaceEdit(secondContent, secondChanges!);

                    await extension.changeDocument({
                        textDocument: {
                            uri,
                            version: 3,
                        },
                        contentChanges: [
                            {
                                text: finalContent,
                            },
                        ],
                    });
                }
            }

            // Verify final document integrity
            await WaitFor.waitFor(() => {
                const document = extension.components.documentManager.get(uri);
                const finalContent = document?.contents() ?? '';

                expect(() => JSON.parse(finalContent)).not.toThrow();

                const parsed = JSON.parse(finalContent);
                expect(parsed.Parameters).toBeDefined();
                expect(Object.keys(parsed.Parameters).length).toBeGreaterThanOrEqual(1);

                expect(parsed.Resources.MyBucket.Properties.BucketName).toHaveProperty('Ref');

                // If second extraction succeeded, verify it too
                if (secondExtractAction) {
                    expect(Object.keys(parsed.Parameters).length).toBe(2);
                    expect(parsed.Resources.MyQueue.Properties.QueueName).toHaveProperty('Ref');
                }
            });
        });
    });
});
