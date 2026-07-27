import { ControlCatalogClient, ListControlsCommand } from '@aws-sdk/client-controlcatalog';
import { mockClient } from 'aws-sdk-client-mock';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AwsClient } from '../../../src/services/AwsClient';
import { ControlCatalogService } from '../../../src/services/ControlCatalogService';

const controlCatalogMock = mockClient(ControlCatalogClient);
const mockGetControlCatalogClient = vi.fn();

const mockClientComponent = {
    getControlCatalogClient: mockGetControlCatalogClient,
} as unknown as AwsClient;

describe('ControlCatalogService', () => {
    let service: ControlCatalogService;

    beforeEach(() => {
        vi.clearAllMocks();
        controlCatalogMock.reset();
        mockGetControlCatalogClient.mockReturnValue(new ControlCatalogClient({}));
        service = new ControlCatalogService(mockClientComponent);
    });

    it('returns only PROACTIVE controls that have a CT. alias, mapped and sorted', async () => {
        controlCatalogMock.on(ListControlsCommand).resolves({
            Controls: [
                {
                    Behavior: 'PROACTIVE',
                    Name: 'Require encryption',
                    Aliases: ['CT.S3.PR.2', 'OTHER'],
                    GovernedResources: ['AWS::S3::Bucket'],
                },
                { Behavior: 'DETECTIVE', Name: 'Detective control', Aliases: ['CT.S3.DR.1'] },
                { Behavior: 'PROACTIVE', Name: 'No CT alias', Aliases: ['SH.S3.1'] },
                {
                    Behavior: 'PROACTIVE',
                    Name: 'Require versioning',
                    Aliases: ['CT.S3.PR.1'],
                    GovernedResources: ['AWS::S3::Bucket'],
                },
            ] as never,
        });

        const result = await service.listProactiveControls();

        expect(result).toEqual([
            { controlId: 'CT.S3.PR.1', name: 'Require versioning', resource: 'AWS::S3::Bucket' },
            { controlId: 'CT.S3.PR.2', name: 'Require encryption', resource: 'AWS::S3::Bucket' },
        ]);
    });

    it('paginates across NextToken', async () => {
        controlCatalogMock
            .on(ListControlsCommand, { NextToken: undefined })
            .resolves({
                Controls: [{ Behavior: 'PROACTIVE', Name: 'A', Aliases: ['CT.A.1'] }] as never,
                NextToken: 'page2',
            })
            .on(ListControlsCommand, { NextToken: 'page2' })
            .resolves({
                Controls: [{ Behavior: 'PROACTIVE', Name: 'B', Aliases: ['CT.B.1'] }] as never,
            });

        const result = await service.listProactiveControls();

        expect(result.map((c) => c.controlId)).toEqual(['CT.A.1', 'CT.B.1']);
        expect(controlCatalogMock.commandCalls(ListControlsCommand)).toHaveLength(2);
    });

    it('falls back to the control id when Name is missing', async () => {
        controlCatalogMock.on(ListControlsCommand).resolves({
            Controls: [{ Behavior: 'PROACTIVE', Aliases: ['CT.X.1'] }] as never,
        });

        const result = await service.listProactiveControls();

        expect(result).toEqual([{ controlId: 'CT.X.1', name: 'CT.X.1', resource: undefined }]);
    });

    it('propagates API errors', async () => {
        controlCatalogMock.on(ListControlsCommand).rejects(new Error('boom'));

        await expect(service.listProactiveControls()).rejects.toThrow('boom');
    });
});
