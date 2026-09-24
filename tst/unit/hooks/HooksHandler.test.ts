import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CancellationToken, ErrorCodes, ResponseError } from 'vscode-languageserver';
import {
    listHooksHandler,
    listHooksDetailedHandler,
    listPublicHooksHandler,
    describeHookHandler,
    listHookResultsHandler,
    getHookResultHandler,
    configureHookHandler,
    previewGuardHooksHandler,
    listIamRolesHandler,
    listS3BucketsHandler,
    listS3ObjectsHandler,
    listProactiveControlsHandler,
    activateHookHandler,
    deactivateHookHandler,
} from '../../../src/handlers/HooksHandler';
import * as GuardHookPreview from '../../../src/hooks/GuardHookPreview';
import { LoggerFactory } from '../../../src/telemetry/LoggerFactory';
import type { HooksManager } from '../../../src/hooks/HooksManager';
import type {
    ListHooksResult,
    ListHooksDetailedResult,
    ListPublicHooksResult,
    DescribeHookResult,
    ListHookResultsResult,
    GetHookResultResult,
    ConfigureHookResult,
    PreviewGuardHooksResult,
    ListIamRolesResult,
    ListS3BucketsResult,
    ListS3ObjectsResult,
    ListProactiveControlsResult,
    ActivateHookResult,
    DeactivateHookResult,
} from '../../../src/hooks/HooksRequestType';
import type { CfnService } from '../../../src/services/CfnService';

