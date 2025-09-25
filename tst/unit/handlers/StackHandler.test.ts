import { StackSummary, StackStatus } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, vi } from 'vitest';
import { CancellationToken, ResultProgressReporter, WorkDoneProgressReporter } from 'vscode-languageserver';
import { listStacksHandler } from '../../../src/handlers/StackHandler';
import { ListStacksParams, ListStacksResult } from '../../../src/stacks/StackRequestType';
import { GetParametersResult } from '../../../src/templates/TemplateRequestType';

describe('StackHandler', () => {
    const mockParams = {} as ListStacksParams;
    const mockToken = {} as CancellationToken;
    const mockWorkDoneProgress = {} as WorkDoneProgressReporter;
    const mockResultProgress = {} as ResultProgressReporter<GetParametersResult>;

    it('should return stacks on success', async () => {
        const mockStacks: StackSummary[] = [
            {
                StackName: 'test-stack',
                StackStatus: 'CREATE_COMPLETE',
            } as StackSummary,
        ];

        const mockComponents = {
            cfnService: {
                listStacks: vi.fn().mockResolvedValue(mockStacks),
            },
        } as any;

        const handler = listStacksHandler(mockComponents);
        const result = (await handler(
            mockParams,
            mockToken,
            mockWorkDoneProgress,
            mockResultProgress,
        )) as ListStacksResult;

        expect(result.stacks).toEqual(mockStacks);
    });

    it('should return empty array on error', async () => {
        const mockComponents = {
            cfnService: {
                listStacks: vi.fn().mockRejectedValue(new Error('API Error')),
            },
        } as any;

        const handler = listStacksHandler(mockComponents);
        const result = (await handler(
            mockParams,
            mockToken,
            mockWorkDoneProgress,
            mockResultProgress,
        )) as ListStacksResult;

        expect(result.stacks).toEqual([]);
    });

    it('should pass statusToInclude to cfnService', async () => {
        const mockStacks: StackSummary[] = [];
        const mockComponents = {
            cfnService: {
                listStacks: vi.fn().mockResolvedValue(mockStacks),
            },
        } as any;

        const paramsWithInclude: ListStacksParams = {
            statusToInclude: [StackStatus.CREATE_COMPLETE],
        };

        const handler = listStacksHandler(mockComponents);
        await handler(paramsWithInclude, mockToken, mockWorkDoneProgress, mockResultProgress);

        expect(mockComponents.cfnService.listStacks).toHaveBeenCalledWith([StackStatus.CREATE_COMPLETE], undefined);
    });

    it('should pass statusToExclude to cfnService', async () => {
        const mockStacks: StackSummary[] = [];
        const mockComponents = {
            cfnService: {
                listStacks: vi.fn().mockResolvedValue(mockStacks),
            },
        } as any;

        const paramsWithExclude: ListStacksParams = {
            statusToExclude: [StackStatus.DELETE_COMPLETE],
        };

        const handler = listStacksHandler(mockComponents);
        await handler(paramsWithExclude, mockToken, mockWorkDoneProgress, mockResultProgress);

        expect(mockComponents.cfnService.listStacks).toHaveBeenCalledWith(undefined, [StackStatus.DELETE_COMPLETE]);
    });

    it('should return empty array when both statusToInclude and statusToExclude are provided', async () => {
        const mockComponents = {
            cfnService: {
                listStacks: vi.fn(),
            },
        } as any;

        const paramsWithBoth: ListStacksParams = {
            statusToInclude: [StackStatus.CREATE_COMPLETE],
            statusToExclude: [StackStatus.DELETE_COMPLETE],
        };

        const handler = listStacksHandler(mockComponents);
        const result = (await handler(
            paramsWithBoth,
            mockToken,
            mockWorkDoneProgress,
            mockResultProgress,
        )) as ListStacksResult;

        expect(result.stacks).toEqual([]);
        expect(mockComponents.cfnService.listStacks).not.toHaveBeenCalled();
    });
});
