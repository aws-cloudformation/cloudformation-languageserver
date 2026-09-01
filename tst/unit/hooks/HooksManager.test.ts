import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HooksManager, parseHookConfiguration } from '../../../src/hooks/HooksManager';
import { CfnService } from '../../../src/services/CfnService';

describe('HooksManager', () => {
    let manager: HooksManager;
    let mockCfnService: { listHooks: ReturnType<typeof vi.fn>; describeHook: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockCfnService = {
            listHooks: vi.fn(),
            describeHook: vi.fn(),
        };
        manager = new HooksManager(mockCfnService as unknown as CfnService);
    });

    describe('listHooks()', () => {
        it('should fetch hooks from CfnService on initial call', async () => {
            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Private::Guard::S3Check', TypeArn: 'arn:aws:...' }],
                nextToken: undefined,
            });

            const result = await manager.listHooks();

            expect(result.hooks).toHaveLength(1);
            expect(result.hooks[0].typeName).toBe('Private::Guard::S3Check');
            expect(mockCfnService.listHooks).toHaveBeenCalledOnce();
        });

        it('should clear cache and refetch when loadMore is false', async () => {
            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: 'token-1',
            });

            await manager.listHooks();

            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook2', TypeArn: 'arn:2' }],
                nextToken: undefined,
            });

            const result = await manager.listHooks(false);

            expect(result.hooks).toHaveLength(1);
            expect(result.hooks[0].typeName).toBe('Hook2');
        });

        it('should append to cache when loadMore is true', async () => {
            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: 'token-1',
            });

            await manager.listHooks();

            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook2', TypeArn: 'arn:2' }],
                nextToken: undefined,
            });

            const result = await manager.listHooks(true);

            expect(result.hooks).toHaveLength(2);
            expect(result.hooks[0].typeName).toBe('Hook1');
            expect(result.hooks[1].typeName).toBe('Hook2');
        });

        it('should pass nextToken when loading more', async () => {
            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: 'page-2-token',
            });

            await manager.listHooks();

            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook2', TypeArn: 'arn:2' }],
                nextToken: undefined,
            });

            await manager.listHooks(true);

            expect(mockCfnService.listHooks).toHaveBeenLastCalledWith('page-2-token');
        });

        it('should deduplicate hooks by TypeName', async () => {
            mockCfnService.listHooks.mockResolvedValue({
                hooks: [
                    { TypeName: 'Hook1', TypeArn: 'arn:1' },
                    { TypeName: 'Hook1', TypeArn: 'arn:1-duplicate' },
                ],
                nextToken: undefined,
            });

            const result = await manager.listHooks();
            expect(result.hooks).toHaveLength(1);
        });

        it('should return nextToken from response', async () => {
            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: 'has-more',
            });

            const result = await manager.listHooks();
            expect(result.nextToken).toBe('has-more');
        });

        it('should not refetch when loadMore is requested and there are no more pages', async () => {
            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: undefined,
            });

            await manager.listHooks();
            const result = await manager.listHooks(true);

            expect(mockCfnService.listHooks).toHaveBeenCalledOnce();
            expect(result.hooks).toHaveLength(1);
            expect(result.nextToken).toBeUndefined();
        });
    });

    describe('describeHook()', () => {
        it('should fetch hook details from CfnService', async () => {
            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Private::Guard::S3Check',
                Arn: 'arn:aws:...',
                Description: 'Checks S3 encryption',
                Visibility: 'PRIVATE',
            });

            const result = await manager.describeHook({ typeName: 'Private::Guard::S3Check' });

            expect(result.typeName).toBe('Private::Guard::S3Check');
            expect(result.description).toBe('Checks S3 encryption');
        });

        it('should cache describe results and not call service again', async () => {
            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Private::Guard::S3Check',
                Arn: 'arn:aws:...',
                Visibility: 'PRIVATE',
            });

            await manager.describeHook({ typeName: 'Private::Guard::S3Check' });
            await manager.describeHook({ typeName: 'Private::Guard::S3Check' });

            expect(mockCfnService.describeHook).toHaveBeenCalledOnce();
        });

        it('should fetch separately for different hooks', async () => {
            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Hook1',
                Arn: 'arn:1',
                Visibility: 'PRIVATE',
            });

            await manager.describeHook({ typeName: 'Hook1' });
            await manager.describeHook({ typeName: 'Hook2' });

            expect(mockCfnService.describeHook).toHaveBeenCalledTimes(2);
        });
    });

    describe('describeHook() key resolution', () => {
        it('should cache by arn when no typeName is given', async () => {
            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Hook1',
                Arn: 'arn:aws:cloudformation::123:type/hook/Hook1',
                Visibility: 'PRIVATE',
            });

            await manager.describeHook({ arn: 'arn:aws:cloudformation::123:type/hook/Hook1' });
            await manager.describeHook({ arn: 'arn:aws:cloudformation::123:type/hook/Hook1' });

            expect(mockCfnService.describeHook).toHaveBeenCalledOnce();
        });

        it('should throw when neither typeName nor arn is given', async () => {
            await expect(manager.describeHook({})).rejects.toThrow(/requires either typeName or arn/);
            expect(mockCfnService.describeHook).not.toHaveBeenCalled();
        });

        it('should reuse the cached result across typeName and arn lookups', async () => {
            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Hook1',
                Arn: 'arn:1',
                Visibility: 'PRIVATE',
            });

            await manager.describeHook({ typeName: 'Hook1' });
            await manager.describeHook({ arn: 'arn:1' });

            expect(mockCfnService.describeHook).toHaveBeenCalledOnce();
        });

        it('should coalesce concurrent lookups of the same hook into one service call', async () => {
            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Hook1',
                Arn: 'arn:1',
                Visibility: 'PRIVATE',
            });

            const [first, second] = await Promise.all([
                manager.describeHook({ typeName: 'Hook1' }),
                manager.describeHook({ typeName: 'Hook1' }),
            ]);

            expect(mockCfnService.describeHook).toHaveBeenCalledOnce();
            expect(first).toBe(second);
        });

        it('should not cache a failed lookup', async () => {
            mockCfnService.describeHook.mockRejectedValueOnce(new Error('access denied'));

            await expect(manager.describeHook({ typeName: 'Hook1' })).rejects.toThrow(/access denied/);

            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Hook1',
                Arn: 'arn:1',
                Visibility: 'PRIVATE',
            });
            const result = await manager.describeHook({ typeName: 'Hook1' });

            expect(result.typeName).toBe('Hook1');
            expect(mockCfnService.describeHook).toHaveBeenCalledTimes(2);
        });
    });

    describe('getCachedRuleContent()', () => {
        it('should return loaded content and cache it across calls', async () => {
            const loader = vi.fn().mockResolvedValue('let s3 = Resources.*');

            const first = await manager.getCachedRuleContent('s3://bucket/rule.guard', loader);
            const second = await manager.getCachedRuleContent('s3://bucket/rule.guard', loader);

            expect(first).toBe('let s3 = Resources.*');
            expect(second).toBe('let s3 = Resources.*');
            expect(loader).toHaveBeenCalledOnce();
        });

        it('should propagate loader failures', async () => {
            const loader = vi.fn().mockRejectedValue(new Error('s3 access denied'));

            await expect(manager.getCachedRuleContent('s3://bucket/missing.guard', loader)).rejects.toThrow(
                /s3 access denied/,
            );
        });
    });

    describe('clearCache()', () => {
        it('should clear hooks cache so next call refetches', async () => {
            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: undefined,
            });

            await manager.listHooks();
            manager.clearCache();

            mockCfnService.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook2', TypeArn: 'arn:2' }],
                nextToken: undefined,
            });

            const result = await manager.listHooks();
            expect(result.hooks[0].typeName).toBe('Hook2');
            expect(mockCfnService.listHooks).toHaveBeenCalledTimes(2);
        });

        it('should clear describe cache so next call refetches', async () => {
            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Hook1',
                Arn: 'arn:1',
                Visibility: 'PRIVATE',
            });

            await manager.describeHook({ typeName: 'Hook1' });
            manager.clearCache();
            await manager.describeHook({ typeName: 'Hook1' });

            expect(mockCfnService.describeHook).toHaveBeenCalledTimes(2);
        });
    });

    describe('parseHookConfiguration()', () => {
        it('returns configured=false for empty config', () => {
            expect(parseHookConfiguration('{}').configured).toBe(false);
            expect(parseHookConfiguration('{"CloudFormationConfiguration":{"HookConfiguration":{}}}').configured).toBe(
                false,
            );
        });

        it('returns configured=false for invalid JSON', () => {
            expect(parseHookConfiguration('not json').configured).toBe(false);
        });

        it('stays configured and drops fields with unexpected types', () => {
            const raw = JSON.stringify({
                CloudFormationConfiguration: {
                    HookConfiguration: {
                        FailureMode: 42,
                        HookInvocationStatus: { nested: true },
                        TargetOperations: ['RESOURCE', 7, null],
                        Properties: { ruleLocation: 99 },
                    },
                },
            });
            const parsed = parseHookConfiguration(raw);
            expect(parsed.configured).toBe(true);
            expect(parsed.failureMode).toBeUndefined();
            expect(parsed.invocationStatus).toBeUndefined();
            expect(parsed.targetOperations).toEqual(['RESOURCE']);
            expect(parsed.ruleUri).toBeUndefined();
        });

        it('extracts failure mode, status, and target operations', () => {
            const raw = JSON.stringify({
                CloudFormationConfiguration: {
                    HookConfiguration: {
                        FailureMode: 'FAIL',
                        HookInvocationStatus: 'ENABLED',
                        TargetOperations: ['RESOURCE', 'STACK'],
                    },
                },
            });
            const parsed = parseHookConfiguration(raw);
            expect(parsed.configured).toBe(true);
            expect(parsed.failureMode).toBe('FAIL');
            expect(parsed.invocationStatus).toBe('ENABLED');
            expect(parsed.targetOperations).toEqual(['RESOURCE', 'STACK']);
        });

        it('extracts ruleLocation as an object', () => {
            const raw = JSON.stringify({
                CloudFormationConfiguration: {
                    HookConfiguration: { Properties: { ruleLocation: { uri: 's3://b/r.guard' } } },
                },
            });
            expect(parseHookConfiguration(raw).ruleUri).toBe('s3://b/r.guard');
        });

        it('extracts ruleLocation as a bare string', () => {
            const raw = JSON.stringify({
                CloudFormationConfiguration: {
                    HookConfiguration: { Properties: { ruleLocation: 's3://b/r.guard' } },
                },
            });
            expect(parseHookConfiguration(raw).ruleUri).toBe('s3://b/r.guard');
        });
    });

    describe('listHooksDetailed()', () => {
        let detailedManager: HooksManager;
        let detailedMock: {
            listHooks: ReturnType<typeof vi.fn>;
            describeHook: ReturnType<typeof vi.fn>;
            getHookConfiguration: ReturnType<typeof vi.fn<(typeName: string) => Promise<string>>>;
        };

        beforeEach(() => {
            detailedMock = {
                listHooks: vi.fn(),
                describeHook: vi.fn(),
                getHookConfiguration: vi.fn<(typeName: string) => Promise<string>>(),
            };
            detailedManager = new HooksManager(detailedMock as unknown as CfnService);
        });

        it('merges configuration into each listed hook', async () => {
            detailedMock.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Private::Guard::A', TypeArn: 'arn:a' }],
                nextToken: undefined,
            });
            detailedMock.getHookConfiguration.mockResolvedValue(
                JSON.stringify({
                    CloudFormationConfiguration: {
                        HookConfiguration: {
                            FailureMode: 'WARN',
                            HookInvocationStatus: 'ENABLED',
                            TargetOperations: ['RESOURCE'],
                            Properties: { ruleLocation: { uri: 's3://b/a.guard' } },
                        },
                    },
                }),
            );

            const result = await detailedManager.listHooksDetailed();

            expect(result.hooks).toHaveLength(1);
            expect(result.hooks[0]).toMatchObject({
                typeName: 'Private::Guard::A',
                configured: true,
                failureMode: 'WARN',
                invocationStatus: 'ENABLED',
                targetOperations: ['RESOURCE'],
                ruleUri: 's3://b/a.guard',
            });
        });

        it('marks a hook unconfigured when config is empty', async () => {
            detailedMock.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: undefined,
            });
            detailedMock.getHookConfiguration.mockResolvedValue('{}');

            const result = await detailedManager.listHooksDetailed();
            expect(result.hooks[0].configured).toBe(false);
        });

        it('degrades gracefully when configuration fetch fails', async () => {
            detailedMock.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: undefined,
            });
            detailedMock.getHookConfiguration.mockRejectedValue(new Error('access denied'));

            const result = await detailedManager.listHooksDetailed();
            expect(result.hooks[0].configured).toBe(false);
            expect(result.hooks[0].failureMode).toBeUndefined();
        });

        it('caches configuration across repeated detailed listings', async () => {
            detailedMock.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: undefined,
            });
            detailedMock.getHookConfiguration.mockResolvedValue('{}');

            await detailedManager.listHooksDetailed();
            await detailedManager.listHooksDetailed();

            expect(detailedMock.getHookConfiguration).toHaveBeenCalledTimes(1);
        });

        it('resolves every hook and bounds concurrency when there are more than one batch', async () => {
            const hookCount = 25;
            detailedMock.listHooks.mockResolvedValue({
                hooks: Array.from({ length: hookCount }, (_, i) => ({
                    TypeName: `Hook${i}`,
                    TypeArn: `arn:${i}`,
                })),
                nextToken: undefined,
            });

            let inFlight = 0;
            let peakInFlight = 0;
            detailedMock.getHookConfiguration.mockImplementation(async () => {
                inFlight += 1;
                peakInFlight = Math.max(peakInFlight, inFlight);
                await Promise.resolve();
                inFlight -= 1;
                return '{}';
            });

            const result = await detailedManager.listHooksDetailed();

            expect(result.hooks).toHaveLength(hookCount);
            expect(detailedMock.getHookConfiguration).toHaveBeenCalledTimes(hookCount);
            expect(peakInFlight).toBeLessThanOrEqual(10);
        });

        it('refetches configuration after clearCache', async () => {
            detailedMock.listHooks.mockResolvedValue({
                hooks: [{ TypeName: 'Hook1', TypeArn: 'arn:1' }],
                nextToken: undefined,
            });
            detailedMock.getHookConfiguration.mockResolvedValue('{}');

            await detailedManager.listHooksDetailed();
            detailedManager.clearCache();
            await detailedManager.listHooksDetailed();

            expect(detailedMock.getHookConfiguration).toHaveBeenCalledTimes(2);
        });
    });
});