describe('HooksHandler', () => {
    let mockHooksManager: {
        listHooks: ReturnType<typeof vi.fn>;
        describeHook: ReturnType<typeof vi.fn>;
        clearCache: ReturnType<typeof vi.fn>;
        runExclusiveForType: <T>(typeName: string, task: () => Promise<T>) => Promise<T>;
    };
    let mockCfnService: {
        listHookResults: ReturnType<typeof vi.fn>;
        getHookResult: ReturnType<typeof vi.fn>;
        setHookConfiguration: ReturnType<typeof vi.fn>;
        getHookConfiguration: ReturnType<typeof vi.fn>;
    };
    let components: any;

    beforeEach(() => {
        mockHooksManager = {
            listHooks: vi.fn(),
            describeHook: vi.fn(),
            clearCache: vi.fn(),
            runExclusiveForType: (_typeName, task) => task(),
        };
        mockCfnService = {
            listHookResults: vi.fn(),
            getHookResult: vi.fn(),
            setHookConfiguration: vi.fn(),
            getHookConfiguration: vi.fn(),
        };
        components = {
            hooksManager: mockHooksManager as unknown as HooksManager,
            cfnService: mockCfnService as unknown as CfnService,
        };
    });

    describe('listHooksHandler', () => {
        it('should delegate to HooksManager.listHooks', async () => {
            mockHooksManager.listHooks.mockResolvedValue({
                hooks: [{ typeName: 'Private::Guard::S3Check', typeArn: 'arn:aws:...' }],
                nextToken: undefined,
            });

            const handler = listHooksHandler(components);
            const result = (await handler({ loadMore: false }, CancellationToken.None)) as ListHooksResult;

            expect(result.hooks).toHaveLength(1);
            expect(result.hooks[0].typeName).toBe('Private::Guard::S3Check');
            expect(mockHooksManager.listHooks).toHaveBeenCalledWith(false);
        });

        it('should pass loadMore to HooksManager', async () => {
            mockHooksManager.listHooks.mockResolvedValue({ hooks: [], nextToken: undefined });

            const handler = listHooksHandler(components);
            await handler({ loadMore: true }, CancellationToken.None);

            expect(mockHooksManager.listHooks).toHaveBeenCalledWith(true);
        });
    });

    describe('describeHookHandler', () => {
        it('should delegate to HooksManager.describeHook', async () => {
            mockHooksManager.describeHook.mockResolvedValue({
                typeName: 'Private::Guard::S3Check',
                arn: 'arn:aws:...',
                visibility: 'PRIVATE',
            });

            const handler = describeHookHandler(components);
            const result = (await handler(
                { typeName: 'Private::Guard::S3Check' },
                CancellationToken.None,
            )) as DescribeHookResult;

            expect(result.typeName).toBe('Private::Guard::S3Check');
            expect(mockHooksManager.describeHook).toHaveBeenCalledWith({ typeName: 'Private::Guard::S3Check' });
        });
    });

    describe('listHookResultsHandler', () => {
        it('should delegate to CfnService.listHookResults and map response', async () => {
            mockCfnService.listHookResults.mockResolvedValue({
                HookResults: [
                    {
                        HookResultId: 'result-1',
                        TypeArn: 'arn:aws:...',
                        TypeName: 'Private::Guard::S3Check',
                        InvocationPoint: 'CREATE_PRE_PROVISION',
                        Status: 'HOOK_COMPLETE_FAILED',
                        FailureMode: 'FAIL',
                        TargetId: 'target-1',
                        TargetType: 'RESOURCE',
                        InvokedAt: new Date('2024-01-02T03:04:05.000Z'),
                    },
                ],
                NextToken: 'next-page-token',
            });

            const handler = listHookResultsHandler(components);
            const result = (await handler({ typeArn: 'arn:aws:...' }, CancellationToken.None)) as ListHookResultsResult;

            expect(result.hookResults).toHaveLength(1);
            expect(result.hookResults[0].hookStatus).toBe('HOOK_COMPLETE_FAILED');
            expect(result.hookResults[0].hookTypeArn).toBe('arn:aws:...');
            expect(result.hookResults[0].targetId).toBe('target-1');
            expect(result.hookResults[0].targetType).toBe('RESOURCE');
            expect(result.hookResults[0].timestamp).toBe('2024-01-02T03:04:05.000Z');
            expect(result.nextToken).toBe('next-page-token');
            expect(mockCfnService.listHookResults).toHaveBeenCalledWith({ typeArn: 'arn:aws:...' });
        });

        it('rejects a status filter as InvalidParams', async () => {
            const handler = listHookResultsHandler(components);
            try {
                await handler({ status: 'HOOK_COMPLETE_FAILED' } as any, CancellationToken.None);
                expect.unreachable('handler should have rejected the status filter');
            } catch (error) {
                expect(error).toBeInstanceOf(ResponseError);
                expect((error as ResponseError<void>).code).toBe(ErrorCodes.InvalidParams);
            }
            expect(mockCfnService.listHookResults).not.toHaveBeenCalled();
        });
    });

    describe('getHookResultHandler', () => {
        it('should delegate to CfnService.getHookResult and map response', async () => {
            mockCfnService.getHookResult.mockResolvedValue({
                HookResultId: 'result-1',
                TypeName: 'Private::Guard::S3Check',
                Status: 'HOOK_COMPLETE_FAILED',
                FailureMode: 'FAIL',
                InvocationPoint: 'CREATE_PRE_PROVISION',
                Annotations: [{ SeverityLevel: 'CRITICAL', StatusMessage: 'S3 bucket must have encryption' }],
                Target: { TargetType: 'RESOURCE', TargetTypeName: 'AWS::S3::Bucket' },
            });

            const handler = getHookResultHandler(components);
            const result = (await handler({ hookResultId: 'result-1' }, CancellationToken.None)) as GetHookResultResult;

            expect(result.hookResultId).toBe('result-1');
            expect(result.annotations).toHaveLength(1);
            expect(result.annotations![0].statusMessage).toBe('S3 bucket must have encryption');
            expect(mockCfnService.getHookResult).toHaveBeenCalledWith('result-1');
        });
    });

    describe('configureHookHandler', () => {
        it('should read current config, merge failureMode, and write back', async () => {
            mockCfnService.getHookConfiguration.mockResolvedValue(
                JSON.stringify({
                    CloudFormationConfiguration: {
                        HookConfiguration: {
                            TargetStacks: 'ALL',
                            FailureMode: 'FAIL',
                            HookInvocationStatus: 'ENABLED',
                            Properties: { RuleLocation: 's3://bucket/rules.guard' },
                        },
                    },
                }),
            );
            mockCfnService.setHookConfiguration.mockResolvedValue({
                ConfigurationArn: 'arn:aws:cloudformation:us-east-1:123:type-configuration/hook/...',
            });

            const handler = configureHookHandler(components);
            const result = (await handler(
                { typeName: 'Private::Guard::S3Check', failureMode: 'WARN' },
                CancellationToken.None,
            )) as ConfigureHookResult;

            expect(result.configurationArn).toBeDefined();
            const callArgs = mockCfnService.setHookConfiguration.mock.calls[0][0];
            const sentConfig = JSON.parse(callArgs.configuration);
            expect(sentConfig.CloudFormationConfiguration.HookConfiguration.FailureMode).toBe('WARN');
            expect(sentConfig.CloudFormationConfiguration.HookConfiguration.Properties.RuleLocation).toBe(
                's3://bucket/rules.guard',
            );
            expect(mockHooksManager.clearCache).toHaveBeenCalled();
        });
    });
});

