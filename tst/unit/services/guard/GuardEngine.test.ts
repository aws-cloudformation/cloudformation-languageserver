import { beforeEach, describe, expect, it } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { ALL_RULES } from '../../../../src/services/guard/GeneratedGuardRules';
import { GuardEngine, GuardRule } from '../../../../src/services/guard/GuardEngine';

describe('GuardEngine', () => {
    let guardEngine: GuardEngine;

    beforeEach(() => {
        guardEngine = new GuardEngine();
    });

    describe('validation', () => {
        it('should validate template with rules successfully', () => {
            const template = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-bucket
`;

            const rules: GuardRule[] = [
                {
                    name: 'S3_BUCKET_ENCRYPTION',
                    description: 'S3 buckets should have encryption enabled',
                    severity: DiagnosticSeverity.Error,
                    content: `
let s3_buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]
rule S3_BUCKET_ENCRYPTION when %s3_buckets !empty {
    %s3_buckets.Properties.BucketEncryption exists
}
`,
                    tags: ['security', 's3'],
                    pack: 'aws-guard-rules-registry',
                    message:
                        'Violation: S3 bucket must have encryption enabled\nFix: Add BucketEncryption property to the S3 bucket\n',
                },
            ];

            const violations = guardEngine.validateTemplate(template, rules, DiagnosticSeverity.Error);

            expect(Array.isArray(violations)).toBe(true);
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].ruleName).toBe('S3_BUCKET_ENCRYPTION');
            expect(violations[0].message).toContain('BucketEncryption');
        });

        it('should return empty array when no rules provided', () => {
            const template = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`;

            const violations = guardEngine.validateTemplate(template, [], DiagnosticSeverity.Error);

            expect(violations).toEqual([]);
        });

        it('should handle invalid template gracefully', () => {
            const invalidTemplate = 'invalid yaml content {{{';
            const rules: GuardRule[] = [
                {
                    name: 'TEST_RULE',
                    description: 'Test rule',
                    severity: DiagnosticSeverity.Error,
                    content: 'rule TEST_RULE { true }',
                    tags: ['test'],
                    pack: 'test-pack',
                },
            ];

            // SingleLineSummary format is more forgiving - it returns empty array instead of throwing
            const violations = guardEngine.validateTemplate(invalidTemplate, rules, DiagnosticSeverity.Error);
            expect(Array.isArray(violations)).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should handle validation errors gracefully', () => {
            // Test with malformed rules or content that might cause validation errors
            const result = guardEngine.validateTemplate('invalid content', [], DiagnosticSeverity.Information);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('validation output', () => {
        it('should return validation results', () => {
            const template = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-bucket
`;

            const rules: GuardRule[] = [
                {
                    name: 'S3_BUCKET_ENCRYPTION',
                    description: 'S3 buckets should have encryption enabled',
                    severity: DiagnosticSeverity.Error,
                    content: `
let s3_buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]
rule S3_BUCKET_ENCRYPTION when %s3_buckets !empty {
    %s3_buckets.Properties.BucketEncryption exists
    <<
        Violation: S3 bucket must have encryption enabled
        Fix: Add BucketEncryption property to the S3 bucket
    >>
}
`,
                    tags: ['security', 's3'],
                    pack: 'aws-guard-rules-registry',
                },
            ];

            const result = guardEngine.validateTemplate(template, rules, DiagnosticSeverity.Error);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].ruleName).toBe('S3_BUCKET_ENCRYPTION');
        });

        it('should handle empty rules array', () => {
            const template = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`;

            const result = guardEngine.validateTemplate(template, [], DiagnosticSeverity.Error);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual([]);
        });

        it('should handle invalid template gracefully', () => {
            const invalidTemplate = 'invalid yaml content {{{';
            const rules: GuardRule[] = [
                {
                    name: 'TEST_RULE',
                    description: 'Test rule',
                    severity: DiagnosticSeverity.Error,
                    content: 'rule TEST_RULE { true }',
                    tags: ['test'],
                    pack: 'test-pack',
                },
            ];

            const result = guardEngine.validateTemplate(invalidTemplate, rules, DiagnosticSeverity.Error);

            expect(Array.isArray(result)).toBe(true);
        });

        it('should validate template correctly', () => {
            const template = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-bucket
`;

            const rules: GuardRule[] = [
                {
                    name: 'S3_BUCKET_ENCRYPTION',
                    content: `
let s3_buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]
rule S3_BUCKET_ENCRYPTION when %s3_buckets !empty {
    %s3_buckets.Properties.BucketEncryption exists
}`,
                    description: 'S3 buckets must have encryption enabled',
                    severity: DiagnosticSeverity.Error,
                    tags: ['s3', 'encryption'],
                    pack: 'test',
                    message:
                        'Violation: S3 bucket must have encryption enabled\nFix: Add BucketEncryption property to the S3 bucket\n',
                },
            ];

            // Test the full validation flow
            const violations = guardEngine.validateTemplate(template, rules, DiagnosticSeverity.Error);

            expect(violations).toHaveLength(1);
            expect(violations[0].ruleName).toBe('S3_BUCKET_ENCRYPTION');
            expect(violations[0].message).toContain('BucketEncryption');
        });

        it('should extract messages from Guard rule content', () => {
            // Test that messages are pre-extracted in the generated rules
            // Check that a rule with a message has it extracted
            const ruleWithMessage = ALL_RULES['API_GW_CACHE_ENABLED_AND_ENCRYPTED'];
            expect(ruleWithMessage).toBeDefined();
            expect(ruleWithMessage.message).toBeDefined();
            expect(ruleWithMessage.message).toContain('CacheDataEncrypted');

            // The content should no longer contain << >> blocks
            expect(ruleWithMessage.content).not.toContain('<<');
            expect(ruleWithMessage.content).not.toContain('>>');
        });
    });
});
