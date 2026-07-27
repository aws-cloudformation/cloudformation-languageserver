import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import {
    getHookConfigurationHandler,
    getRuleContentHandler,
    uploadRuleHandler,
    validateRuleHandler,
    configureHookHandler,
    setInvocationStatusHandler,
    createGuardHookHandler,
} from '../../../src/handlers/HooksHandler';
import type { HooksManager } from '../../../src/hooks/HooksManager';
import type { CfnService } from '../../../src/services/CfnService';
import type { S3Service } from '../../../src/services/S3Service';
import type {
    GetHookConfigurationResult,
    GetRuleContentResult,
    UploadRuleResult,
    ValidateRuleResult,
    ConfigureHookResult,
    SetInvocationStatusResult,
} from '../../../src/hooks/HooksRequestType';

describe('HooksHandler rule/config endpoints', () => {
    let mockCfnService: {
        getHookConfiguration: ReturnType<typeof vi.fn>;
        setHookConfiguration: ReturnType<typeof vi.fn>;
    };
    let mockS3Service: {
        getObjectContent: ReturnType<typeof vi.fn>;
        putObjectContent: ReturnType<typeof vi.fn>;
    };
    let mockHooksManager: { clearCache: ReturnType<typeof vi.fn> };
    let mockCcapiService: { createResource: ReturnType<typeof vi.fn> };
    let components: any;

    beforeEach(() => {
        mockCfnService = {
            getHookConfiguration: vi.fn(),
            setHookConfiguration: vi.fn(),
        };
        mockS3Service = {
            getObjectContent: vi.fn(),
            putObjectContent: vi.fn(),
        };
        mockCcapiService = { createResource: vi.fn() };
        mockHooksManager = { clearCache: vi.fn() };
        components = {
            hooksManager: mockHooksManager as unknown as HooksManager,
            cfnService: mockCfnService as unknown as CfnService,
            s3Service: mockS3Service as unknown as S3Service,
            ccapiService: mockCcapiService as unknown as any,
        };
    });

    describe('getHookConfigurationHandler', () => {
        it('returns the raw configuration from CfnService', async () => {
            mockCfnService.getHookConfiguration.mockResolvedValue('{"CloudFormationConfiguration":{}}');
            const handler = getHookConfigurationHandler(components);
            const result = (await handler(
                { typeName: 'Private::Guard::S3Check' },
                CancellationToken.None,
            )) as GetHookConfigurationResult;

            expect(result.configuration).toBe('{"CloudFormationConfiguration":{}}');
            expect(mockCfnService.getHookConfiguration).toHaveBeenCalledWith('Private::Guard::S3Check');
        });
    });

    describe('getRuleContentHandler', () => {
        it('parses the s3 uri into bucket/key and returns object content', async () => {
            mockS3Service.getObjectContent.mockResolvedValue('rule content');
            const handler = getRuleContentHandler(components);
            const result = (await handler(
                { s3Uri: 's3://my-bucket/rules/s3.guard' },
                CancellationToken.None,
            )) as GetRuleContentResult;

            expect(result.content).toBe('rule content');
            expect(mockS3Service.getObjectContent).toHaveBeenCalledWith('my-bucket', 'rules/s3.guard');
        });
    });

    describe('uploadRuleHandler', () => {
        it('parses the s3 uri and uploads the rule content', async () => {
            mockS3Service.putObjectContent.mockResolvedValue({});
            const handler = uploadRuleHandler(components);
            const result = (await handler(
                { ruleContent: 'let x = 1', s3Uri: 's3://my-bucket/rules/new.guard' },
                CancellationToken.None,
            )) as UploadRuleResult;

            expect(result.s3Uri).toBe('s3://my-bucket/rules/new.guard');
            expect(mockS3Service.putObjectContent).toHaveBeenCalledWith('let x = 1', 'my-bucket', 'rules/new.guard');
        });
    });

    describe('validateRuleHandler', () => {
        it('reports a syntactically valid rule as valid', async () => {
            const handler = validateRuleHandler();
            const rule = [
                "let s3_buckets = Resources.*[Type == 'AWS::S3::Bucket']",
                'rule S3_ENCRYPTION when %s3_buckets !empty {',
                '    %s3_buckets.Properties.BucketEncryption exists',
                '}',
            ].join('\n');
            const result = (await handler({ ruleContent: rule }, CancellationToken.None)) as ValidateRuleResult;

            expect(result.valid).toBe(true);
            expect(result.parseErrors).toHaveLength(0);
        });

        it('evaluates the rule against a sample template and returns violations', async () => {
            const handler = validateRuleHandler();
            const rule = [
                "let s3_buckets = Resources.*[Type == 'AWS::S3::Bucket']",
                'rule S3_ENCRYPTION when %s3_buckets !empty {',
                '    %s3_buckets.Properties.BucketEncryption exists',
                '}',
            ].join('\n');
            const sampleTemplate = JSON.stringify({
                Resources: { NonCompliantBucket: { Type: 'AWS::S3::Bucket', Properties: {} } },
            });
            const result = (await handler(
                { ruleContent: rule, sampleTemplate },
                CancellationToken.None,
            )) as ValidateRuleResult;

            expect(result.valid).toBe(true);
            expect(result.violations.length).toBeGreaterThan(0);
        });
    });

    describe('configureHookHandler self-heal', () => {
        it('seeds required keys when the current configuration is empty', async () => {
            mockCfnService.getHookConfiguration.mockResolvedValue('{}');
            mockCfnService.setHookConfiguration.mockResolvedValue({ ConfigurationArn: 'arn:aws:...' });

            const handler = configureHookHandler(components);
            (await handler(
                { typeName: 'Private::Guard::S3Check', failureMode: 'FAIL' },
                CancellationToken.None,
            )) as ConfigureHookResult;

            const sent = JSON.parse(mockCfnService.setHookConfiguration.mock.calls[0][0].configuration);
            const hookConfig = sent.CloudFormationConfiguration.HookConfiguration;
            expect(hookConfig.HookInvocationStatus).toBe('ENABLED');
            expect(hookConfig.TargetOperations).toEqual(['RESOURCE']);
            expect(hookConfig.FailureMode).toBe('FAIL');
        });
    });

    describe('setInvocationStatusHandler', () => {
        it('flips HookInvocationStatus while preserving other config', async () => {
            mockCfnService.getHookConfiguration.mockResolvedValue(
                JSON.stringify({
                    CloudFormationConfiguration: {
                        HookConfiguration: {
                            HookInvocationStatus: 'ENABLED',
                            FailureMode: 'WARN',
                            TargetOperations: ['RESOURCE'],
                            Properties: { ruleLocation: { uri: 's3://b/r.guard' } },
                        },
                    },
                }),
            );
            mockCfnService.setHookConfiguration.mockResolvedValue({ ConfigurationArn: 'arn:aws:...' });

            const handler = setInvocationStatusHandler(components);
            const result = (await handler(
                { typeName: 'Private::Guard::S3Check', invocationStatus: 'DISABLED' },
                CancellationToken.None,
            )) as SetInvocationStatusResult;

            expect(result.invocationStatus).toBe('DISABLED');
            const sent = JSON.parse(mockCfnService.setHookConfiguration.mock.calls[0][0].configuration);
            const hookConfig = sent.CloudFormationConfiguration.HookConfiguration;
            expect(hookConfig.HookInvocationStatus).toBe('DISABLED');
            expect(hookConfig.FailureMode).toBe('WARN');
            expect(hookConfig.TargetOperations).toEqual(['RESOURCE']);
            expect(hookConfig.Properties.ruleLocation.uri).toBe('s3://b/r.guard');
        });

        it('self-heals required keys when enabling an unconfigured hook', async () => {
            mockCfnService.getHookConfiguration.mockResolvedValue('{}');
            mockCfnService.setHookConfiguration.mockResolvedValue({ ConfigurationArn: 'arn:aws:...' });

            const handler = setInvocationStatusHandler(components);
            (await handler(
                { typeName: 'Private::Guard::S3Check', invocationStatus: 'ENABLED' },
                CancellationToken.None,
            )) as SetInvocationStatusResult;

            const sent = JSON.parse(mockCfnService.setHookConfiguration.mock.calls[0][0].configuration);
            const hookConfig = sent.CloudFormationConfiguration.HookConfiguration;
            expect(hookConfig.HookInvocationStatus).toBe('ENABLED');
            expect(hookConfig.TargetOperations).toEqual(['RESOURCE']);
            expect(hookConfig.FailureMode).toBe('FAIL');
        });
    });

    describe('createGuardHookHandler', () => {
        it('submits the DesiredState to Cloud Control and returns the operation status', async () => {
            mockCcapiService.createResource.mockResolvedValue({
                OperationStatus: 'SUCCESS',
                Identifier: 'Private::Guard::Foo',
            });
            const desiredState = JSON.stringify({
                Alias: 'Private::Guard::Foo',
                ExecutionRole: 'arn:aws:iam::123456789012:role/r',
                FailureMode: 'FAIL',
                HookStatus: 'ENABLED',
                RuleLocation: { Uri: 's3://b/r.guard' },
                TargetOperations: ['RESOURCE'],
            });

            const handler = createGuardHookHandler(components);
            const result = (await handler({ desiredState }, CancellationToken.None)) as {
                operationStatus?: string;
                identifier?: string;
            };

            expect(result.operationStatus).toBe('SUCCESS');
            expect(result.identifier).toBe('Private::Guard::Foo');
            expect(mockCcapiService.createResource).toHaveBeenCalledWith(
                'AWS::CloudFormation::GuardHook',
                desiredState,
            );
            expect(mockHooksManager.clearCache).toHaveBeenCalled();
        });
    });
});