describe('previewGuardHooksHandler', () => {
    it('parses params and returns preview entries from the preview engine', async () => {
        const listAllHooksDetailed = vi.fn().mockResolvedValue([]);
        const components = {
            hooksManager: { listAllHooksDetailed, getCachedRuleContent: vi.fn() },
            s3Service: { getObjectContent: vi.fn() },
        } as any;

        const handler = previewGuardHooksHandler(components);
        const result = (await handler(
            { templateContent: '{"Resources":{}}' },
            CancellationToken.None,
        )) as PreviewGuardHooksResult;

        expect(result.hooks).toEqual([]);
        expect(listAllHooksDetailed).toHaveBeenCalledTimes(1);
    });

    it('evaluates hooks drained from every page', async () => {
        const listAllHooksDetailed = vi.fn().mockResolvedValue([
            {
                typeName: 'Private::Guard::Page1',
                typeArn: 'arn:1',
                configured: true,
                invocationStatus: 'ENABLED',
                ruleUri: 's3://b/p1.guard',
            },
            {
                typeName: 'Private::Guard::Page2',
                typeArn: 'arn:2',
                configured: true,
                invocationStatus: 'ENABLED',
                ruleUri: 's3://b/p2.guard',
            },
        ]);
        const evaluateRule = vi.fn().mockReturnValue({ valid: true, parseErrors: [], violations: [] });
        const components = {
            hooksManager: {
                listAllHooksDetailed,
                getCachedRuleContent: vi.fn().mockResolvedValue('rule r { ... }'),
            },
            s3Service: { getObjectContent: vi.fn() },
            guardEngine: { evaluateRule },
        } as any;

        const handler = previewGuardHooksHandler(components);
        const result = (await handler(
            { templateContent: '{"Resources":{}}' },
            CancellationToken.None,
        )) as PreviewGuardHooksResult;

        expect(result.hooks.map((h) => h.typeName)).toEqual(['Private::Guard::Page1', 'Private::Guard::Page2']);
        expect(listAllHooksDetailed).toHaveBeenCalledTimes(1);
        expect(evaluateRule).toHaveBeenCalledTimes(2);
    });

    it('rejects an empty templateContent before doing any work', async () => {
        const handler = previewGuardHooksHandler({} as any);
        await expect(handler({ templateContent: '' }, CancellationToken.None)).rejects.toThrow();
    });
});

describe('handler error path', () => {
    it('surfaces underlying service errors via handleLspError', async () => {
        const components = {
            hooksManager: { listHooks: vi.fn().mockRejectedValue(new Error('boom')) },
        } as any;

        const handler = listHooksHandler(components);
        await expect(handler({ loadMore: false }, CancellationToken.None)).rejects.toThrow();
    });
});

describe('param validation error classification', () => {
    it('maps an invalid param payload to InvalidParams rather than InternalError', async () => {
        const handler = listHooksHandler({} as any);
        try {
            await handler({ loadMore: 'not-a-boolean' } as any, CancellationToken.None);
            expect.unreachable('handler should have thrown on invalid params');
        } catch (error) {
            expect(error).toBeInstanceOf(ResponseError);
            expect((error as ResponseError<void>).code).toBe(ErrorCodes.InvalidParams);
        }
    });
});

describe('previewGuardHooksHandler STS-failure path', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('resolves with accountId undefined and logs a warning when STS fails', async () => {
        const previewSpy = vi.spyOn(GuardHookPreview, 'previewGuardHooks').mockResolvedValue({ hooks: [] });
        const warnSpy = vi.spyOn(LoggerFactory.getLogger('HooksHandler'), 'warn');

        const failingSts = { send: vi.fn().mockRejectedValue(new Error('STS unavailable')) };
        const components = {
            hooksManager: { listHooksDetailed: vi.fn(), getCachedRuleContent: vi.fn() },
            s3Service: { getObjectContent: vi.fn() },
            awsClient: { getStsClient: () => failingSts },
        } as any;

        const handler = previewGuardHooksHandler(components);
        const result = (await handler(
            { templateContent: '{"Resources":{}}' },
            CancellationToken.None,
        )) as PreviewGuardHooksResult;

        expect(result.hooks).toEqual([]);
        expect(previewSpy).toHaveBeenCalledTimes(1);
        expect(previewSpy.mock.calls[0][0].accountId).toBeUndefined();
        expect(warnSpy).toHaveBeenCalled();
    });
});

