import { describe, it, expect, vi } from 'vitest';
import { CancellationToken } from 'vscode-languageserver';
import { listChangeSetsHandler } from '../../../src/handlers/StackHandler';
import { ServerComponents } from '../../../src/server/ServerComponents';

describe('listChangeSetsHandler', () => {
    const mockToken = {} as CancellationToken;

    it('should return empty array on error', async () => {
        const mockCfnService = {
            listChangeSets: vi.fn().mockRejectedValue(new Error('Test error')),
        };

        const mockComponents = {
            cfnService: mockCfnService,
        } as unknown as ServerComponents;

        const handler = listChangeSetsHandler(mockComponents);
        const result = await handler({ stackName: 'test-stack' }, mockToken);

        expect(result).toEqual({ changeSets: [] });
    });

    it('should transform change sets correctly with pagination', async () => {
        const mockResult = {
            changeSets: [
                {
                    ChangeSetName: 'changeset-1',
                    Status: 'CREATE_COMPLETE',
                    CreationTime: new Date('2023-01-01T00:00:00Z'),
                    Description: 'Test changeset',
                },
            ],
            nextToken: 'next-page-token',
        };

        const mockCfnService = {
            listChangeSets: vi.fn().mockResolvedValue(mockResult),
        };

        const mockComponents = {
            cfnService: mockCfnService,
        } as unknown as ServerComponents;

        const handler = listChangeSetsHandler(mockComponents);
        const result = await handler({ stackName: 'test-stack', nextToken: 'some-token' }, mockToken);

        expect(mockCfnService.listChangeSets).toHaveBeenCalledWith('test-stack', 'some-token');
        expect(result).toEqual({
            changeSets: [
                {
                    changeSetName: 'changeset-1',
                    status: 'CREATE_COMPLETE',
                    creationTime: '2023-01-01T00:00:00.000Z',
                    description: 'Test changeset',
                },
            ],
            nextToken: 'next-page-token',
        });
    });
});
