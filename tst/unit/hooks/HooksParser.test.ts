import { describe, it, expect } from 'vitest';
import {
    parseListHooksParams,
    parseDescribeHookParams,
    parseListHookResultsParams,
    parseGetHookResultParams,
    parseConfigureHookParams,
    parseDeactivateHookParams,
    parseActivateHookParams,
    parseSetHookConfigurationParams,
    parseSetInvocationStatusParams,
    parseCreateGuardHookParams,
    parseCreateHookExecutionRoleParams,
    parseCreateS3BucketParams,
    parseGetHookConfigurationParams,
    parseGetRuleContentParams,
    parseValidateRuleParams,
    parseUploadRuleParams,
    parsePreviewGuardHooksParams,
} from '../../../src/hooks/HooksParser';

describe('HooksParser', () => {
    describe('parseListHooksParams', () => {
        it('should accept empty params', () => {
            expect(parseListHooksParams({})).toEqual({});
        });

        it('should accept loadMore as true', () => {
            expect(parseListHooksParams({ loadMore: true })).toEqual({ loadMore: true });
        });

        it('should accept loadMore as false', () => {
            expect(parseListHooksParams({ loadMore: false })).toEqual({ loadMore: false });
        });

        it('should reject unknown properties', () => {
            expect(() => parseListHooksParams({ loadMore: true, unknown: 'value' })).toThrow();
        });
    });

    describe('parseDescribeHookParams', () => {
        it('should accept typeName only', () => {
            const result = parseDescribeHookParams({ typeName: 'Private::Guard::S3Check' });
            expect(result).toEqual({ typeName: 'Private::Guard::S3Check' });
        });

        it('should accept arn only', () => {
            const result = parseDescribeHookParams({
                arn: 'arn:aws:cloudformation:us-east-1:123456789:type/hook/Private-Guard-S3Check',
            });
            expect(result).toEqual({
                arn: 'arn:aws:cloudformation:us-east-1:123456789:type/hook/Private-Guard-S3Check',
            });
        });

        it('should accept both typeName and arn', () => {
            const result = parseDescribeHookParams({ typeName: 'Private::Guard::S3Check', arn: 'arn:aws:...' });
            expect(result).toEqual({ typeName: 'Private::Guard::S3Check', arn: 'arn:aws:...' });
        });

        it('should reject when neither typeName nor arn is provided', () => {
            expect(() => parseDescribeHookParams({})).toThrow();
        });

        it('should reject empty typeName with no arn', () => {
            expect(() => parseDescribeHookParams({ typeName: '' })).toThrow();
        });

        it('should reject whitespace-only typeName with no arn', () => {
            expect(() => parseDescribeHookParams({ typeName: ' '.repeat(3) })).toThrow();
        });
    });

    describe('parseListHookResultsParams', () => {
        it('should accept empty params (list all results)', () => {
            expect(parseListHookResultsParams({})).toEqual({});
        });

        it('should accept typeArn filter', () => {
            const result = parseListHookResultsParams({ typeArn: 'arn:aws:...' });
            expect(result).toEqual({ typeArn: 'arn:aws:...' });
        });

        it('should accept valid targetType CHANGE_SET', () => {
            const result = parseListHookResultsParams({ targetType: 'CHANGE_SET' });
            expect(result).toEqual({ targetType: 'CHANGE_SET' });
        });

        it('should accept valid targetType STACK', () => {
            const result = parseListHookResultsParams({ targetType: 'STACK' });
            expect(result).toEqual({ targetType: 'STACK' });
        });

        it('should accept valid targetType RESOURCE', () => {
            const result = parseListHookResultsParams({ targetType: 'RESOURCE' });
            expect(result).toEqual({ targetType: 'RESOURCE' });
        });

        it('should accept valid targetType CLOUD_CONTROL', () => {
            const result = parseListHookResultsParams({ targetType: 'CLOUD_CONTROL' });
            expect(result).toEqual({ targetType: 'CLOUD_CONTROL' });
        });

        it('should reject invalid targetType', () => {
            expect(() => parseListHookResultsParams({ targetType: 'INVALID' })).toThrow();
        });

        it('should accept nextToken for pagination', () => {
            const result = parseListHookResultsParams({ nextToken: 'abc123' });
            expect(result).toEqual({ nextToken: 'abc123' });
        });

        it('should accept combined filters', () => {
            const result = parseListHookResultsParams({
                typeArn: 'arn:aws:...',
                status: 'HOOK_COMPLETE_FAILED',
                targetType: 'STACK',
            });
            expect(result).toEqual({
                typeArn: 'arn:aws:...',
                status: 'HOOK_COMPLETE_FAILED',
                targetType: 'STACK',
            });
        });
    });

    describe('parseGetHookResultParams', () => {
        it('should accept valid hookResultId', () => {
            const result = parseGetHookResultParams({ hookResultId: 'result-123-abc' });
            expect(result).toEqual({ hookResultId: 'result-123-abc' });
        });

        it('should reject missing hookResultId', () => {
            expect(() => parseGetHookResultParams({})).toThrow();
        });

        it('should reject empty hookResultId', () => {
            expect(() => parseGetHookResultParams({ hookResultId: '' })).toThrow();
        });

        it('should reject whitespace-only hookResultId', () => {
            expect(() => parseGetHookResultParams({ hookResultId: ' '.repeat(3) })).toThrow();
        });
    });

    describe('parseConfigureHookParams', () => {
        it('should accept valid typeName and failureMode', () => {
            const result = parseConfigureHookParams({
                typeName: 'Private::Guard::S3Check',
                failureMode: 'FAIL',
            });
            expect(result).toEqual({
                typeName: 'Private::Guard::S3Check',
                failureMode: 'FAIL',
            });
        });

        it('should accept WARN failureMode', () => {
            const result = parseConfigureHookParams({
                typeName: 'Private::Guard::S3Check',
                failureMode: 'WARN',
            });
            expect(result.failureMode).toBe('WARN');
        });

        it('should reject missing typeName', () => {
            expect(() => parseConfigureHookParams({ failureMode: 'FAIL' })).toThrow();
        });

        it('should reject empty typeName', () => {
            expect(() => parseConfigureHookParams({ typeName: '', failureMode: 'FAIL' })).toThrow();
        });

        it('should reject missing failureMode', () => {
            expect(() => parseConfigureHookParams({ typeName: 'Private::Guard::S3Check' })).toThrow();
        });

        it('should reject invalid failureMode', () => {
            expect(() =>
                parseConfigureHookParams({ typeName: 'Private::Guard::S3Check', failureMode: 'INVALID' }),
            ).toThrow();
        });
    });

    describe('parseDeactivateHookParams', () => {
        it('should accept typeName', () => {
            const result = parseDeactivateHookParams({ typeName: 'Private::Guard::S3Check' });
            expect(result).toEqual({ typeName: 'Private::Guard::S3Check' });
        });

        it('should accept arn', () => {
            const result = parseDeactivateHookParams({ arn: 'arn:aws:...' });
            expect(result).toEqual({ arn: 'arn:aws:...' });
        });

        it('should reject when neither typeName nor arn is provided', () => {
            expect(() => parseDeactivateHookParams({})).toThrow();
        });

        it('should reject empty typeName with no arn', () => {
            expect(() => parseDeactivateHookParams({ typeName: '' })).toThrow();
        });
    });

    describe('parseActivateHookParams', () => {
        it('should accept typeName only', () => {
            const result = parseActivateHookParams({ typeName: 'AWS::Hooks::GuardHook' });
            expect(result).toEqual({ typeName: 'AWS::Hooks::GuardHook' });
        });

        it('should accept all optional fields', () => {
            const result = parseActivateHookParams({
                typeName: 'AWS::Hooks::GuardHook',
                publisherId: 'pub-123',
                typeNameAlias: 'Private::Guard::MyHook',
                executionRoleArn: 'arn:aws:iam::123:role/HookRole',
            });
            expect(result.publisherId).toBe('pub-123');
            expect(result.typeNameAlias).toBe('Private::Guard::MyHook');
            expect(result.executionRoleArn).toBe('arn:aws:iam::123:role/HookRole');
        });

        it('should reject missing typeName', () => {
            expect(() => parseActivateHookParams({})).toThrow();
        });

        it('should reject empty typeName', () => {
            expect(() => parseActivateHookParams({ typeName: '' })).toThrow();
        });
    });

    describe('parseSetHookConfigurationParams', () => {
        it('should accept typeName and configuration', () => {
            const result = parseSetHookConfigurationParams({
                typeName: 'Private::Guard::S3Check',
                configuration: '{"CloudFormationConfiguration":{}}',
            });
            expect(result).toEqual({
                typeName: 'Private::Guard::S3Check',
                configuration: '{"CloudFormationConfiguration":{}}',
            });
        });

        it('should reject missing typeName', () => {
            expect(() => parseSetHookConfigurationParams({ configuration: '{}' })).toThrow();
        });

        it('should reject empty typeName', () => {
            expect(() => parseSetHookConfigurationParams({ typeName: '', configuration: '{}' })).toThrow();
        });

        it('should reject missing configuration', () => {
            expect(() => parseSetHookConfigurationParams({ typeName: 'Hook' })).toThrow();
        });

        it('should reject empty configuration', () => {
            expect(() => parseSetHookConfigurationParams({ typeName: 'Hook', configuration: '' })).toThrow();
        });
    });
});

