import { describe, expect, it } from 'vitest';
import { Diagnostic, Range } from 'vscode-languageserver';
import { DocumentType } from '../../../src/document/Document';
import { METADATA_CONTEXT_KEY } from '../../../src/schema/MetadataContextSchema';
import { DiagnosticExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

/** Range of the first occurrence of `text`, optionally searching only after the line containing `afterText`. */
function rangeOfText(content: string, text: string, afterText?: string): Range {
    const lines = content.split('\n');
    const searchStart = afterText ? lines.findIndex((candidate) => candidate.includes(afterText)) + 1 : 0;
    const line = lines.findIndex((candidate, index) => index >= searchStart && candidate.includes(text));
    expect(line, `"${text}" not found in template`).toBeGreaterThanOrEqual(0);
    const character = lines[line].indexOf(text);
    return { start: { line, character }, end: { line, character: character + text.length } };
}

function rangesOverlap(first: Range, second: Range): boolean {
    const startsAfterEnd = (a: Range, b: Range) =>
        a.start.line > b.end.line || (a.start.line === b.end.line && a.start.character >= b.end.character);
    return !startsAfterEnd(first, second) && !startsAfterEnd(second, first);
}

describe('Guard Validator Integration', () => {
    describe('diagnostic ranges', () => {
        const yamlTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Metadata:
  ${METADATA_CONTEXT_KEY}:
    arch: role -> bucket
Resources:
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: DatabaseAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: rds:DescribeDBInstances
                Resource: '*'
  UnversionedBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: unversioned-bucket
`;

        const jsonTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Metadata": {
    "${METADATA_CONTEXT_KEY}": {}
  },
  "Resources": {
    "LambdaRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": { "Service": "lambda.amazonaws.com" },
              "Action": "sts:AssumeRole"
            }
          ]
        },
        "Policies": [
          {
            "PolicyName": "DatabaseAccess",
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [
                { "Effect": "Allow", "Action": "rds:DescribeDBInstances", "Resource": "*" }
              ]
            }
          }
        ]
      }
    },
    "UnversionedBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "unversioned-bucket"
      }
    }
  }
}`;

        async function guardDiagnosticsFor(format: DocumentType, content: string): Promise<Diagnostic[]> {
            const template = new TemplateBuilder(format, content);
            const diagnostics = await template.getDiagnosticsAt({ line: 0, character: 0 });
            return diagnostics.filter((diagnostic) => diagnostic.source === 'cfn-guard');
        }

        /** JSON key nodes include their surrounding quotes; YAML keys do not. */
        function keyText(format: DocumentType, key: string): string {
            return format === DocumentType.JSON ? `"${key}"` : key;
        }

        for (const [format, content] of [
            [DocumentType.YAML, yamlTemplate],
            [DocumentType.JSON, jsonTemplate],
        ] as const) {
            describe(`${format} templates`, () => {
                it('should place the inline policy violation on the Policies key', async () => {
                    const diagnostics = await guardDiagnosticsFor(format, content);

                    const inlinePolicy = diagnostics.find((diagnostic) =>
                        String(diagnostic.code).includes('IAM_NO_INLINE_POLICY_CHECK'),
                    );
                    expect(inlinePolicy).toBeDefined();
                    expect(inlinePolicy!.range).toEqual(rangeOfText(content, keyText(format, 'Policies')));
                });

                it('should place missing-property violations on the Properties key of the resource', async () => {
                    const diagnostics = await guardDiagnosticsFor(format, content);

                    const versioning = diagnostics.find((diagnostic) =>
                        String(diagnostic.code).includes('S3_BUCKET_VERSIONING_ENABLED'),
                    );
                    expect(versioning).toBeDefined();
                    expect(versioning!.range).toEqual(
                        rangeOfText(content, keyText(format, 'Properties'), 'UnversionedBucket'),
                    );
                });

                it('should not report any guard violation on the Metadata Context key or the whole document', async () => {
                    const diagnostics = await guardDiagnosticsFor(format, content);
                    const contextKeyRange = rangeOfText(content, METADATA_CONTEXT_KEY);

                    expect(diagnostics.length).toBeGreaterThan(0);
                    for (const diagnostic of diagnostics) {
                        expect(
                            rangesOverlap(diagnostic.range, contextKeyRange),
                            `${String(diagnostic.code)} overlaps the Metadata Context key`,
                        ).toBe(false);
                        expect(
                            diagnostic.range.start.line,
                            `${String(diagnostic.code)} starts at the document start`,
                        ).toBeGreaterThan(0);
                        expect(diagnostic.range.end.line, `${String(diagnostic.code)} spans multiple lines`).toBe(
                            diagnostic.range.start.line,
                        );
                    }
                });
            });
        }
    });

    describe('YAML', () => {
        it('should detect S3 bucket versioning violations while authoring', async () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'S3 bucket versioning validation',
                steps: [
                    {
                        action: 'type',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  UnversionedBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: unversioned-bucket`,
                        position: { line: 0, character: 0 },
                        description: 'Create S3 bucket without versioning',
                        verification: {
                            position: { line: 3, character: 10 },
                            expectation: DiagnosticExpectationBuilder.create()
                                .expectSource('cfn-guard')
                                .expectMessage(/versioning/i)
                                .expectMinCount(1)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      VersioningConfiguration:
        Status: Enabled
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      LoggingConfiguration:
        DestinationBucketName: !Ref LoggingBucket
  LoggingBucket:
    Type: AWS::S3::Bucket`,
                        position: { line: 5, character: 33 },
                        description: 'Add all required configurations to resolve violations',
                        verification: {
                            position: { line: 3, character: 10 },
                            expectation: DiagnosticExpectationBuilder.create()
                                .expectSource('cfn-guard')
                                .expectExactCount(0)
                                .build(),
                        },
                    },
                ],
            };

            await template.executeScenario(scenario);
        });

        it('should detect S3 public access violations while authoring', async () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'S3 public access validation',
                steps: [
                    {
                        action: 'type',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  PublicBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: public-bucket
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false`,
                        position: { line: 0, character: 0 },
                        description: 'Create S3 bucket with public access enabled',
                        verification: {
                            position: { line: 7, character: 25 },
                            expectation: DiagnosticExpectationBuilder.create()
                                .expectSource('cfn-guard')
                                .expectMessage(/PublicAccessBlockConfiguration/i)
                                .expectSeverity(3) // Information severity
                                .expectMinCount(1)
                                .build(),
                        },
                    },
                ],
            };

            await template.executeScenario(scenario);
        });

        it('should validate IAM policy structure while authoring', async () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'IAM policy validation',
                steps: [
                    {
                        action: 'type',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  OverlyPermissivePolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: AdminPolicy
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Action: '*'
            Resource: '*'
      Roles:
        - !Ref MyRole
  MyRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: 'sts:AssumeRole'`,
                        position: { line: 0, character: 0 },
                        description: 'Create IAM policy with admin access',
                        verification: {
                            position: { line: 10, character: 20 },
                            expectation: DiagnosticExpectationBuilder.create()
                                .expectSource('cfn-guard')
                                .expectMessage(/policy.*statements.*Effect.*Allow.*Action.*Resource/i)
                                .expectMinCount(1)
                                .build(),
                        },
                    },
                ],
            };

            await template.executeScenario(scenario);
        });
    });

    describe('JSON', () => {
        it('should detect S3 public access violations in JSON format', async () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'JSON S3 public access validation',
                steps: [
                    {
                        action: 'type',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "PublicBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "public-bucket",
        "PublicAccessBlockConfiguration": {
          "BlockPublicAcls": false,
          "BlockPublicPolicy": false,
          "IgnorePublicAcls": false,
          "RestrictPublicBuckets": false
        }
      }
    }
  }
}`,
                        position: { line: 0, character: 0 },
                        description: 'Create S3 bucket with public access enabled in JSON',
                        verification: {
                            position: { line: 4, character: 6 },
                            expectation: DiagnosticExpectationBuilder.create()
                                .expectSource('cfn-guard')
                                .expectMessage(/public.*access/i)
                                .expectMinCount(1)
                                .build(),
                        },
                    },
                ],
            };

            await template.executeScenario(scenario);
        });
    });
});
