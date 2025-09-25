import { GetResourceCommandOutput, ResourceNotFoundException } from '@aws-sdk/client-cloudcontrol';
import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceStateManager } from '../../../src/resourceState/ResourceStateManager';
import { ServerComponents } from '../../../src/server/ServerComponents';
import { CcapiService } from '../../../src/services/CcapiService';
import { IacGeneratorService } from '../../../src/services/IacGeneratorService';
import { ClientMessage } from '../../../src/telemetry/ClientMessage';
import { createMockSchemaRetriever } from '../../utils/MockServerComponents';

describe('ResourceStateManager', () => {
    const mockCcapiService = {
        getResource: vi.fn(),
    } as unknown as CcapiService;

    const mockIacGeneratorService = {} as unknown as IacGeneratorService;

    const mockClientMessage = {
        info: vi.fn(),
    } as unknown as ClientMessage;

    const mockServerComponents = {
        ccapiService: mockCcapiService,
        iacGeneratorService: mockIacGeneratorService,
        clientMessage: mockClientMessage,
        schemaRetriever: createMockSchemaRetriever(),
    } as unknown as ServerComponents;

    let manager: ResourceStateManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new ResourceStateManager(mockCcapiService, mockClientMessage, createMockSchemaRetriever());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getResource()', () => {
        it('should return cached resource if available', async () => {
            const mockOutput: GetResourceCommandOutput = {
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'my-bucket',
                    Properties: '{"BucketName": "my-bucket"}',
                },
                $metadata: {},
            };
            vi.mocked(mockCcapiService.getResource).mockResolvedValue(mockOutput);

            const result = await manager.getResource('AWS::S3::Bucket', 'my-bucket');

            expect(result?.properties).toEqual('{"BucketName": "my-bucket"}');
            await manager.getResource('AWS::S3::Bucket', 'my-bucket');
            expect(mockCcapiService.getResource).toHaveBeenCalledOnce();
        });

        it('should fetch and cache resource if not in cache', async () => {
            const mockOutput: GetResourceCommandOutput = {
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'my-bucket',
                    Properties: '{"BucketName": "my-bucket"}',
                },
                $metadata: {},
            };
            vi.mocked(mockCcapiService.getResource).mockResolvedValue(mockOutput);

            const result = await manager.getResource('AWS::S3::Bucket', 'my-bucket');

            expect(result).toEqual({
                typeName: 'AWS::S3::Bucket',
                identifier: 'my-bucket',
                properties: '{"BucketName": "my-bucket"}',
                createdTimestamp: expect.any(DateTime),
            });
        });

        it('should handle ResourceNotFoundException', async () => {
            const error = new ResourceNotFoundException({
                message: 'Resource not found',
                $metadata: { httpStatusCode: 404 },
            });
            vi.mocked(mockCcapiService.getResource).mockRejectedValue(error);

            const result = await manager.getResource('AWS::S3::Bucket', 'nonexistent');

            expect(result).toBeUndefined();
            expect(mockClientMessage.info).toHaveBeenCalledWith(
                'No resource found for type AWS::S3::Bucket and identifier "nonexistent"',
            );
        });

        it('should handle other errors', async () => {
            const error = new Error('Service error');
            vi.mocked(mockCcapiService.getResource).mockRejectedValue(error);

            const result = await manager.getResource('AWS::S3::Bucket', 'my-bucket');

            expect(result).toBeUndefined();
        });

        it('should handle missing required fields in output', async () => {
            const mockOutput: GetResourceCommandOutput = {
                TypeName: 'AWS::S3::Bucket',
                ResourceDescription: {
                    Identifier: 'my-bucket',
                    // Missing Properties
                },
                $metadata: {},
            };
            vi.mocked(mockCcapiService.getResource).mockResolvedValue(mockOutput);

            const result = await manager.getResource('AWS::S3::Bucket', 'my-bucket');

            expect(result).toBeUndefined();
        });
    });

    describe('create()', () => {
        it('should create ResourceStateManager instance with server components', () => {
            const manager = ResourceStateManager.create(mockServerComponents);

            expect(manager).toBeInstanceOf(ResourceStateManager);
        });
    });
});
