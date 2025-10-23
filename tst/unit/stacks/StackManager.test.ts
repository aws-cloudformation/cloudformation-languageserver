import { StackStatus, StackSummary } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CfnService } from '../../../src/services/CfnService';
import { StackManager } from '../../../src/stacks/StackManager';

describe('StackManager', () => {
    let stackManager: StackManager;
    let mockCfnService: CfnService;

    const createStackSummary = (id: string, name: string): StackSummary => ({
        StackId: id,
        StackName: name,
        StackStatus: StackStatus.CREATE_COMPLETE,
        CreationTime: new Date(),
    });

    beforeEach(() => {
        mockCfnService = {
            listStacks: vi.fn(),
        } as any;
        stackManager = new StackManager(mockCfnService);
        vi.clearAllMocks();
    });

    describe('listStacks', () => {
        it('should fetch and cache stacks on initial load', async () => {
            const stacks = [createStackSummary('stack-1', 'Stack1'), createStackSummary('stack-2', 'Stack2')];
            mockCfnService.listStacks = vi.fn().mockResolvedValue({ stacks, nextToken: 'token-1' });

            const result = await stackManager.listStacks();

            expect(mockCfnService.listStacks).toHaveBeenCalledWith(undefined, undefined, undefined);
            expect(result.stacks).toHaveLength(2);
            expect(result.nextToken).toBe('token-1');
        });

        it('should append stacks when loadMore is true', async () => {
            const firstPage = [createStackSummary('stack-1', 'Stack1')];
            const secondPage = [createStackSummary('stack-2', 'Stack2')];

            mockCfnService.listStacks = vi
                .fn()
                .mockResolvedValueOnce({ stacks: firstPage, nextToken: 'token-1' })
                .mockResolvedValueOnce({ stacks: secondPage, nextToken: undefined });

            const firstResult = await stackManager.listStacks();
            expect(firstResult.stacks).toHaveLength(1);
            expect(firstResult.nextToken).toBe('token-1');

            const secondResult = await stackManager.listStacks(undefined, undefined, true);
            expect(secondResult.stacks).toHaveLength(2);
            expect(secondResult.nextToken).toBeUndefined();
            expect(mockCfnService.listStacks).toHaveBeenCalledWith(undefined, undefined, 'token-1');
        });

        it('should clear cache when filters change', async () => {
            const firstStacks = [createStackSummary('stack-1', 'Stack1')];
            const secondStacks = [createStackSummary('stack-2', 'Stack2')];

            mockCfnService.listStacks = vi
                .fn()
                .mockResolvedValueOnce({ stacks: firstStacks, nextToken: undefined })
                .mockResolvedValueOnce({ stacks: secondStacks, nextToken: undefined });

            await stackManager.listStacks([StackStatus.CREATE_COMPLETE]);
            const result = await stackManager.listStacks([StackStatus.UPDATE_COMPLETE], undefined, true);

            expect(result.stacks).toHaveLength(1);
            expect(result.stacks[0].StackId).toBe('stack-2');
        });

        it('should pass statusToInclude filter to CfnService', async () => {
            mockCfnService.listStacks = vi.fn().mockResolvedValue({ stacks: [], nextToken: undefined });

            await stackManager.listStacks([StackStatus.CREATE_COMPLETE, StackStatus.UPDATE_COMPLETE]);

            expect(mockCfnService.listStacks).toHaveBeenCalledWith(
                [StackStatus.CREATE_COMPLETE, StackStatus.UPDATE_COMPLETE],
                undefined,
                undefined,
            );
        });

        it('should pass statusToExclude filter to CfnService', async () => {
            mockCfnService.listStacks = vi.fn().mockResolvedValue({ stacks: [], nextToken: undefined });

            await stackManager.listStacks(undefined, [StackStatus.DELETE_COMPLETE]);

            expect(mockCfnService.listStacks).toHaveBeenCalledWith(undefined, [StackStatus.DELETE_COMPLETE], undefined);
        });

        it('should handle stacks without StackId', async () => {
            const stacks = [
                createStackSummary('stack-1', 'Stack1'),
                { StackName: 'Stack2', StackStatus: StackStatus.CREATE_COMPLETE } as StackSummary,
            ];
            mockCfnService.listStacks = vi.fn().mockResolvedValue({ stacks, nextToken: undefined });

            const result = await stackManager.listStacks();

            expect(result.stacks).toHaveLength(1);
            expect(result.stacks[0].StackId).toBe('stack-1');
        });

        it('should deduplicate stacks by StackId when loading more', async () => {
            const stack1 = createStackSummary('stack-1', 'Stack1');
            const stack1Updated = { ...stack1, StackStatus: StackStatus.UPDATE_COMPLETE };

            mockCfnService.listStacks = vi
                .fn()
                .mockResolvedValueOnce({ stacks: [stack1], nextToken: 'token-1' })
                .mockResolvedValueOnce({ stacks: [stack1Updated], nextToken: undefined });

            await stackManager.listStacks();
            const result = await stackManager.listStacks(undefined, undefined, true);

            expect(result.stacks).toHaveLength(1);
            expect(result.stacks[0].StackStatus).toBe(StackStatus.UPDATE_COMPLETE);
        });
    });

    describe('clearCache', () => {
        it('should clear cache and nextToken', async () => {
            const stacks = [createStackSummary('stack-1', 'Stack1')];
            mockCfnService.listStacks = vi.fn().mockResolvedValue({ stacks, nextToken: 'token-1' });

            await stackManager.listStacks();
            stackManager.clearCache();

            mockCfnService.listStacks = vi.fn().mockResolvedValue({ stacks: [], nextToken: undefined });
            const result = await stackManager.listStacks(undefined, undefined, true);

            expect(result.stacks).toHaveLength(0);
            expect(mockCfnService.listStacks).toHaveBeenCalledWith(undefined, undefined, undefined);
        });
    });
});