describe('listHooksDetailedHandler', () => {
    it('forwards loadMore and returns the detailed listing', async () => {
        const listHooksDetailed = vi.fn().mockResolvedValue({
            hooks: [
                {
                    typeName: 'Private::Guard::S3Check',
                    typeArn: 'arn:aws:...',
                    configured: true,
                    failureMode: 'WARN',
                    invocationStatus: 'ENABLED',
                    targetOperations: ['RESOURCE'],
                    ruleUri: 's3://b/r.guard',
                },
            ],
            nextToken: 'page-2',
        });
        const components = { hooksManager: { listHooksDetailed } } as any;

        const handler = listHooksDetailedHandler(components);
        const result = (await handler({ loadMore: true }, CancellationToken.None)) as ListHooksDetailedResult;

        expect(result.hooks).toHaveLength(1);
        expect(result.hooks[0].typeName).toBe('Private::Guard::S3Check');
        expect(result.hooks[0].configured).toBe(true);
        expect(result.hooks[0].ruleUri).toBe('s3://b/r.guard');
        expect(result.nextToken).toBe('page-2');
        expect(listHooksDetailed).toHaveBeenCalledWith(true);
    });

    it('surfaces a HooksManager failure via handleLspError', async () => {
        const components = {
            hooksManager: { listHooksDetailed: vi.fn().mockRejectedValue(new Error('boom')) },
        } as any;
        const handler = listHooksDetailedHandler(components);
        await expect(handler({ loadMore: false }, CancellationToken.None)).rejects.toThrow();
    });
});

describe('listPublicHooksHandler', () => {
    it('maps the CfnService response into public hook summaries', async () => {
        const listPublicHooks = vi.fn().mockResolvedValue({
            hooks: [{ TypeName: 'AWS::S3::Public', PublisherId: 'pub-1', Description: 'a public hook' }],
        });
        const components = { cfnService: { listPublicHooks } } as any;

        const handler = listPublicHooksHandler(components);
        const result = (await handler({ typeNamePrefix: 'AWS::S3' }, CancellationToken.None)) as ListPublicHooksResult;

        expect(result.hooks).toHaveLength(1);
        expect(result.hooks[0].typeName).toBe('AWS::S3::Public');
        expect(result.hooks[0].publisherId).toBe('pub-1');
        expect(result.hooks[0].description).toBe('a public hook');
        expect(listPublicHooks).toHaveBeenCalledWith({ typeNamePrefix: 'AWS::S3' });
    });

    it('surfaces a CfnService failure via handleLspError', async () => {
        const components = { cfnService: { listPublicHooks: vi.fn().mockRejectedValue(new Error('boom')) } } as any;
        const handler = listPublicHooksHandler(components);
        await expect(handler({}, CancellationToken.None)).rejects.toThrow();
    });
});

describe('listIamRolesHandler', () => {
    it('returns the roles from IamService', async () => {
        const roles = [{ roleName: 'HookRole', arn: 'arn:aws:iam::123:role/HookRole' }];
        const components = { iamService: { listRoles: vi.fn().mockResolvedValue(roles) } } as any;

        const handler = listIamRolesHandler(components);
        const result = (await handler({}, CancellationToken.None)) as ListIamRolesResult;

        expect(result.roles).toEqual(roles);
    });

    it('surfaces an IamService failure via handleLspError', async () => {
        const components = { iamService: { listRoles: vi.fn().mockRejectedValue(new Error('boom')) } } as any;
        const handler = listIamRolesHandler(components);
        await expect(handler({}, CancellationToken.None)).rejects.toThrow();
    });
});

describe('listS3BucketsHandler', () => {
    it('returns the bucket names from S3Service', async () => {
        const components = {
            s3Service: { listAllBucketNames: vi.fn().mockResolvedValue(['bucket-a', 'bucket-b']) },
        } as any;

        const handler = listS3BucketsHandler(components);
        const result = (await handler({}, CancellationToken.None)) as ListS3BucketsResult;

        expect(result.buckets).toEqual(['bucket-a', 'bucket-b']);
    });

    it('surfaces an S3Service failure via handleLspError', async () => {
        const components = { s3Service: { listAllBucketNames: vi.fn().mockRejectedValue(new Error('boom')) } } as any;
        const handler = listS3BucketsHandler(components);
        await expect(handler({}, CancellationToken.None)).rejects.toThrow();
    });
});

