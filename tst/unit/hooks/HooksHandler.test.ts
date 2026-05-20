import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import {
    listHooksHandler,
    describeHookHandler,
    listHookResultsHandler,
    getHookResultHandler,
    configureHookHandler,
} from '../../../src/handlers/HooksHandler';
import type { HooksManager } from '../../../src/hooks/HooksManager';
import type { ListHooksResult, DescribeHookResult, ListHookResultsResult, GetHookResultResult, ConfigureHookResult } from '../../../src/hooks/HooksRequestType';
import type { CfnService } from '../../../src/services/CfnService';

describe('HooksHandler', () => {
    let mockHooksManager: { listHooks: ReturnType<typeof vi.fn>; describeHook: ReturnType<typeof vi.fn>; clearCache: ReturnType<typeof vi.fn> };
    let mockCfnService: { listHookResults: ReturnType<typeof vi.fn>; getHookResult: ReturnType<typeof vi.fn>; setHookConfiguration: ReturnType<typeof vi.fn>; getHookConfiguration: ReturnType<typeof vi.fn> };
    let components: any;

    beforeEach(() => {
        mockHooksManager = {
            listHooks: vi.fn(),
            describeHook: vi.fn(),
            clearCache: vi.fn(),
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
            const result = (await handler({ typeName: 'Private::Guard::S3Check' }, CancellationToken.None)) as DescribeHookResult;

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
                    },
                ],
                TargetType: 'RESOURCE',
                TargetId: 'target-1',
                NextToken: undefined,
            });

            const handler = listHookResultsHandler(components);
            const result = (await handler({ typeArn: 'arn:aws:...' }, CancellationToken.None)) as ListHookResultsResult;

            expect(result.hookResults).toHaveLength(1);
            expect(result.hookResults[0].hookStatus).toBe('HOOK_COMPLETE_FAILED');
            expect(mockCfnService.listHookResults).toHaveBeenCalledWith({ typeArn: 'arn:aws:...' });
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
            mockCfnService.getHookConfiguration.mockResolvedValue(JSON.stringify({
                CloudFormationConfiguration: {
                    HookConfiguration: {
                        TargetStacks: 'ALL',
                        FailureMode: 'FAIL',
                        HookInvocationStatus: 'ENABLED',
                        Properties: { RuleLocation: 's3://bucket/rules.guard' },
                    },
                },
            }));
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
            expect(sentConfig.CloudFormationConfiguration.HookConfiguration.Properties.RuleLocation).toBe('s3://bucket/rules.guard');
            expect(mockHooksManager.clearCache).toHaveBeenCalled();
        });
    });
});
