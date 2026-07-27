import { readFileSync } from 'fs';
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

    describe('validateRule syntactic pre-check', () => {
        it('rejects a rule with an unclosed brace', () => {
            const result = guardEngine.validateRule('rule R when Resources !empty {\n  Resources.Foo exists');
            expect(result.valid).toBe(false);
            expect(result.parseErrors[0]).toMatch(/Unclosed/i);
        });

        it('rejects an empty rule', () => {
            const result = guardEngine.validateRule('   \n  ');
            expect(result.valid).toBe(false);
            expect(result.parseErrors[0]).toMatch(/empty/i);
        });

        it('rejects a comments-only rule (e.g. the untouched starter)', () => {
            const result = guardEngine.validateRule('# just a comment\n# another line');
            expect(result.valid).toBe(false);
            expect(result.parseErrors[0]).toMatch(/empty/i);
        });

        it('rejects mismatched brackets', () => {
            const result = guardEngine.validateRule('rule R { Resources.Foo exists )');
            expect(result.valid).toBe(false);
            expect(result.parseErrors[0]).toMatch(/Mismatched/i);
        });

        it('accepts a well-formed rule', () => {
            const result = guardEngine.validateRule('rule R when Resources !empty {\n  Resources.Foo exists\n}');
            expect(result.valid).toBe(true);
            expect(result.parseErrors).toHaveLength(0);
        });

        it('accepts a rule whose custom message contains brackets', () => {
            const result = guardEngine.validateRule(
                'rule R when Resources !empty {\n  Resources.Foo exists\n  << use s3:PutObject) here >>\n}',
            );
            expect(result.valid).toBe(true);
            expect(result.parseErrors).toHaveLength(0);
        });

        it.each([
            ['inclusive', 'r[0, 65535]'],
            ['half-open upper', 'r[0, 65535)'],
            ['half-open lower', 'r(0, 65535]'],
            ['exclusive', 'r(0, 65535)'],
        ])('accepts a %s range literal', (_name, range) => {
            const result = guardEngine.validateRule(
                `rule R when Resources !empty {\n  Resources.Foo.Properties.Port IN ${range}\n}`,
            );
            expect(result.parseErrors).toHaveLength(0);
        });

        it('still reports a genuine mismatch on a line containing a range literal', () => {
            const result = guardEngine.validateRule(
                'rule R when Resources !empty {\n  Resources.Foo.Properties.Port IN r[0, 65535)]\n}',
            );
            expect(result.parseErrors[0]).toContain("Mismatched ']'");
        });

        it('does not treat an indexed query ending in r as a range literal', () => {
            const result = guardEngine.validateRule(
                "rule R when Resources !empty {\n  let filter = Resources.*[ Type == 'AWS::S3::Bucket' ]\n  %filter !empty\n}",
            );
            expect(result.parseErrors).toHaveLength(0);
        });

        it('accepts a rule whose custom message contains an apostrophe', () => {
            const result = guardEngine.validateRule(
                "rule R when Resources !empty {\n  Resources.Foo exists\n  << bucket can't be public >>\n}",
            );
            expect(result.valid).toBe(true);
            expect(result.parseErrors).toHaveLength(0);
        });

        it('does not let an unterminated quote swallow following lines', () => {
            const result = guardEngine.validateRule("rule R when Resources !empty {\n  Resources.Name == 'a\n}");
            expect(result.valid).toBe(true);
        });

        it('ignores brackets inside strings', () => {
            const result = guardEngine.validateRule("rule R when Resources !empty {\n  Resources.Name == 'a}b{c'\n}");
            expect(result.valid).toBe(true);
        });

        it('does not treat # inside a string as a comment', () => {
            const result = guardEngine.validateRule(
                'rule R when Resources !empty {\n  Resources.Tag == "color#red"\n}',
            );
            expect(result.valid).toBe(true);
        });

        it('handles escaped quotes inside a string', () => {
            const result = guardEngine.validateRule('rule R when Resources !empty {\n  Resources.Name == "a\\"b"\n}');
            expect(result.valid).toBe(true);
        });

        it('ignores brackets inside a regex literal', () => {
            const result = guardEngine.validateRule(
                'rule R when Resources !empty {\n  Resources.Arn == /arn:aws[a-z0-9]*/\n}',
            );
            expect(result.valid).toBe(true);
        });

        it('ignores a slash inside a regex character class', () => {
            const result = guardEngine.validateRule(
                'rule R when Resources !empty {\n  Resources.X != /[A-Za-z0-9\\\\/+=]{4}/\n}',
            );
            expect(result.valid).toBe(true);
            expect(result.parseErrors).toHaveLength(0);
        });

        it('accepts the vendored negative-lookbehind regex fixture', () => {
            const fixture = readFileSync(
                'vendor/cfn-guard/__tests__/__fixtures__/rules-dir/nested-dir/advanced_regex_negative_lookbehind_rule.guard',
                'utf8',
            );

            const result = guardEngine.validateRule(fixture);

            expect(result.valid).toBe(true);
            expect(result.parseErrors).toHaveLength(0);
        });

        it('resets an unterminated regex literal at a newline', () => {
            const result = guardEngine.validateRule('rule R when Resources !empty {\n  Resources.Arn == /arn:aws\n}');
            expect(result.valid).toBe(true);
            expect(result.parseErrors).toHaveLength(0);
        });

        it('reports the unclosed brace when a regex runs to the end of input', () => {
            const result = guardEngine.validateRule('rule R when Resources !empty {\n  Resources.Arn == /arn:aws');
            expect(result.valid).toBe(false);
            expect(result.parseErrors[0]).toMatch(/Unclosed/i);
        });

        it('jumps to end of input for an unterminated << >> block but still reports an earlier unclosed brace', () => {
            const result = guardEngine.validateRule(
                'rule R when Resources !empty {\n  Resources.Foo exists\n  << unterminated message',
            );
            expect(result.valid).toBe(false);
            expect(result.parseErrors[0]).toMatch(/Unclosed/i);
        });

        it('does not let a trailing backslash in a string swallow the terminating newline', () => {
            const result = guardEngine.validateRule("rule R when Resources !empty {\n  Resources.Name == 'a\\\n}");
            expect(result.valid).toBe(true);
        });
    });

    describe('validateRule evaluation', () => {
        const encryptionRule = [
            "let buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]",
            'rule S3_ENCRYPTED when %buckets !empty {',
            '  %buckets.Properties.BucketEncryption exists',
            '}',
        ].join('\n');

        it('returns violations when the rule fails against supplied sample data', () => {
            const sample = [
                'Resources:',
                '  B:',
                '    Type: AWS::S3::Bucket',
                '    Properties:',
                '      BucketName: b',
            ].join('\n');

            const result = guardEngine.validateRule(encryptionRule, sample);

            expect(result.valid).toBe(true);
            expect(result.parseErrors).toHaveLength(0);
            expect(result.violations.length).toBeGreaterThan(0);
        });

        it('returns no violations when the rule passes against supplied sample data', () => {
            const sample = [
                'Resources:',
                '  B:',
                '    Type: AWS::S3::Bucket',
                '    Properties:',
                '      BucketEncryption:',
                '        ServerSideEncryptionConfiguration: []',
            ].join('\n');

            const result = guardEngine.validateRule(encryptionRule, sample);

            expect(result.valid).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it('falls back to an empty resource set when no sample data is given', () => {
            const result = guardEngine.validateRule(encryptionRule);

            expect(result.valid).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it('treats blank sample data as absent', () => {
            const result = guardEngine.validateRule(encryptionRule, ' '.repeat(3));

            expect(result.valid).toBe(true);
            expect(result.violations).toHaveLength(0);
        });
    });
});