describe('listS3ObjectsHandler', () => {
    it('forwards bucket and prefix and returns the object keys', async () => {
        const listObjects = vi.fn().mockResolvedValue(['rules/a.guard', 'rules/b.guard']);
        const components = { s3Service: { listObjects } } as any;

        const handler = listS3ObjectsHandler(components);
        const result = (await handler(
            { bucketName: 'my-bucket', prefix: 'rules/' },
            CancellationToken.None,
        )) as ListS3ObjectsResult;

        expect(result.keys).toEqual(['rules/a.guard', 'rules/b.guard']);
        expect(listObjects).toHaveBeenCalledWith('my-bucket', 'rules/');
    });

    it('surfaces an S3Service failure via handleLspError', async () => {
        const components = { s3Service: { listObjects: vi.fn().mockRejectedValue(new Error('boom')) } } as any;
        const handler = listS3ObjectsHandler(components);
        await expect(handler({ bucketName: 'my-bucket' }, CancellationToken.None)).rejects.toThrow();
    });
});

describe('listProactiveControlsHandler', () => {
    it('returns the controls from ControlCatalogService', async () => {
        const controls = [{ controlId: 'ctrl-1', name: 'Encrypt S3', resource: 'AWS::S3::Bucket' }];
        const components = {
            controlCatalogService: { listProactiveControls: vi.fn().mockResolvedValue(controls) },
        } as any;

        const handler = listProactiveControlsHandler(components);
        const result = (await handler({}, CancellationToken.None)) as ListProactiveControlsResult;

        expect(result.controls).toEqual(controls);
    });

    it('surfaces a ControlCatalogService failure via handleLspError', async () => {
        const components = {
            controlCatalogService: { listProactiveControls: vi.fn().mockRejectedValue(new Error('boom')) },
        } as any;
        const handler = listProactiveControlsHandler(components);
        await expect(handler({}, CancellationToken.None)).rejects.toThrow();
    });
});

describe('activateHookHandler', () => {
    it('activates the hook, maps the arn, and clears the cache', async () => {
        const activateHook = vi.fn().mockResolvedValue({ Arn: 'arn:aws:cloudformation:us-east-1:123:type/hook/x' });
        const clearCache = vi.fn();
        const components = { cfnService: { activateHook }, hooksManager: { clearCache } } as any;

        const handler = activateHookHandler(components);
        const result = (await handler(
            { typeName: 'Private::Guard::S3Check', executionRoleArn: 'arn:aws:iam::123:role/r' },
            CancellationToken.None,
        )) as ActivateHookResult;

        expect(result.arn).toBe('arn:aws:cloudformation:us-east-1:123:type/hook/x');
        expect(activateHook).toHaveBeenCalledWith({
            typeName: 'Private::Guard::S3Check',
            executionRoleArn: 'arn:aws:iam::123:role/r',
        });
        expect(clearCache).toHaveBeenCalled();
    });

    it('surfaces a CfnService failure via handleLspError without clearing the cache', async () => {
        const clearCache = vi.fn();
        const components = {
            cfnService: { activateHook: vi.fn().mockRejectedValue(new Error('boom')) },
            hooksManager: { clearCache },
        } as any;

        const handler = activateHookHandler(components);
        await expect(handler({ typeName: 'Private::Guard::S3Check' }, CancellationToken.None)).rejects.toThrow();
        expect(clearCache).not.toHaveBeenCalled();
    });
});

describe('deactivateHookHandler', () => {
    it('deactivates the hook and clears the cache', async () => {
        const deactivateHook = vi.fn().mockResolvedValue({});
        const clearCache = vi.fn();
        const components = { cfnService: { deactivateHook }, hooksManager: { clearCache } } as any;

        const handler = deactivateHookHandler(components);
        const result = (await handler(
            { typeName: 'Private::Guard::S3Check' },
            CancellationToken.None,
        )) as DeactivateHookResult;

        expect(result).toEqual({});
        expect(deactivateHook).toHaveBeenCalledWith({ typeName: 'Private::Guard::S3Check' });
        expect(clearCache).toHaveBeenCalled();
    });

    it('surfaces a CfnService failure via handleLspError without clearing the cache', async () => {
        const clearCache = vi.fn();
        const components = {
            cfnService: { deactivateHook: vi.fn().mockRejectedValue(new Error('boom')) },
            hooksManager: { clearCache },
        } as any;

        const handler = deactivateHookHandler(components);
        await expect(handler({ typeName: 'Private::Guard::S3Check' }, CancellationToken.None)).rejects.toThrow();
        expect(clearCache).not.toHaveBeenCalled();
    });
});
