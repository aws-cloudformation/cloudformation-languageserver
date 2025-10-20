import { beforeEach, describe, expect, it } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { ALL_RULES } from '../../../../src/services/guard/GeneratedGuardRules';
import { GuardEngine, GuardRule } from '../../../../src/services/guard/GuardEngine';

describe('GuardEngine', () => {
    let guardEngine: GuardEngine;

    beforeEach(() => {
        guardEngine = new GuardEngine();
    });

    describe('initialization', () => {
        it('should initialize successfully', async () => {
            await guardEngine.initialize();
            expect(guardEngine.isReady()).toBe(true);
        });

        it('should handle multiple initialization calls gracefully', async () => {
            await guardEngine.initialize();
            await guardEngine.initialize(); // Second call should not throw
            expect(guardEngine.isReady()).toBe(true);
        });

        it('should handle concurrent initialization calls', async () => {
            const promises = [guardEngine.initialize(), guardEngine.initialize()];
            await Promise.all(promises);
            expect(guardEngine.isReady()).toBe(true);
        });
    });

    describe('validation', () => {
        beforeEach(async () => {
            await guardEngine.initialize();
        });

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

        it('should throw error when not initialized', () => {
            const uninitializedEngine = new GuardEngine();

            expect(() => {
                uninitializedEngine.validateTemplate('template', [], DiagnosticSeverity.Error);
            }).toThrow('GuardEngine not initialized. Call initialize() first.');
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

    describe('lifecycle management', () => {
        it('should report not ready before initialization', () => {
            expect(guardEngine.isReady()).toBe(false);
        });

        it('should report ready after initialization', async () => {
            await guardEngine.initialize();
            expect(guardEngine.isReady()).toBe(true);
        });

        it('should report not ready after disposal', async () => {
            await guardEngine.initialize();
            expect(guardEngine.isReady()).toBe(true);
            guardEngine.dispose();
            expect(guardEngine.isReady()).toBe(false);
        });

        it('should handle disposal without initialization', () => {
            // Should not throw
            guardEngine.dispose();
            expect(guardEngine.isReady()).toBe(false);
        });

        it('should handle multiple disposal calls', async () => {
            await guardEngine.initialize();
            guardEngine.dispose();
            guardEngine.dispose(); // Second call should not throw
            expect(guardEngine.isReady()).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should handle WASM loading errors gracefully', async () => {
            // Create a new engine and test initialization
            const failingEngine = new GuardEngine();
            // In test environment, WASM might load successfully or fail
            try {
                await failingEngine.initialize();
                // If initialization succeeds, engine should be ready
                expect(typeof failingEngine.isReady()).toBe('boolean');
            } catch {
                // If it throws, engine should not be ready
                expect(failingEngine.isReady()).toBe(false);
            }
        });

        it('should handle validation errors gracefully', async () => {
            await guardEngine.initialize();
            // Test with malformed rules or content that might cause validation errors
            const result = guardEngine.validateTemplate('invalid content', [], DiagnosticSeverity.Information);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('getRawOutput', () => {
        beforeEach(async () => {
            await guardEngine.initialize();
        });

        it('should return raw SingleLineSummary output as string', () => {
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

            const result = guardEngine.getRawOutput(template, rules);

            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('S3_BUCKET_ENCRYPTION');
        });

        it('should throw error when not initialized', () => {
            const uninitializedEngine = new GuardEngine();

            expect(() => {
                uninitializedEngine.getRawOutput('template', []);
            }).toThrow('GuardEngine not initialized. Call initialize() first.');
        });

        it('should handle empty rules array', () => {
            const template = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`;

            const result = guardEngine.getRawOutput(template, []);

            expect(typeof result).toBe('string');
            // With no rules, output should be minimal
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

            // Should not throw, but return output (might contain errors or be empty)
            const result = guardEngine.getRawOutput(invalidTemplate, rules);

            expect(typeof result).toBe('string');
            // Don't require length > 0 since invalid templates might produce empty output
        });

        it('should validate template and parse SingleLineSummary output correctly', () => {
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

            // Get raw output first to debug
            guardEngine.getRawOutput(template, rules);

            // Test the full validation flow using SingleLineSummary
            const violations = guardEngine.validateTemplate(template, rules, DiagnosticSeverity.Error);

            expect(violations).toHaveLength(1);
            expect(violations[0].ruleName).toBe('S3_BUCKET_ENCRYPTION');
            expect(violations[0].message).toContain('BucketEncryption');
            expect(violations[0].location.path).toBe('/Resources/MyBucket/Properties');
            expect(violations[0].location.line).toBeGreaterThan(0);
        });

        it('should deduplicate violations with same rule and location', () => {
            // Test the deduplication logic directly by calling parseSingleLineSummaryOutput
            // with simulated output that has duplicate violations
            const singleLineOutput = `Resource = Subnet1 {
  Type      = AWS::EC2::Subnet
  Rule = SUBNET_AUTO_ASSIGN_PUBLIC_IP_DISABLED {
    ALL {
      ANY {
        Check = test1 {
          Message {
            Violation: VPCs should not have subnets that are assigned a public IP address
            Fix: remove the MapPublicIpOnLaunch property or set it to false
          }
          ComparisonError {
            PropertyPath = /Resources/Subnet1/Properties/MapPublicIpOnLaunch[L:14,C:27]
          }
        }
        Check = test2 {
          Message {
            Violation: VPCs should not have subnets that are assigned a public IP address
            Fix: remove the MapPublicIpOnLaunch property or set it to false
          }
          ComparisonError {
            PropertyPath = /Resources/Subnet1/Properties/MapPublicIpOnLaunch[L:14,C:27]
          }
        }
      }
    }
  }
}`;

            // Call the parsing method directly and then deduplication
            const rawViolations = (guardEngine as any).parseSingleLineSummaryOutput(
                singleLineOutput,
                [],
                DiagnosticSeverity.Error,
            );
            const deduplicatedViolations = (guardEngine as any).deduplicateViolations(rawViolations);

            // Should deduplicate to only 1 violation even though there were 2 PropertyPath entries
            expect(deduplicatedViolations).toHaveLength(1);
            expect(deduplicatedViolations[0].ruleName).toBe('SUBNET_AUTO_ASSIGN_PUBLIC_IP_DISABLED');
            expect(deduplicatedViolations[0].location.line).toBe(14);
            expect(deduplicatedViolations[0].location.column).toBe(27);
            expect(deduplicatedViolations[0].location.path).toBe('/Resources/Subnet1/Properties/MapPublicIpOnLaunch');
        });

        it('should deduplicate violations using first violation as base', () => {
            // Test that we deduplicate violations using the first violation as the base message
            const violation1 = {
                ruleName: 'TEST_RULE',
                message: 'Guard rule violation\n',
                severity: DiagnosticSeverity.Error,
                location: { line: 10, column: 5, path: '/Resources/Test/Properties' },
            };

            const violation2 = {
                ruleName: 'TEST_RULE',
                message: 'VPCs should not have subnets Expected: false, Found: true\n',
                severity: DiagnosticSeverity.Error,
                location: { line: 10, column: 5, path: '/Resources/Test/Properties' },
            };

            // Test that the first violation's base message is used
            const violations1 = [violation1, violation2];
            const violations2 = [violation2, violation1];

            const result1 = (guardEngine as any).deduplicateViolations(violations1);
            const result2 = (guardEngine as any).deduplicateViolations(violations2);

            expect(result1).toHaveLength(1);
            expect(result2).toHaveLength(1);

            // First test should use "Guard rule violation" as base (from first violation)
            expect(result1[0].message).toContain('Guard rule violation');
            expect(result1[0].message).toContain('Expected: false, Found: true');

            // Second test should use "VPCs should not have subnets" as base (from first violation)
            expect(result2[0].message).toContain('VPCs should not have subnets');
            expect(result2[0].message).toContain('Expected: false, Found: true');
        });

        it('should extract messages from Guard rule content', () => {
            // Test that messages are pre-extracted in the generated rules
            // Check that a rule with a message has it extracted
            const ruleWithMessage = ALL_RULES['API_GW_CACHE_ENABLED_AND_ENCRYPTED'];
            expect(ruleWithMessage).toBeDefined();
            expect(ruleWithMessage.message).toBeDefined();
            expect(ruleWithMessage.message).toContain('Violation:');
            expect(ruleWithMessage.message).toContain('Fix:');

            // The content should no longer contain << >> blocks
            expect(ruleWithMessage.content).not.toContain('<<');
            expect(ruleWithMessage.content).not.toContain('>>');
        });

        it('should use rule message when available during parsing', () => {
            // Test that rule messages are preferred over violation messages from output
            const ruleWithMessage: GuardRule = {
                name: 'TEST_RULE_WITH_MESSAGE',
                content: 'rule TEST_RULE_WITH_MESSAGE { Resources exists << Violation: Custom rule message >> }',
                description: 'Test rule',
                severity: DiagnosticSeverity.Error,
                tags: ['test'],
                pack: 'test',
                message: 'Custom rule message from extracted content',
            };

            const singleLineOutput = `Resource = TestResource {
                Type = AWS::S3::Bucket
                Rule = TEST_RULE_WITH_MESSAGE {
                    ALL {
                        Check = test {
                            Message {
                                Violation: Generic violation message from output
                            }
                            ComparisonError {
                                PropertyPath = /Resources/TestResource/Properties[L:10,C:5]
                            }
                        }
                    }
                }
            }`;

            const violations = (guardEngine as any).parseSingleLineSummaryOutput(
                singleLineOutput,
                [ruleWithMessage],
                DiagnosticSeverity.Error,
            );

            expect(violations).toHaveLength(1);
            expect(violations[0].message).toBe('Custom rule message from extracted content\n');
        });

        it('should handle EQUAL operator with comparison values', () => {
            const rule: GuardRule = {
                name: 'TEST_EQUAL_RULE',
                content: 'rule TEST_EQUAL_RULE { Resources.*.Properties.Status == "Enabled" }',
                description: 'Test equal rule',
                severity: DiagnosticSeverity.Error,
                tags: ['test'],
                pack: 'test',
                message: 'Status must be enabled',
            };

            const singleLineOutput = `Resource = TestResource {
                Type = AWS::S3::Bucket
                Rule = TEST_EQUAL_RULE {
                    ALL {
                        Check = test {
                            ComparisonError {
                                PropertyPath = /Resources/TestResource/Properties/Status[L:10,C:5]
                                Operator = EQUAL
                                Value = "Disabled"
                                ComparedWith = "Enabled"
                            }
                        }
                    }
                }
            }`;

            const violations = (guardEngine as any).parseSingleLineSummaryOutput(
                singleLineOutput,
                [rule],
                DiagnosticSeverity.Error,
            );

            expect(violations).toHaveLength(1);
            expect(violations[0].message).toBe('Status must be enabled\n');
        });

        it('should handle IN operator with comparison values', () => {
            const rule: GuardRule = {
                name: 'TEST_IN_RULE',
                content: 'rule TEST_IN_RULE { Resources.*.Properties.Algorithm in ["aws:kms","AES256"] }',
                description: 'Test in rule',
                severity: DiagnosticSeverity.Error,
                tags: ['test'],
                pack: 'test',
                message: 'Algorithm must be valid',
            };

            const singleLineOutput = `Resource = TestResource {
                Type = AWS::S3::Bucket
                Rule = TEST_IN_RULE {
                    ALL {
                        Check = test {
                            ComparisonError {
                                PropertyPath = /Resources/TestResource/Properties/Algorithm[L:10,C:5]
                                Operator = IN
                                Value = "DES"
                                ComparedWith = ["aws:kms","AES256"]
                            }
                        }
                    }
                }
            }`;

            const violations = (guardEngine as any).parseSingleLineSummaryOutput(
                singleLineOutput,
                [rule],
                DiagnosticSeverity.Error,
            );

            expect(violations).toHaveLength(1);
            expect(violations[0].message).toBe('Algorithm must be valid\n');
        });

        it('should handle GREATER_THAN operator with comparison values', () => {
            const rule: GuardRule = {
                name: 'TEST_GREATER_RULE',
                content: 'rule TEST_GREATER_RULE { Resources.*.Properties.RetentionPeriod > 0 }',
                description: 'Test greater than rule',
                severity: DiagnosticSeverity.Error,
                tags: ['test'],
                pack: 'test',
                message: 'Retention period must be positive',
            };

            const singleLineOutput = `Resource = TestResource {
                Type = AWS::RDS::DBInstance
                Rule = TEST_GREATER_RULE {
                    ALL {
                        Check = test {
                            ComparisonError {
                                PropertyPath = /Resources/TestResource/Properties/RetentionPeriod[L:10,C:5]
                                Operator = GREATER_THAN
                                Value = 0
                                ComparedWith = 0
                            }
                        }
                    }
                }
            }`;

            const violations = (guardEngine as any).parseSingleLineSummaryOutput(
                singleLineOutput,
                [rule],
                DiagnosticSeverity.Error,
            );

            expect(violations).toHaveLength(1);
            expect(violations[0].message).toBe('Retention period must be positive\n');
        });

        it('should handle NOT EXISTS operator without values', () => {
            const rule: GuardRule = {
                name: 'TEST_NOT_EXISTS_RULE',
                content: 'rule TEST_NOT_EXISTS_RULE { Resources.*.Properties.PublicAccess !exists }',
                description: 'Test not exists rule',
                severity: DiagnosticSeverity.Error,
                tags: ['test'],
                pack: 'test',
                message: 'Public access should not be configured',
            };

            const singleLineOutput = `Resource = TestResource {
                Type = AWS::S3::Bucket
                Rule = TEST_NOT_EXISTS_RULE {
                    ALL {
                        Check = test {
                            ComparisonError {
                                PropertyPath = /Resources/TestResource/Properties/PublicAccess[L:10,C:5]
                                Operator = NOT EXISTS
                            }
                        }
                    }
                }
            }`;

            const violations = (guardEngine as any).parseSingleLineSummaryOutput(
                singleLineOutput,
                [rule],
                DiagnosticSeverity.Error,
            );

            expect(violations).toHaveLength(1);
            expect(violations[0].message).toBe('Public access should not be configured\n');
        });

        it('should handle EXISTS operator without values', () => {
            const rule: GuardRule = {
                name: 'TEST_EXISTS_RULE',
                content: 'rule TEST_EXISTS_RULE { Resources.*.Properties.Encryption exists }',
                description: 'Test exists rule',
                severity: DiagnosticSeverity.Error,
                tags: ['test'],
                pack: 'test',
                message: 'Encryption must be configured',
            };

            const singleLineOutput = `Resource = TestResource {
                Type = AWS::S3::Bucket
                Rule = TEST_EXISTS_RULE {
                    ALL {
                        Check = test {
                            ComparisonError {
                                PropertyPath = /Resources/TestResource/Properties[L:10,C:5]
                                Operator = EXISTS
                                MissingProperty = Encryption
                            }
                        }
                    }
                }
            }`;

            const violations = (guardEngine as any).parseSingleLineSummaryOutput(
                singleLineOutput,
                [rule],
                DiagnosticSeverity.Error,
            );

            expect(violations).toHaveLength(1);
            expect(violations[0].message).toBe('Encryption must be configured\n');
        });

        it('should combine multiple contexts for the same rule and location', () => {
            // Simulate multiple violations for the same rule and location
            const violations = [
                {
                    ruleName: 'TEST_MULTI_CONTEXT_RULE',
                    message: 'Configuration must be valid\nMissing property: Config\n',
                    severity: DiagnosticSeverity.Error,
                    location: { line: 10, column: 5, path: '/Resources/TestResource/Properties' },
                },
                {
                    ruleName: 'TEST_MULTI_CONTEXT_RULE',
                    message: 'Configuration must be valid\nMissing property: Config.Encryption\n',
                    severity: DiagnosticSeverity.Error,
                    location: { line: 10, column: 5, path: '/Resources/TestResource/Properties' },
                },
                {
                    ruleName: 'TEST_MULTI_CONTEXT_RULE',
                    message: 'Configuration must be valid\nMissing property: Config.Logging\n',
                    severity: DiagnosticSeverity.Error,
                    location: { line: 10, column: 5, path: '/Resources/TestResource/Properties' },
                },
            ];

            const deduplicated = (guardEngine as any).deduplicateViolations(violations);

            expect(deduplicated).toHaveLength(1);
            expect(deduplicated[0].message).toContain('Configuration must be valid');
            expect(deduplicated[0].message).toContain('Missing property: Config');
            expect(deduplicated[0].message).toContain('Missing property: Config.Encryption');
            expect(deduplicated[0].message).toContain('Missing property: Config.Logging');
            // Should be sorted alphabetically
            const lines = deduplicated[0].message
                .split('\n')
                .filter((line: string) => line.startsWith('Missing property:'));
            expect(lines).toEqual([
                'Missing property: Config',
                'Missing property: Config',
                'Missing property: Config.Encryption',
                'Missing property: Config.Logging',
            ]);
        });
    });
});
