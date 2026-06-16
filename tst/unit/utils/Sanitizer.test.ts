import { homedir, hostname } from 'os';
import { describe, expect, test } from 'vitest';
import { sanitizeMessage, sensitiveInfo } from '../../../src/utils/Sanitizer';

describe('Sanitizer', () => {
    describe('sensitiveInfo', () => {
        test('includes the machine hostname', () => {
            expect(sensitiveInfo()).toContain(hostname());
        });

        test('includes the user home directory', () => {
            expect(sensitiveInfo()).toContain(homedir());
        });

        test('returns the same cached array on subsequent calls', () => {
            const first = sensitiveInfo();
            const second = sensitiveInfo();
            expect(second).toBe(first);
        });

        test('does not contain single-character path segments', () => {
            for (const word of sensitiveInfo()) {
                expect(word.length).toBeGreaterThan(1);
            }
        });

        test('returns a non-empty array of strings', () => {
            const words = sensitiveInfo();
            expect(words.length).toBeGreaterThan(0);
            for (const word of words) {
                expect(typeof word).toBe('string');
            }
        });
    });

    describe('sanitizeMessage - basic input handling', () => {
        test('returns empty string unchanged', () => {
            expect(sanitizeMessage('')).toBe('');
        });

        test('trims leading and trailing whitespace', () => {
            expect(sanitizeMessage('   hello world   ')).toBe('hello world');
        });

        test('trims each line of a multi-line message', () => {
            const input = '   line one   \n   line two   \n   line three   ';
            expect(sanitizeMessage(input)).toBe('line one\nline two\nline three');
        });

        test('preserves multi-line structure', () => {
            const input = 'first\nsecond\nthird';
            expect(sanitizeMessage(input)).toBe('first\nsecond\nthird');
        });

        test('passes through text with no sensitive content', () => {
            expect(sanitizeMessage('a benign log line')).toBe('a benign log line');
        });
    });

    describe('sanitizeMessage - path normalization', () => {
        test('converts double-escaped backslashes to forward slashes', () => {
            expect(sanitizeMessage(String.raw`C:\\Users\\test\\file.ts`)).toBe('C:/Users/test/file.ts');
        });

        test('converts single backslashes to forward slashes', () => {
            const input = 'C:\\Users\\test\\file.ts';
            expect(sanitizeMessage(input)).toBe('C:/Users/test/file.ts');
        });

        test('handles mixed forward and backslashes', () => {
            const input = 'C:\\path/to\\file.ts';
            expect(sanitizeMessage(input)).toBe('C:/path/to/file.ts');
        });
    });

    describe('sanitizeMessage - sensitive identity redaction', () => {
        test('redacts the machine hostname', () => {
            const input = `error reported on ${hostname()} during startup`;
            const result = sanitizeMessage(input);
            expect(result).not.toContain(hostname());
            expect(result).toContain('[*]');
        });

        test('redacts the user home directory', () => {
            const input = `failed to read ${homedir()}/config.json`;
            const result = sanitizeMessage(input);
            expect(result).not.toContain(homedir());
            expect(result).toContain('[*]');
        });

        test('does not redact the allowlisted "aws" segment', () => {
            // 'aws' would otherwise be redacted as a __dirname segment, since the install path contains it.
            expect(sanitizeMessage('connecting to aws region us-east-1')).toBe('connecting to aws region us-east-1');
        });

        test('does not redact the allowlisted "cloudformation-languageserver" segment', () => {
            const input = 'failed in cloudformation-languageserver during init';
            expect(sanitizeMessage(input)).toBe(input);
        });
    });

    describe('sanitizeMessage - ARN and account-id redaction', () => {
        test('redacts an IAM user ARN with account id', () => {
            expect(sanitizeMessage('User arn:aws:iam::123456789012:user/test-user is not authorized')).toBe(
                'User arn:aws:<REDACTED> is not authorized',
            );
        });

        test('redacts an STS assumed-role ARN', () => {
            expect(sanitizeMessage('arn:aws:sts::123456789012:assumed-role/MyRole/session-name')).toBe(
                'arn:aws:<REDACTED>',
            );
        });

        test('redacts a regional EC2 ARN', () => {
            expect(sanitizeMessage('arn:aws:ec2:us-east-1:123456789012:instance/i-0abcdef1234567890')).toBe(
                'arn:aws:<REDACTED>',
            );
        });

        test('redacts an aws-cn partition ARN', () => {
            expect(sanitizeMessage('arn:aws-cn:lambda:cn-north-1:123456789012:function:my-func')).toBe(
                'arn:aws:<REDACTED>',
            );
        });

        test('redacts an aws-us-gov partition ARN', () => {
            expect(sanitizeMessage('arn:aws-us-gov:rds:us-gov-west-1:123456789012:db:my-db')).toBe(
                'arn:aws:<REDACTED>',
            );
        });

        test('redacts an aws-iso partition ARN', () => {
            expect(sanitizeMessage('arn:aws-iso:ec2:us-iso-east-1:123456789012:instance/i-abc')).toBe(
                'arn:aws:<REDACTED>',
            );
        });

        test('does not redact an S3 ARN with no account id', () => {
            expect(sanitizeMessage('arn:aws:s3:::my-bucket')).toBe('arn:aws:s3:::my-bucket');
        });

        test('redacts multiple ARNs in the same line', () => {
            expect(
                sanitizeMessage(
                    'arn:aws:iam::111111111111:user/user-a cannot access arn:aws:iam::222222222222:role/role-b',
                ),
            ).toBe('arn:aws:<REDACTED> cannot access arn:aws:<REDACTED>');
        });

        test('redacts a standalone 12-digit account id', () => {
            expect(sanitizeMessage('Account 123456789012 not found')).toBe('Account <ACCOUNT_ID> not found');
        });

        test('does not redact 11-digit numbers', () => {
            expect(sanitizeMessage('Account 12345678901 not found')).toBe('Account 12345678901 not found');
        });

        test('does not redact 13-digit numbers', () => {
            expect(sanitizeMessage('Account 1234567890123 not found')).toBe('Account 1234567890123 not found');
        });

        test('redacts only the 12-digit segment, not adjacent digits', () => {
            // 13 digits (\d{12}\b) — boundary check ensures we don't redact the inner 12 digits.
            expect(sanitizeMessage('id 1234567890123 ok')).toBe('id 1234567890123 ok');
        });

        test('redacts an account id followed by punctuation', () => {
            expect(sanitizeMessage('account=123456789012, region=us-east-1')).toBe(
                'account=<ACCOUNT_ID>, region=us-east-1',
            );
        });

        test('redacts both an account-id-bearing ARN and a separate plain account id', () => {
            const input = 'role arn:aws:iam::111111111111:role/admin in account 222222222222';
            expect(sanitizeMessage(input)).toBe('role arn:aws:<REDACTED> in account <ACCOUNT_ID>');
        });
    });
});