describe('HooksParser - additional parsers', () => {
    describe('parseSetInvocationStatusParams', () => {
        it('accepts ENABLED/DISABLED', () => {
            expect(parseSetInvocationStatusParams({ typeName: 'H', invocationStatus: 'ENABLED' })).toEqual({
                typeName: 'H',
                invocationStatus: 'ENABLED',
            });
        });
        it('rejects an invalid status', () => {
            expect(() => parseSetInvocationStatusParams({ typeName: 'H', invocationStatus: 'ON' })).toThrow();
        });
        it('rejects a missing typeName', () => {
            expect(() => parseSetInvocationStatusParams({ invocationStatus: 'ENABLED' })).toThrow();
        });
    });

    describe('parseCreateGuardHookParams', () => {
        const validState = JSON.stringify({
            Alias: 'Private::Guard::Demo',
            ExecutionRole: 'arn:aws:iam::123:role/r',
            FailureMode: 'FAIL',
            HookStatus: 'ENABLED',
            RuleLocation: 's3://b/r.guard',
            TargetOperations: ['STACK'],
        });
        it('accepts a well-formed desiredState', () => {
            expect(parseCreateGuardHookParams({ desiredState: validState })).toEqual({ desiredState: validState });
        });
        it('rejects non-JSON desiredState', () => {
            expect(() => parseCreateGuardHookParams({ desiredState: 'not json' })).toThrow();
        });
        it('rejects a JSON array', () => {
            expect(() => parseCreateGuardHookParams({ desiredState: '[]' })).toThrow();
        });
        it('rejects when a required key is missing', () => {
            const missing = JSON.stringify({ Alias: 'A', ExecutionRole: 'r', FailureMode: 'FAIL' });
            expect(() => parseCreateGuardHookParams({ desiredState: missing })).toThrow();
        });
    });

    describe('parseCreateHookExecutionRoleParams', () => {
        it('accepts a valid role name with an optional bucket', () => {
            expect(parseCreateHookExecutionRoleParams({ roleName: 'my-role_1', ruleBucket: 'b' })).toEqual({
                roleName: 'my-role_1',
                ruleBucket: 'b',
            });
        });
        it('rejects a role name with illegal characters', () => {
            expect(() => parseCreateHookExecutionRoleParams({ roleName: 'bad/name' })).toThrow();
        });
    });

    describe('parseCreateS3BucketParams', () => {
        it('accepts a valid bucket name', () => {
            expect(parseCreateS3BucketParams({ bucketName: 'my-rule-bucket' })).toEqual({
                bucketName: 'my-rule-bucket',
            });
        });
        it('rejects uppercase/underscore names', () => {
            expect(() => parseCreateS3BucketParams({ bucketName: 'My_Bucket' })).toThrow();
        });
        it('rejects consecutive dots', () => {
            expect(() => parseCreateS3BucketParams({ bucketName: 'a..b' })).toThrow();
        });
        it('rejects IP-formatted names', () => {
            expect(() => parseCreateS3BucketParams({ bucketName: '192.168.1.1' })).toThrow();
        });
    });

    describe('parseGetHookConfigurationParams', () => {
        it('accepts a typeName', () => {
            expect(parseGetHookConfigurationParams({ typeName: 'H' })).toEqual({ typeName: 'H' });
        });
        it('rejects empty input', () => {
            expect(() => parseGetHookConfigurationParams({})).toThrow();
        });
    });

    describe('parseGetRuleContentParams', () => {
        it('accepts an s3Uri', () => {
            expect(parseGetRuleContentParams({ s3Uri: 's3://b/r.guard' })).toEqual({ s3Uri: 's3://b/r.guard' });
        });
        it('rejects an empty s3Uri', () => {
            expect(() => parseGetRuleContentParams({ s3Uri: '' })).toThrow();
        });
    });

    describe('parseValidateRuleParams', () => {
        it('accepts ruleContent with an optional sampleTemplate', () => {
            expect(parseValidateRuleParams({ ruleContent: 'rule R {}', sampleTemplate: '{}' })).toEqual({
                ruleContent: 'rule R {}',
                sampleTemplate: '{}',
            });
        });
        it('rejects missing ruleContent', () => {
            expect(() => parseValidateRuleParams({ sampleTemplate: '{}' })).toThrow();
        });
    });

    describe('parseUploadRuleParams', () => {
        it('accepts ruleContent + s3Uri', () => {
            expect(parseUploadRuleParams({ ruleContent: 'x', s3Uri: 's3://b/r' })).toEqual({
                ruleContent: 'x',
                s3Uri: 's3://b/r',
            });
        });
        it('rejects a missing s3Uri', () => {
            expect(() => parseUploadRuleParams({ ruleContent: 'x' })).toThrow();
        });
    });

    describe('parsePreviewGuardHooksParams', () => {
        it('accepts templateContent', () => {
            expect(parsePreviewGuardHooksParams({ templateContent: '{}' })).toEqual({ templateContent: '{}' });
        });
        it('rejects empty templateContent', () => {
            expect(() => parsePreviewGuardHooksParams({ templateContent: '' })).toThrow();
        });
    });
});
