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

    describe('describeHook() with persistent schema store', () => {
        let schemaStore: { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };

        beforeEach(() => {
            schemaStore = {
                get: vi.fn(),
                put: vi.fn().mockResolvedValue(undefined),
            };
            manager = new HooksManager(
                mockCfnService as unknown as CfnService,
                schemaStore as unknown as import('../../../src/hooks/HookSchemaStore').HookSchemaStore,
            );
        });

        it('should return persisted schema if not stale (skips service call)', async () => {
            schemaStore.get.mockReturnValue({
                version: 'v1',
                typeName: 'Hook1',
                schema: { typeName: 'Hook1', arn: 'arn:1', visibility: 'PRIVATE' },
                firstCreatedMs: Date.now(),
                lastModifiedMs: Date.now(),
            });

            const result = await manager.describeHook({ typeName: 'Hook1' });

            expect(result.typeName).toBe('Hook1');
            expect(mockCfnService.describeHook).not.toHaveBeenCalled();
        });

        it('should refetch and update store when persisted record is stale', async () => {
            const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
            schemaStore.get.mockReturnValue({
                version: 'v1',
                typeName: 'Hook1',
                schema: { typeName: 'Hook1', arn: 'arn:old', visibility: 'PRIVATE' },
                firstCreatedMs: eightDaysAgo,
                lastModifiedMs: eightDaysAgo,
            });
            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Hook1',
                Arn: 'arn:new',
                Visibility: 'PRIVATE',
            });

            const result = await manager.describeHook({ typeName: 'Hook1' });

            expect(result.arn).toBe('arn:new');
            expect(mockCfnService.describeHook).toHaveBeenCalledOnce();
            expect(schemaStore.put).toHaveBeenCalledOnce();
        });

        it('should fetch and persist when no record exists', async () => {
            schemaStore.get.mockReturnValue(undefined);
            mockCfnService.describeHook.mockResolvedValue({
                TypeName: 'Hook1',
                Arn: 'arn:1',
                Visibility: 'PRIVATE',
            });

            await manager.describeHook({ typeName: 'Hook1' });

            expect(mockCfnService.describeHook).toHaveBeenCalledOnce();
            expect(schemaStore.put).toHaveBeenCalledWith(
                'Hook1',
                expect.objectContaining({ typeName: 'Hook1', arn: 'arn:1' }),
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
            getHookConfiguration: ReturnType<typeof vi.fn>;
        };

        beforeEach(() => {
            detailedMock = {
                listHooks: vi.fn(),
                describeHook: vi.fn(),
                getHookConfiguration: vi.fn(),
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
