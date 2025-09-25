import {
    CloudControlClient,
    GetResourceCommand,
    ListResourcesCommand,
    CloudControlServiceException,
    ResourceNotFoundException,
} from '@aws-sdk/client-cloudcontrol';
import { mockClient } from 'aws-sdk-client-mock';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerComponents } from '../../../src/server/ServerComponents';
import { AwsClient } from '../../../src/services/AwsClient';
import { CcapiService } from '../../../src/services/CcapiService';

const cloudControlMock = mockClient(CloudControlClient);
const mockGetCloudControlClient = vi.fn();

const mockClientComponent = {
    getCloudControlClient: mockGetCloudControlClient,
} as unknown as AwsClient;

const mockServerComponents = {
    awsClient: mockClientComponent,
} as unknown as ServerComponents;

describe('CcapiService', () => {
    let service: CcapiService;

    beforeEach(() => {
        vi.clearAllMocks();
        cloudControlMock.reset();
        mockGetCloudControlClient.mockReturnValue(new CloudControlClient({}));
        service = new CcapiService(mockClientComponent);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const createResourceNotFoundError = () =>
        new ResourceNotFoundException({
            message: 'Resource not found',
            $metadata: { httpStatusCode: 404 },
        });

    const createCloudControlServiceError = () =>
        new CloudControlServiceException({
            message: 'CloudControl service error',
            $metadata: { httpStatusCode: 500 },
            name: 'CloudControlServiceException',
            $fault: 'server',
        });

    describe('listResources()', () => {
        it('should successfully call listResources and return response', async () => {
            const mockResponse = {
                ResourceDescriptions: [
                    {
                        Identifier: 'resource-123',
                        Properties: '{"key": "value"}',
                    },
                ],
                TypeName: 'AWS::S3::Bucket',
            };
            cloudControlMock.on(ListResourcesCommand).resolves(mockResponse);

            const result = await service.listResources('AWS::S3::Bucket');

            expect(result).toEqual(mockResponse);
        });

        it('should throw CloudControlServiceException when API call fails', async () => {
            const error = createCloudControlServiceError();
            cloudControlMock.on(ListResourcesCommand).rejects(error);

            await expect(service.listResources('AWS::S3::Bucket')).rejects.toThrow(error);
        });
    });

    describe('getResource()', () => {
        it('should successfully call getResource and return response', async () => {
            const mockResponse = {
                ResourceDescription: {
                    Identifier: 'bucket-123',
                    Properties: '{"BucketName": "my-bucket"}',
                },
            };
            cloudControlMock.on(GetResourceCommand).resolves(mockResponse);

            const result = await service.getResource('AWS::S3::Bucket', 'bucket-123');

            expect(result).toEqual(mockResponse);
        });

        it('should throw ResourceNotFoundException when resource not found', async () => {
            const error = createResourceNotFoundError();
            cloudControlMock.on(GetResourceCommand).rejects(error);

            await expect(service.getResource('AWS::S3::Bucket', 'nonexistent')).rejects.toThrow(error);
        });
    });

    describe('create()', () => {
        it('should create CcapiService instance with server components', () => {
            const service = CcapiService.create(mockServerComponents);

            expect(service).toBeInstanceOf(CcapiService);
        });
    });

    describe('error handling', () => {
        it('should throw error when client creation fails', async () => {
            mockGetCloudControlClient.mockImplementation(() => {
                throw new Error('Failed to create AWS CloudControl client');
            });

            await expect(service.listResources('AWS::S3::Bucket')).rejects.toThrow(
                'Failed to create AWS CloudControl client',
            );
        });
    });
});
