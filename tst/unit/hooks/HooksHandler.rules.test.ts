import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellationToken, ErrorCodes, ResponseError } from 'vscode-languageserver';
import {
    getHookConfigurationHandler,
    getRuleContentHandler,
    uploadRuleHandler,
    validateRuleHandler,
    configureHookHandler,
    setInvocationStatusHandler,
    setHookConfigurationHandler,
    createGuardHookHandler,
    createS3BucketHandler,
    createHookExecutionRoleHandler,
} from '../../../src/handlers/HooksHandler';
import { HooksManager } from '../../../src/hooks/HooksManager';
import { GuardEngine } from '../../../src/services/guard/GuardEngine';
import type { CfnService } from '../../../src/services/CfnService';
import type { S3Service } from '../../../src/services/S3Service';
import type {
    GetHookConfigurationResult,
    GetRuleContentResult,
    UploadRuleResult,
    ValidateRuleResult,
    ConfigureHookResult,
    SetInvocationStatusResult,
    SetHookConfigurationResult,
    CreateS3BucketResult,
    CreateHookExecutionRoleResult,
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
    let mockHooksManager: {
        clearCache: ReturnType<typeof vi.fn>;
        invalidateRuleContent: ReturnType<typeof vi.fn>;
        runExclusiveForType: <T>(typeName: string, task: () => Promise<T>) => Promise<T>;
    };
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
        mockHooksManager = {
            clearCache: vi.fn(),
            invalidateRuleContent: vi.fn(),
            runExclusiveForType: (_typeName, task) => task(),
        };
        components = {
            hooksManager: mockHooksManager as unknown as HooksManager,
            cfnService: mockCfnService as unknown as CfnService,
            s3Service: mockS3Service as unknown as S3Service,
            ccapiService: mockCcapiService as unknown as any,
            guardEngine: new GuardEngine(),
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

        it('decodes a percent-encoded key so the real S3 object is fetched', async () => {
            mockS3Service.getObjectContent.mockResolvedValue('rule content');
            const handler = getRuleContentHandler(components);
            await handler({ s3Uri: 's3://my-bucket/rules/my rule.guard' }, CancellationToken.None);

            expect(mockS3Service.getObjectContent).toHaveBeenCalledWith('my-bucket', 'rules/my rule.guard');
        });

        it('rejects a non-s3 scheme as InvalidParams', async () => {
            const handler = getRuleContentHandler(components);
            try {
                await handler({ s3Uri: 'https://my-bucket/rules/r.guard' }, CancellationToken.None);
                expect.unreachable('handler should have rejected a non-s3 uri');
            } catch (error) {
                expect(error).toBeInstanceOf(ResponseError);
                expect((error as ResponseError<void>).code).toBe(ErrorCodes.InvalidParams);
            }
            expect(mockS3Service.getObjectContent).not.toHaveBeenCalled();
        });

        it.each([
            ['an s3 uri with no bucket', 's3:///rules/r.guard'],
            ['an s3 uri with a malformed percent-escape in the key', 's3://my-bucket/50%discount'],
        ])('rejects %s as InvalidParams', async (_name, s3Uri) => {
            const handler = getRuleContentHandler(components);
            try {
                await handler({ s3Uri }, CancellationToken.None);
                expect.unreachable('handler should have rejected the uri');
            } catch (error) {
                expect(error).toBeInstanceOf(ResponseError);
                expect((error as ResponseError<void>).code).toBe(ErrorCodes.InvalidParams);
            }
            expect(mockS3Service.getObjectContent).not.toHaveBeenCalled();
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
            expect(mockHooksManager.invalidateRuleContent).toHaveBeenCalledWith('s3://my-bucket/rules/new.guard');
        });

        it('invalidates the cached rule so a preview within the ttl re-loads the new content', async () => {
            const s3Uri = 's3://my-bucket/rules/new.guard';
            const manager = new HooksManager({} as unknown as CfnService);
            const loader = vi.fn().mockResolvedValueOnce('old rule').mockResolvedValueOnce('new rule');

            expect(await manager.getCachedRuleContent(s3Uri, loader)).toBe('old rule');
            expect(await manager.getCachedRuleContent(s3Uri, loader)).toBe('old rule');

            const uploadComponents = {
                hooksManager: manager,
                s3Service: { putObjectContent: vi.fn().mockResolvedValue({}) } as unknown as S3Service,
            };
            const handler = uploadRuleHandler(uploadComponents as any);
            await handler({ ruleContent: 'let x = 2', s3Uri }, CancellationToken.None);

            expect(await manager.getCachedRuleContent(s3Uri, loader)).toBe('new rule');
            expect(loader).toHaveBeenCalledTimes(2);
        });

        it('surfaces an upload failure via handleLspError', async () => {
            mockS3Service.putObjectContent.mockRejectedValue(new Error('access denied'));
            const handler = uploadRuleHandler(components);

            await expect(
                handler({ ruleContent: 'let x = 1', s3Uri: 's3://my-bucket/rules/new.guard' }, CancellationToken.None),
            ).rejects.toThrow();
            expect(mockHooksManager.invalidateRuleContent).not.toHaveBeenCalled();
        });
    });

    describe('validateRuleHandler', () => {
        it('reports a syntactically valid rule as valid', async () => {
            const handler = validateRuleHandler(components);
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
            const handler = validateRuleHandler(components);
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

    describe('updateHookConfiguration serialization', () => {
        function deferred(): { promise: Promise<void>; resolve: () => void } {
            let release!: () => void;
            const promise = new Promise<void>((resolve) => {
                release = resolve;
            });
            return { promise, resolve: release };
        }

        it('serializes concurrent updates for the same type name without losing a field', async () => {
            let stored = JSON.stringify({
                CloudFormationConfiguration: { HookConfiguration: { TargetOperations: ['RESOURCE'] } },
            });
            let entered = 0;
            const waitingReads: Array<() => void> = [];
            const releaseReads = () => {
                while (waitingReads.length > 0) {
                    const release = waitingReads.shift();
                    if (release) {
                        release();
                    }
                }
            };
            const getHookConfiguration = vi.fn<(typeName: string) => Promise<string>>().mockImplementation(async () => {
                entered += 1;
                await new Promise<void>((resolve) => {
                    waitingReads.push(resolve);
                    if (entered >= 2) {
                        releaseReads();
                    } else {
                        setTimeout(releaseReads, 50);
                    }
                });
                return stored;
            });
            const setHookConfiguration = vi
                .fn<(params: { typeName: string; configuration: string }) => Promise<{ ConfigurationArn: string }>>()
                .mockImplementation((params) => {
                    stored = params.configuration;
                    return Promise.resolve({ ConfigurationArn: 'arn:aws:...' });
                });
            const cfnService = { getHookConfiguration, setHookConfiguration } as unknown as CfnService;
            const localComponents = {
                hooksManager: new HooksManager(cfnService),
                cfnService,
            } as any;

            const configure = configureHookHandler(localComponents)(
                { typeName: 'Private::Guard::S3Check', failureMode: 'WARN' },
                CancellationToken.None,
            );
            const setStatus = setInvocationStatusHandler(localComponents)(
                { typeName: 'Private::Guard::S3Check', invocationStatus: 'DISABLED' },
                CancellationToken.None,
            );
            await Promise.all([configure, setStatus]);

            expect(setHookConfiguration).toHaveBeenCalledTimes(2);
            const secondPayload = JSON.parse(setHookConfiguration.mock.calls[1][0].configuration);
            const hookConfig = secondPayload.CloudFormationConfiguration.HookConfiguration;
            expect(hookConfig.FailureMode).toBe('WARN');
            expect(hookConfig.HookInvocationStatus).toBe('DISABLED');
        });

        it('does not serialize updates for different type names', async () => {
            const gate = deferred();
            const stored = JSON.stringify({
                CloudFormationConfiguration: { HookConfiguration: { TargetOperations: ['RESOURCE'] } },
            });
            const seen: string[] = [];
            const getHookConfiguration = vi
                .fn<(typeName: string) => Promise<string>>()
                .mockImplementation(async (typeName) => {
                    seen.push(typeName);
                    if (typeName === 'Private::Guard::A') {
                        await gate.promise;
                    }
                    return stored;
                });
            const setHookConfiguration = vi
                .fn<(params: { typeName: string; configuration: string }) => Promise<{ ConfigurationArn: string }>>()
                .mockResolvedValue({ ConfigurationArn: 'arn:aws:...' });
            const cfnService = { getHookConfiguration, setHookConfiguration } as unknown as CfnService;
            const localComponents = {
                hooksManager: new HooksManager(cfnService),
                cfnService,
            } as any;

            const blocked = configureHookHandler(localComponents)(
                { typeName: 'Private::Guard::A', failureMode: 'WARN' },
                CancellationToken.None,
            );
            const unblocked = configureHookHandler(localComponents)(
                { typeName: 'Private::Guard::B', failureMode: 'FAIL' },
                CancellationToken.None,
            );

            await unblocked;
            expect(seen).toContain('Private::Guard::B');

            gate.resolve();
            await blocked;
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
                ExecutionRole: 'arn:aws:iam::123:role/r',
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

        it('throws on a non-SUCCESS terminal status such as CANCEL_COMPLETE', async () => {
            mockCcapiService.createResource.mockResolvedValue({
                OperationStatus: 'CANCEL_COMPLETE',
                ErrorCode: 'NotUpdatable',
                StatusMessage: 'Operation cancelled',
            });
            const desiredState = JSON.stringify({
                Alias: 'Private::Guard::Foo',
                ExecutionRole: 'arn:aws:iam::123:role/r',
                FailureMode: 'FAIL',
                HookStatus: 'ENABLED',
                RuleLocation: { Uri: 's3://b/r.guard' },
                TargetOperations: ['RESOURCE'],
            });

            const handler = createGuardHookHandler(components);
            await expect(handler({ desiredState }, CancellationToken.None)).rejects.toThrow(
                /Guard Hook creation failed/,
            );
            expect(mockHooksManager.clearCache).toHaveBeenCalled();
        });
    });

    describe('setHookConfigurationHandler', () => {
        it('writes the raw configuration through CfnService and clears the cache', async () => {
            mockCfnService.setHookConfiguration.mockResolvedValue({
                ConfigurationArn: 'arn:aws:cloudformation:us-east-1:123:type-configuration/hook/x',
            });
            const handler = setHookConfigurationHandler(components);
            const result = (await handler(
                { typeName: 'Private::Guard::S3Check', configuration: '{"CloudFormationConfiguration":{}}' },
                CancellationToken.None,
            )) as SetHookConfigurationResult;

            expect(result.configurationArn).toBe('arn:aws:cloudformation:us-east-1:123:type-configuration/hook/x');
            expect(mockCfnService.setHookConfiguration).toHaveBeenCalledWith({
                typeName: 'Private::Guard::S3Check',
                configuration: '{"CloudFormationConfiguration":{}}',
            });
            expect(mockHooksManager.clearCache).toHaveBeenCalled();
        });

        it('surfaces a CfnService failure via handleLspError and skips the cache clear', async () => {
            mockCfnService.setHookConfiguration.mockRejectedValue(new Error('boom'));
            const handler = setHookConfigurationHandler(components);

            await expect(
                handler({ typeName: 'Private::Guard::S3Check', configuration: '{}' }, CancellationToken.None),
            ).rejects.toThrow();
            expect(mockHooksManager.clearCache).not.toHaveBeenCalled();
        });
    });

    describe('createS3BucketHandler', () => {
        it('creates the bucket and echoes the name back', async () => {
            const createBucket = vi.fn().mockResolvedValue(undefined);
            const handler = createS3BucketHandler({ s3Service: { createBucket } } as any);
            const result = (await handler(
                { bucketName: 'my-rule-bucket' },
                CancellationToken.None,
            )) as CreateS3BucketResult;

            expect(result.bucketName).toBe('my-rule-bucket');
            expect(createBucket).toHaveBeenCalledWith('my-rule-bucket');
        });

        it('surfaces an S3 failure via handleLspError', async () => {
            const createBucket = vi.fn().mockRejectedValue(new Error('bucket already exists'));
            const handler = createS3BucketHandler({ s3Service: { createBucket } } as any);

            await expect(handler({ bucketName: 'my-rule-bucket' }, CancellationToken.None)).rejects.toThrow();
        });
    });

    describe('createHookExecutionRoleHandler', () => {
        it('delegates to IamService and returns the created role', async () => {
            const createHookExecutionRole = vi
                .fn()
                .mockResolvedValue({ roleName: 'HookRole', arn: 'arn:aws:iam::123:role/HookRole' });
            const handler = createHookExecutionRoleHandler({ iamService: { createHookExecutionRole } } as any);
            const result = (await handler(
                { roleName: 'HookRole', ruleBucket: 'my-rule-bucket' },
                CancellationToken.None,
            )) as CreateHookExecutionRoleResult;

            expect(result.roleName).toBe('HookRole');
            expect(result.arn).toBe('arn:aws:iam::123:role/HookRole');
            expect(createHookExecutionRole).toHaveBeenCalledWith('HookRole', 'my-rule-bucket');
        });

        it('surfaces an IAM failure via handleLspError', async () => {
            const createHookExecutionRole = vi.fn().mockRejectedValue(new Error('not authorized'));
            const handler = createHookExecutionRoleHandler({ iamService: { createHookExecutionRole } } as any);

            await expect(handler({ roleName: 'HookRole' }, CancellationToken.None)).rejects.toThrow();
        });
    });
});
