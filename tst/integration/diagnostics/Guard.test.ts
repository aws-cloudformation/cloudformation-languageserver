import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { DiagnosticExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Guard Validator Integration', () => {
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
