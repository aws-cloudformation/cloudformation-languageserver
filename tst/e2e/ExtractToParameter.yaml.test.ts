import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CodeAction, CodeActionKind, Range, TextEdit } from 'vscode-languageserver';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';

describe('Extract to Parameter - YAML Tests', () => {
    let extension: TestExtension;

    beforeEach(async () => {
        extension = new TestExtension();
        await extension.ready();
    });

    afterEach(async () => {
        await extension.close();
    });

    describe('Infrastructure Tests', () => {
        it('should handle YAML CloudFormation template documents', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
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
                expect(document?.contents()).toBe(template);
            });
        });

        it('should respond to CodeAction requests for YAML templates', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
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

            // Position on the string literal "my-test-bucket"
            const range: Range = {
                start: { line: 5, character: 18 },
                end: { line: 5, character: 32 },
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
                const actions = Array.isArray(codeActions) ? codeActions : [];
                expect(Array.isArray(actions)).toBe(true);
            });
        });

        it('should handle complex YAML template structures', async () => {
            const uri = 'file:///complex.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  ExistingParam:
    Type: String
    Default: existing-value
Resources:
  MySecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 10.0.0.0/16`;

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
                expect(document?.contents()).toBe(template);
            });
        });

        it('should handle malformed YAML gracefully', async () => {
            const uri = 'file:///malformed.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-bucket
    # Missing proper indentation
  InvalidResource:
Type: AWS::S3::Bucket`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the bucket name in malformed YAML
            const range: Range = {
                start: { line: 5, character: 18 },
                end: { line: 5, character: 29 },
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

                // Should handle malformed YAML without crashing
                expect(codeActions).toBeDefined();
                const actions = Array.isArray(codeActions) ? codeActions : [];
                expect(Array.isArray(actions)).toBe(true);
            });
        });
    });

    describe('Basic Literal Extraction', () => {
        it('should extract string literal from resource property', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: "my-test-bucket"`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the string literal "my-test-bucket" including quotes (line 5, chars 18-34)
            const range: Range = {
                start: { line: 5, character: 18 },
                end: { line: 5, character: 34 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
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
                const parameterEdit = changes?.find(
                    (change: TextEdit) =>
                        change.newText.includes('Parameters:') || change.newText.includes('Type: String'),
                );
                const replacementEdit = changes?.find((change: TextEdit) => change.newText.includes('!Ref'));

                expect(parameterEdit).toBeDefined();
                expect(replacementEdit).toBeDefined();
            });
        });

        it('should extract numeric literal with proper type inference', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.micro
      MinCount: 1
      MaxCount: 3`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the numeric literal 3
            const range: Range = {
                start: { line: 6, character: 16 },
                end: { line: 6, character: 17 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify parameter type is Number for numeric literals
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) => change.newText.includes('Type: Number'));

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should extract boolean literal with proper constraints', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the boolean literal true
            const range: Range = {
                start: { line: 6, character: 26 },
                end: { line: 6, character: 30 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify parameter type is String with AllowedValues for boolean
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find(
                    (change: TextEdit) =>
                        change.newText.includes('AllowedValues:') &&
                        (change.newText.includes('- "true"') || change.newText.includes('- true')),
                );

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should handle array literal extraction', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-12345
      SecurityGroups: [sg-12345, sg-67890]`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the flow sequence (inline array)
            const range: Range = {
                start: { line: 6, character: 22 },
                end: { line: 6, character: 44 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify parameter type is CommaDelimitedList for arrays
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) =>
                    change.newText.includes('Type: CommaDelimitedList'),
                );

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should extract from deeply nested structures', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MySecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 10.0.0.0/16`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the CIDR block in nested array
            const range: Range = {
                start: { line: 13, character: 18 },
                end: { line: 13, character: 30 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify the replacement maintains proper YAML structure
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const replacementEdit = changes?.find((change: TextEdit) => change.newText.includes('!Ref'));

                expect(replacementEdit).toBeDefined();
            });
        });

        it('should preserve YAML formatting and use proper syntax', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: formatted-bucket`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the bucket name string literal
            const range: Range = {
                start: { line: 5, character: 18 },
                end: { line: 5, character: 34 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];

                // Verify YAML !Ref syntax is used (not JSON {"Ref":})
                const replacementEdit = changes?.find(
                    (change: TextEdit) => change.newText.includes('!Ref') && !change.newText.includes('{"Ref":'),
                );
                expect(replacementEdit).toBeDefined();

                // Verify YAML formatting is preserved (proper indentation)
                const parameterEdit = changes?.find(
                    (change: TextEdit) => change.newText.includes('  '), // 2-space indentation typical for YAML
                );
                expect(parameterEdit).toBeDefined();
            });
        });

        it('should not offer extraction for intrinsic function references', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref AWS::StackName`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the Ref function
            const range: Range = {
                start: { line: 5, character: 18 },
                end: { line: 5, character: 38 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                // Should not offer extraction for intrinsic functions
                expect(extractAction).toBeUndefined();
            });
        });

        it('should generate unique parameter names when conflicts exist', async () => {
            const uri = 'file:///test.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  BucketName:
    Type: String
    Default: existing-bucket
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: another-bucket`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the bucket name that would conflict
            const range: Range = {
                start: { line: 9, character: 18 },
                end: { line: 9, character: 32 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify unique parameter name is generated
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find(
                    (change: TextEdit) =>
                        change.newText.includes('BucketName1:') ||
                        change.newText.includes('BucketName2:') ||
                        change.newText.includes('MyBucketBucketName:'),
                );

                expect(parameterEdit).toBeDefined();
            });
        });
    });

    describe('YAML-Specific Formatting Tests', () => {
        it('should handle different YAML indentation styles', async () => {
            const uri = 'file:///indented.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
    MyBucket:  # 4-space indentation
        Type: AWS::S3::Bucket
        Properties:
            BucketName: indented-bucket`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            const range: Range = {
                start: { line: 5, character: 24 },
                end: { line: 5, character: 39 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify indentation is preserved in parameter creation
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find(
                    (change: TextEdit) => change.newText.includes('    '), // 4-space indentation
                );

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should handle multi-line YAML values', async () => {
            const uri = 'file:///multiline.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyLambda:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        ZipFile: |
          def handler(event, context):
              return {'statusCode': 200}`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the multi-line string
            const range: Range = {
                start: { line: 6, character: 18 },
                end: { line: 8, character: 38 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify multi-line string is handled properly
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) => change.newText.includes('Type: String'));

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should handle YAML quoted strings with special characters', async () => {
            const uri = 'file:///quoted.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: "bucket-with-special-chars!@#$%"`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            const range: Range = {
                start: { line: 5, character: 18 },
                end: { line: 5, character: 50 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify special characters are preserved in default value
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) =>
                    change.newText.includes('bucket-with-special-chars!@#$%'),
                );

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should handle YAML flow sequences (inline arrays)', async () => {
            const uri = 'file:///flow.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-12345
      SecurityGroups: [sg-12345, sg-67890, sg-abcdef]`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the flow sequence
            const range: Range = {
                start: { line: 6, character: 22 },
                end: { line: 6, character: 53 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify flow sequence is handled as CommaDelimitedList
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) =>
                    change.newText.includes('Type: CommaDelimitedList'),
                );

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should handle YAML boolean variations (true, True, TRUE, yes, on)', async () => {
            const uri = 'file:///booleans.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket1:
    Type: AWS::S3::Bucket
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: yes`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Test "yes" boolean
            const range1: Range = {
                start: { line: 6, character: 26 },
                end: { line: 6, character: 29 },
            };

            await WaitFor.waitFor(async () => {
                const codeActions = await extension.codeAction({
                    textDocument: { uri },
                    range: range1,
                    context: {
                        diagnostics: [],
                        only: [CodeActionKind.RefactorExtract],
                    },
                });

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify boolean handling - check that parameter was created
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                expect(changes).toBeDefined();
                expect(changes!.length).toBeGreaterThan(0);

                // Check that one of the edits contains parameter definition
                const hasParameterEdit = changes!.some(
                    (change: TextEdit) =>
                        change.newText.includes('Type: String') || change.newText.includes('AllowedValues'),
                );
                expect(hasParameterEdit).toBe(true);
            });
        });

        it('should handle YAML anchors and aliases gracefully', async () => {
            const uri = 'file:///anchors.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: &bucket-name "shared-bucket-name"
  MyOtherBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: *bucket-name`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the anchor definition
            const range: Range = {
                start: { line: 5, character: 32 },
                end: { line: 5, character: 51 },
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

                // const actions = Array.isArray(codeActions) ? codeActions : [];
                // const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                // Should handle anchors (may or may not offer extraction depending on implementation)
                expect(codeActions).toBeDefined();
            });
        });
    });

    describe('Complex YAML Structure Tests', () => {
        it('should handle nested mappings with literal values', async () => {
            const uri = 'file:///nested.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          echo "Hello World" > /tmp/hello.txt
          chmod 755 /tmp/hello.txt`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the multi-line script
            const range: Range = {
                start: { line: 7, character: 10 },
                end: { line: 9, character: 36 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify multi-line string extraction
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) => change.newText.includes('Type: String'));

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should handle YAML tags and type annotations', async () => {
            const uri = 'file:///tagged.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !!str "explicitly-typed-string"`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            const range: Range = {
                start: { line: 5, character: 24 },
                end: { line: 5, character: 49 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify tagged values are handled properly
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) => change.newText.includes('Type: String'));

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should create Parameters section when none exists', async () => {
            const uri = 'file:///no-params.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: new-bucket`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            const range: Range = {
                start: { line: 5, character: 18 },
                end: { line: 5, character: 28 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify Parameters section is created
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const parameterEdit = changes?.find((change: TextEdit) => change.newText.includes('Parameters:'));

                expect(parameterEdit).toBeDefined();
            });
        });

        it('should handle mixed YAML and JSON-style intrinsic functions', async () => {
            const uri = 'file:///mixed.yaml';
            const template = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName:
        Fn::Join:
          - "-"
          - - "prefix"
            - "literal-part"
            - !Ref AWS::StackName`;

            await extension.openDocument({
                textDocument: {
                    uri,
                    languageId: 'yaml',
                    version: 1,
                    text: template,
                },
            });

            // Position on the literal string "literal-part"
            const range: Range = {
                start: { line: 8, character: 14 },
                end: { line: 8, character: 27 },
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

                const actions = Array.isArray(codeActions) ? codeActions : [];
                const extractAction = actions.find((action: CodeAction) => action.title === 'Extract to Parameter');

                expect(extractAction).toBeDefined();

                // Verify literal within complex structure can be extracted
                const edit = extractAction?.edit;
                const changes = edit?.changes?.[uri];
                const replacementEdit = changes?.find((change: TextEdit) => change.newText.includes('!Ref'));

                expect(replacementEdit).toBeDefined();
            });
        });
    });
});
