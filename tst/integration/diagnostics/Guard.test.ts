import { describe, it } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { DocumentType } from '../../../src/document/Document';
import { DiagnosticExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Guard Validator Integration', () => {
    describe('YAML', () => {
        it('should detect S3 bucket encryption violations while authoring', async () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'S3 bucket encryption validation',
                steps: [
                    {
                        action: 'type',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  UnencryptedBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: unencrypted-bucket`,
                        position: { line: 0, character: 0 },
                        description: 'Create unencrypted S3 bucket',
                        verification: {
                            position: { line: 3, character: 10 },
                            expectation: DiagnosticExpectationBuilder.create()
                                .expectSource('cfn-guard')
                                .expectMessage(/encryption/i)
                                .expectMinCount(1)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256`,
                        position: { line: 5, character: 33 },
                        description: 'Add encryption to resolve violation',
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
                                .expectMessage(/public.*access/i)
                                .expectSeverity(DiagnosticSeverity.Warning)
                                .expectMinCount(1)
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true`,
                        range: {
                            start: { line: 7, character: 8 },
                            end: { line: 10, character: 32 },
                        },
                        description: 'Fix public access violations',
                        verification: {
                            position: { line: 7, character: 25 },
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

        it('should validate IAM policy structure while authoring', async () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'IAM policy validation',
                steps: [
                    {
                        action: 'type',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  OverlyPermissiveRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal: '*'
            Action: 'sts:AssumeRole'`,
                        position: { line: 0, character: 0 },
                        description: 'Create IAM role with wildcard principal',
                        verification: {
                            position: { line: 9, character: 23 },
                            expectation: DiagnosticExpectationBuilder.create()
                                .expectSource('cfn-guard')
                                .expectMessage(/principal/i)
                                .expectSeverity(DiagnosticSeverity.Error)
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
        it('should detect S3 encryption violations in JSON format', async () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'JSON S3 encryption validation',
                steps: [
                    {
                        action: 'type',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "UnencryptedBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "unencrypted-bucket"
      }
    }
  }
}`,
                        position: { line: 0, character: 0 },
                        description: 'Create unencrypted S3 bucket in JSON',
                        verification: {
                            position: { line: 4, character: 6 },
                            expectation: DiagnosticExpectationBuilder.create()
                                .expectSource('cfn-guard')
                                .expectMessage(/encryption/i)
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
