import { beforeEach, describe, expect, it } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { ALL_RULES } from '../../../../src/services/guard/GeneratedGuardRules';
import { GuardEngine, GuardRule, GuardViolation } from '../../../../src/services/guard/GuardEngine';

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

    describe('violation location', () => {
        const subnetRule: GuardRule = {
            name: 'SUBNET_AUTO_ASSIGN_PUBLIC_IP_DISABLED',
            description: 'Subnets must not auto-assign public IPs',
            severity: DiagnosticSeverity.Error,
            content: `rule SUBNET_AUTO_ASSIGN_PUBLIC_IP_DISABLED when Resources.*[ Type == 'AWS::EC2::Subnet' ] !empty {
  Resources.*[ Type == 'AWS::EC2::Subnet' ].Properties.MapPublicIpOnLaunch != true
}`,
            tags: ['ec2'],
            pack: 'test',
            message: 'remove the MapPublicIpOnLaunch property or set it to false',
        };

        const inlinePolicyRule: GuardRule = {
            name: 'IAM_NO_INLINE_POLICY_CHECK',
            description: 'IAM roles must not have inline policies',
            severity: DiagnosticSeverity.Error,
            content: `rule IAM_NO_INLINE_POLICY_CHECK when Resources.*[ Type == 'AWS::IAM::Role' ] !empty {
  Resources.*[ Type == 'AWS::IAM::Role' ].Properties.Policies not exists
}`,
            tags: ['iam'],
            pack: 'test',
            message: 'Remove the Policies list property from any IAM Users, Roles, or Groups.',
        };

        const minorVersionUpgradeRule: GuardRule = {
            name: 'RDS_AUTOMATIC_MINOR_VERSION_UPGRADE_ENABLED',
            description: 'RDS instances must enable automatic minor version upgrades',
            severity: DiagnosticSeverity.Error,
            content: `rule RDS_AUTOMATIC_MINOR_VERSION_UPGRADE_ENABLED when Resources.*[ Type == 'AWS::RDS::DBInstance' ] !empty {
  Resources.*[ Type == 'AWS::RDS::DBInstance' ].Properties.AutoMinorVersionUpgrade EXISTS
  Resources.*[ Type == 'AWS::RDS::DBInstance' ].Properties.AutoMinorVersionUpgrade == true
}`,
            tags: ['rds'],
            pack: 'test',
            message: 'Set the AutoMinorVersionUpgrade parameter to true.',
        };

        const yamlTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Metadata:
  com.aws.cloudformation.Context:
    arch: subnet -> role -> database
Resources:
  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: vpc-123
      MapPublicIpOnLaunch: true
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument: {}
      Policies:
        - PolicyName: DatabaseAccess
          PolicyDocument: {}
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      Engine: mysql
`;

        const jsonTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Metadata": {
    "com.aws.cloudformation.Context": {}
  },
  "Resources": {
    "PublicSubnet": {
      "Type": "AWS::EC2::Subnet",
      "Properties": {
        "VpcId": "vpc-123",
        "MapPublicIpOnLaunch": true
      }
    },
    "LambdaRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {},
        "Policies": [
          { "PolicyName": "DatabaseAccess", "PolicyDocument": {} }
        ]
      }
    },
    "Database": {
      "Type": "AWS::RDS::DBInstance",
      "Properties": {
        "Engine": "mysql"
      }
    }
  }
}`;

        function violationFor(ruleName: string, template: string) {
            const violations = guardEngine.validateTemplate(
                template,
                [subnetRule, inlinePolicyRule, minorVersionUpgradeRule],
                DiagnosticSeverity.Error,
            );
            const violation = violations.find((candidate) => candidate.ruleName === ruleName);
            expect(violation, `expected a violation for ${ruleName}`).toBeDefined();
            return violation!;
        }

        it('should locate a failed comparison at the offending property in YAML', () => {
            const violation = violationFor(subnetRule.name, yamlTemplate);

            expect(violation.location).toEqual({
                path: '/Resources/PublicSubnet/Properties/MapPublicIpOnLaunch',
                line: 9,
                column: 27,
            });
        });

        it('should locate a failed comparison at the offending property in JSON', () => {
            const violation = violationFor(subnetRule.name, jsonTemplate);

            expect(violation.location).toEqual({
                path: '/Resources/PublicSubnet/Properties/MapPublicIpOnLaunch',
                line: 10,
                column: 31,
            });
        });

        it('should locate a failed "not exists" check at the value of the property that exists', () => {
            expect(violationFor(inlinePolicyRule.name, yamlTemplate).location).toEqual({
                path: '/Resources/LambdaRole/Properties/Policies',
                line: 15,
                column: 8,
            });
            expect(violationFor(inlinePolicyRule.name, jsonTemplate).location).toEqual({
                path: '/Resources/LambdaRole/Properties/Policies',
                line: 17,
                column: 20,
            });
        });

        it('should locate a missing property at the parent that was traversed', () => {
            expect(violationFor(minorVersionUpgradeRule.name, yamlTemplate).location).toEqual({
                path: '/Resources/Database/Properties',
                line: 20,
                column: 6,
            });
            expect(violationFor(minorVersionUpgradeRule.name, jsonTemplate).location).toEqual({
                path: '/Resources/Database/Properties',
                line: 24,
                column: 20,
            });
        });

        it('should never place a violation at the start of the document when cfn-guard reports a path', () => {
            for (const template of [yamlTemplate, jsonTemplate]) {
                const violations = guardEngine.validateTemplate(
                    template,
                    [subnetRule, inlinePolicyRule, minorVersionUpgradeRule],
                    DiagnosticSeverity.Error,
                );

                expect(violations).toHaveLength(3);
                expect(
                    violations.map((violation) => ({
                        rule: violation.ruleName,
                        startsInResources: violation.location.path?.startsWith('/Resources/') ?? false,
                        isBelowFirstLine: violation.location.line > 0,
                    })),
                ).toEqual(
                    [subnetRule, inlinePolicyRule, minorVersionUpgradeRule].map((rule) => ({
                        rule: rule.name,
                        startsInResources: true,
                        isBelowFirstLine: true,
                    })),
                );
            }
        });

        it('should keep violations on different properties separate even when their messages match', () => {
            const duplicateMessageRule: GuardRule = {
                ...inlinePolicyRule,
                message: subnetRule.message,
            };

            const violations = guardEngine.validateTemplate(
                yamlTemplate,
                [subnetRule, duplicateMessageRule],
                DiagnosticSeverity.Error,
            );

            expect(violations.map((violation) => violation.location.path).toSorted()).toEqual([
                '/Resources/LambdaRole/Properties/Policies',
                '/Resources/PublicSubnet/Properties/MapPublicIpOnLaunch',
            ]);
        });

        describe('SARIF results without an embedded path', () => {
            function convert(region: { startLine: number; startColumn: number } | undefined) {
                const sarif = {
                    runs: [
                        {
                            results: [
                                {
                                    ruleId: 'CUSTOM_RULE',
                                    message: { text: 'Check was not compliant.' },
                                    locations: region ? [{ physicalLocation: { region } }] : [],
                                },
                            ],
                        },
                    ],
                };
                return (guardEngine as any).convertSarifToViolations(
                    JSON.stringify(sarif),
                    [],
                    DiagnosticSeverity.Error,
                ) as GuardViolation[];
            }

            it('should treat the 1:1 placeholder region as an unknown location', () => {
                expect(convert({ startLine: 1, startColumn: 1 })[0].location).toEqual({ line: 0, column: 0 });
            });

            it('should treat a missing region as an unknown location', () => {
                expect(convert(undefined)[0].location).toEqual({ line: 0, column: 0 });
            });

            it('should use a populated region as 0-based coordinates', () => {
                expect(convert({ startLine: 17, startColumn: 6 })[0].location).toEqual({ line: 17, column: 6 });
            });
        });
    });
});
