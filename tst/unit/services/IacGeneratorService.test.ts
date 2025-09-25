import {
    CloudFormationClient,
    CreateGeneratedTemplateCommand,
    DescribeGeneratedTemplateCommand,
    DescribeResourceScanCommand,
    GetGeneratedTemplateCommand,
    ListResourceScanResourcesCommand,
    StartResourceScanCommand,
    UpdateGeneratedTemplateCommand,
    CloudFormationServiceException,
    ResourceScanStatus,
    GeneratedTemplateStatus,
} from '@aws-sdk/client-cloudformation';
import { mockClient } from 'aws-sdk-client-mock';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerComponents } from '../../../src/server/ServerComponents';
import { AwsClient } from '../../../src/services/AwsClient';
import { IacGeneratorService } from '../../../src/services/IacGeneratorService';

const cloudFormationMock = mockClient(CloudFormationClient);
const mockGetCloudFormationClient = vi.fn();

const mockClientComponent = {
    getCloudFormationClient: mockGetCloudFormationClient,
} as unknown as AwsClient;

const mockServerComponents = {
    awsClient: mockClientComponent,
} as unknown as ServerComponents;

describe('IacGeneratorService', () => {
    let service: IacGeneratorService;

    beforeEach(() => {
        vi.clearAllMocks();
        cloudFormationMock.reset();
        mockGetCloudFormationClient.mockReturnValue(new CloudFormationClient({}));
        service = new IacGeneratorService(mockClientComponent);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const createCloudFormationServiceError = () =>
        new CloudFormationServiceException({
            message: 'CloudFormation service error',
            $metadata: { httpStatusCode: 500 },
            name: 'CloudFormationServiceException',
            $fault: 'server',
        });

    describe('startResourceScan()', () => {
        it('should successfully start resource scan without types', async () => {
            const mockResponse = { ResourceScanId: 'scan-123' };
            cloudFormationMock.on(StartResourceScanCommand).resolves(mockResponse);

            const result = await service.startResourceScan();

            expect(result).toBe('scan-123');
        });

        it('should successfully start resource scan with types', async () => {
            const mockResponse = { ResourceScanId: 'scan-456' };
            cloudFormationMock.on(StartResourceScanCommand).resolves(mockResponse);

            const result = await service.startResourceScan(['AWS::S3::Bucket', 'AWS::EC2::Instance']);

            expect(result).toBe('scan-456');
        });

        it('should throw CloudFormationServiceException when API call fails', async () => {
            const error = createCloudFormationServiceError();
            cloudFormationMock.on(StartResourceScanCommand).rejects(error);

            await expect(service.startResourceScan()).rejects.toThrow(error);
        });
    });

    describe('listResourceScanResources()', () => {
        it('should successfully list resource scan resources', async () => {
            const mockResponse = {
                Resources: [
                    {
                        ResourceType: 'AWS::S3::Bucket',
                        ResourceIdentifier: { BucketName: 'my-bucket' },
                    },
                ],
            };
            cloudFormationMock.on(ListResourceScanResourcesCommand).resolves(mockResponse);

            const result = await service.listResourceScanResources('scan-123');

            expect(result).toEqual(mockResponse.Resources);
        });

        it('should throw CloudFormationServiceException when API call fails', async () => {
            const error = createCloudFormationServiceError();
            cloudFormationMock.on(ListResourceScanResourcesCommand).rejects(error);

            await expect(service.listResourceScanResources('scan-123')).rejects.toThrow(error);
        });
    });

    describe('describeResourceScan()', () => {
        it('should successfully describe resource scan', async () => {
            const mockResponse = {
                ResourceScanId: 'scan-123',
                Status: ResourceScanStatus.COMPLETE,
            };
            cloudFormationMock.on(DescribeResourceScanCommand).resolves(mockResponse);

            const result = await service.describeResourceScan('scan-123');

            expect(result).toEqual(mockResponse);
        });

        it('should throw CloudFormationServiceException when API call fails', async () => {
            const error = createCloudFormationServiceError();
            cloudFormationMock.on(DescribeResourceScanCommand).rejects(error);

            await expect(service.describeResourceScan('scan-123')).rejects.toThrow(error);
        });
    });

    describe('createGeneratedTemplate()', () => {
        it('should successfully create generated template', async () => {
            const mockResponse = { GeneratedTemplateId: 'template-123' };
            cloudFormationMock.on(CreateGeneratedTemplateCommand).resolves(mockResponse);

            const input = { GeneratedTemplateName: 'my-template' };
            const result = await service.createGeneratedTemplate(input);

            expect(result).toEqual(mockResponse);
        });

        it('should throw CloudFormationServiceException when API call fails', async () => {
            const error = createCloudFormationServiceError();
            cloudFormationMock.on(CreateGeneratedTemplateCommand).rejects(error);

            const input = { GeneratedTemplateName: 'my-template' };
            await expect(service.createGeneratedTemplate(input)).rejects.toThrow(error);
        });
    });

    describe('updateGeneratedTemplate()', () => {
        it('should successfully update generated template', async () => {
            const mockResponse = {};
            cloudFormationMock.on(UpdateGeneratedTemplateCommand).resolves(mockResponse);

            const input = { GeneratedTemplateName: 'my-template' };
            const result = await service.updateGeneratedTemplate(input);

            expect(result).toEqual(mockResponse);
        });

        it('should throw CloudFormationServiceException when API call fails', async () => {
            const error = createCloudFormationServiceError();
            cloudFormationMock.on(UpdateGeneratedTemplateCommand).rejects(error);

            const input = { GeneratedTemplateName: 'my-template' };
            await expect(service.updateGeneratedTemplate(input)).rejects.toThrow(error);
        });
    });

    describe('describeGeneratedTemplate()', () => {
        it('should successfully describe generated template', async () => {
            const mockResponse = {
                GeneratedTemplateName: 'my-template',
                Status: GeneratedTemplateStatus.COMPLETE,
            };
            cloudFormationMock.on(DescribeGeneratedTemplateCommand).resolves(mockResponse);

            const input = { GeneratedTemplateName: 'my-template' };
            const result = await service.describeGeneratedTemplate(input);

            expect(result).toEqual(mockResponse);
        });

        it('should throw CloudFormationServiceException when API call fails', async () => {
            const error = createCloudFormationServiceError();
            cloudFormationMock.on(DescribeGeneratedTemplateCommand).rejects(error);

            const input = { GeneratedTemplateName: 'my-template' };
            await expect(service.describeGeneratedTemplate(input)).rejects.toThrow(error);
        });
    });

    describe('getGeneratedTemplate()', () => {
        it('should successfully get generated template', async () => {
            const mockResponse = {
                TemplateBody: '{"AWSTemplateFormatVersion": "2010-09-09"}',
            };
            cloudFormationMock.on(GetGeneratedTemplateCommand).resolves(mockResponse);

            const input = { GeneratedTemplateName: 'my-template' };
            const result = await service.getGeneratedTemplate(input);

            expect(result).toEqual(mockResponse);
        });

        it('should throw CloudFormationServiceException when API call fails', async () => {
            const error = createCloudFormationServiceError();
            cloudFormationMock.on(GetGeneratedTemplateCommand).rejects(error);

            const input = { GeneratedTemplateName: 'my-template' };
            await expect(service.getGeneratedTemplate(input)).rejects.toThrow(error);
        });
    });

    describe('create()', () => {
        it('should create IacGeneratorService instance with server components', () => {
            const service = IacGeneratorService.create(mockServerComponents);

            expect(service).toBeInstanceOf(IacGeneratorService);
        });
    });

    describe('error handling', () => {
        it('should throw error when client creation fails', async () => {
            mockGetCloudFormationClient.mockImplementation(() => {
                throw new Error('Failed to create AWS CloudFormation client');
            });

            await expect(service.startResourceScan()).rejects.toThrow('Failed to create AWS CloudFormation client');
        });
    });
});
