import { CloudFormationServiceException } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StackManagementInfoProvider } from '../../../src/resourceState/StackManagementInfoProvider';
import { CfnService } from '../../../src/services/CfnService';

describe('StackManagementInfoProvider', () => {
    let mockCfnService: CfnService;
    let provider: StackManagementInfoProvider;

    beforeEach(() => {
        mockCfnService = {
            describeStackResources: vi.fn(),
        } as unknown as CfnService;
        provider = new StackManagementInfoProvider(mockCfnService);
    });

    describe('getResourceManagementState', () => {
        const physicalResourceId = 'test-resource-id';

        it('returns managed state when resource is found in stack', async () => {
            const mockResponse = {
                StackResources: [
                    {
                        StackName: 'test-stack',
                        StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/12345',
                        PhysicalResourceId: physicalResourceId,
                        LogicalResourceId: 'TestResource',
                        ResourceType: 'AWS::S3::Bucket',
                        ResourceStatus: 'CREATE_COMPLETE',
                        Timestamp: new Date(),
                    },
                ],
            } as any;

            vi.mocked(mockCfnService.describeStackResources).mockResolvedValue(mockResponse);

            const result = await provider.getResourceManagementState(physicalResourceId);

            expect(result).toEqual({
                physicalResourceId,
                managedByStack: true,
                stackName: 'test-stack',
                stackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/12345',
            });
            expect(mockCfnService.describeStackResources).toHaveBeenCalledWith({
                PhysicalResourceId: physicalResourceId,
            });
        });

        it('returns unmanaged state when ValidationError indicates resource not in stack', async () => {
            const error = new CloudFormationServiceException({
                name: 'ValidationError',
                message: `Stack for ${physicalResourceId} does not exist`,
                $fault: 'client',
                $metadata: {},
            });

            vi.mocked(mockCfnService.describeStackResources).mockRejectedValue(error);

            const result = await provider.getResourceManagementState(physicalResourceId);

            expect(result).toEqual({
                physicalResourceId,
                managedByStack: false,
                error: `Stack for ${physicalResourceId} does not exist`,
            });
        });

        it('returns undefined state when unexpected CloudFormation error occurs', async () => {
            const error = new CloudFormationServiceException({
                name: 'AccessDenied',
                message: 'Access denied',
                $fault: 'client',
                $metadata: {},
            });

            vi.mocked(mockCfnService.describeStackResources).mockRejectedValue(error);

            const result = await provider.getResourceManagementState(physicalResourceId);

            expect(result).toEqual({
                physicalResourceId,
                managedByStack: undefined,
                error: 'Unexpected response from CloudFormation Describe Stack Resources with empty resource list',
            });
        });

        it('returns undefined state when non-CloudFormation error occurs', async () => {
            const error = new Error('Network error');
            vi.mocked(mockCfnService.describeStackResources).mockRejectedValue(error);

            const result = await provider.getResourceManagementState(physicalResourceId);

            expect(result).toEqual({
                physicalResourceId,
                managedByStack: undefined,
                error: 'Unexpected response from CloudFormation Describe Stack Resources with empty resource list',
            });
        });

        it('returns undefined state when response has empty StackResources array', async () => {
            const mockResponse = {
                StackResources: [],
            } as any;

            vi.mocked(mockCfnService.describeStackResources).mockResolvedValue(mockResponse);

            const result = await provider.getResourceManagementState(physicalResourceId);

            expect(result).toEqual({
                physicalResourceId,
                managedByStack: undefined,
                error: 'Unexpected response from CloudFormation Describe Stack Resources with empty resource list',
            });
        });

        it('returns undefined state when response has undefined StackResources', async () => {
            const mockResponse = {
                StackResources: undefined,
            } as any;

            vi.mocked(mockCfnService.describeStackResources).mockResolvedValue(mockResponse);

            const result = await provider.getResourceManagementState(physicalResourceId);

            expect(result).toEqual({
                physicalResourceId,
                managedByStack: undefined,
                error: 'Unexpected response from CloudFormation Describe Stack Resources with empty resource list',
            });
        });

        it('handles ValidationError with different message format', async () => {
            const error = new CloudFormationServiceException({
                name: 'ValidationError',
                message: 'Different validation error message',
                $fault: 'client',
                $metadata: {},
            });

            vi.mocked(mockCfnService.describeStackResources).mockRejectedValue(error);

            const result = await provider.getResourceManagementState(physicalResourceId);

            expect(result).toEqual({
                physicalResourceId,
                managedByStack: undefined,
                error: 'Unexpected response from CloudFormation Describe Stack Resources with empty resource list',
            });
        });
    });
});
