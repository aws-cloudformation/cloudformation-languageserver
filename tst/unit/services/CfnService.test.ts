import {
    CloudFormationClient,
    ListStacksCommand,
    CreateStackCommand,
    DescribeStacksCommand,
    CreateChangeSetCommand,
    DescribeChangeSetCommand,
    DeleteChangeSetCommand,
    DeleteStackCommand,
    DetectStackDriftCommand,
    DescribeStackEventsCommand,
    DescribeStackResourcesCommand,
    DescribeStackResourceCommand,
    ListStackResourcesCommand,
    DescribeStackResourceDriftsCommand,
    CloudFormationServiceException,
    StackStatus,
    StackNotFoundException,
    InsufficientCapabilitiesException,
    ChangeSetNotFoundException,
    waitUntilChangeSetCreateComplete,
    waitUntilStackUpdateComplete,
    waitUntilStackCreateComplete,
} from '@aws-sdk/client-cloudformation';
import { WaiterState } from '@smithy/util-waiter';
import { mockClient } from 'aws-sdk-client-mock';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AwsClient } from '../../../src/services/AwsClient';
import { CfnService } from '../../../src/services/CfnService';
import { TEST_CONSTANTS, MOCK_RESPONSES } from './CfnServiceTestConstants';

// Mock the waiter functions
vi.mock('@aws-sdk/client-cloudformation', async () => {
    const actual = await vi.importActual('@aws-sdk/client-cloudformation');
    return {
        ...actual,
        waitUntilChangeSetCreateComplete: vi.fn(),
        waitUntilStackUpdateComplete: vi.fn(),
        waitUntilStackCreateComplete: vi.fn(),
    };
});

const cloudFormationMock = mockClient(CloudFormationClient);

const mockGetCloudFormationClient = vi.fn();

// Create a mock AwsApiClientComponent instance
const mockClientComponent = {
    getCloudFormationClient: mockGetCloudFormationClient,
} as unknown as AwsClient;

describe('CfnService', () => {
    let service: CfnService;

    beforeEach(() => {
        vi.clearAllMocks();
        cloudFormationMock.reset();
        mockGetCloudFormationClient.mockReturnValue(new CloudFormationClient({}));

        service = new CfnService(mockClientComponent);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should pass region parameter to AwsClient', async () => {
        cloudFormationMock.on(ListStacksCommand).resolves({ StackSummaries: [] });

        await service.listStacks(undefined, undefined, 'eu-central-1');

        expect(mockGetCloudFormationClient).toHaveBeenCalledWith('eu-central-1');
    });

    const createStackNotFoundError = () =>
        new StackNotFoundException({
            message: TEST_CONSTANTS.ERROR_MESSAGES.STACK_NOT_FOUND,
            $metadata: { httpStatusCode: 404 },
        });

    const createInsufficientCapabilitiesError = () =>
        new InsufficientCapabilitiesException({
            message: TEST_CONSTANTS.ERROR_MESSAGES.ACCESS_DENIED,
            $metadata: { httpStatusCode: 403 },
        });

    const createChangeSetNotFoundError = () =>
        new ChangeSetNotFoundException({
            message: TEST_CONSTANTS.ERROR_MESSAGES.CHANGESET_NOT_FOUND,
            $metadata: { httpStatusCode: 404 },
        });

    const createCloudFormationServiceError = () =>
        new CloudFormationServiceException({
            message: 'CloudFormation service error',
            $metadata: { httpStatusCode: 500 },
            name: 'CloudFormationServiceException',
            $fault: 'server',
        });

    describe('listStacks()', () => {
        it('should successfully call listStacks and return response', async () => {
            cloudFormationMock.on(ListStacksCommand).resolves(MOCK_RESPONSES.LIST_STACKS);

            const result = await service.listStacks();
            expect(result).toEqual(MOCK_RESPONSES.LIST_STACKS.StackSummaries);
        });

        it('should throw CloudFormationServiceException when API call fails', async () => {
            const error = createCloudFormationServiceError();
            cloudFormationMock.on(ListStacksCommand).rejects(error);

            await expect(service.listStacks()).rejects.toThrow(error);
        });

        it('should pass statusToInclude filter to API', async () => {
            cloudFormationMock.on(ListStacksCommand).resolves(MOCK_RESPONSES.LIST_STACKS);

            await service.listStacks([StackStatus.CREATE_COMPLETE]);

            expect(cloudFormationMock.commandCalls(ListStacksCommand)[0].args[0].input).toEqual({
                NextToken: undefined,
                StackStatusFilter: [StackStatus.CREATE_COMPLETE],
            });
        });

        it('should convert statusToExclude to inclusion filter for API', async () => {
            cloudFormationMock.on(ListStacksCommand).resolves(MOCK_RESPONSES.LIST_STACKS);

            await service.listStacks(undefined, [StackStatus.DELETE_COMPLETE]);

            const expectedIncludeStatuses = Object.values(StackStatus).filter(
                (status) => status !== StackStatus.DELETE_COMPLETE,
            );
            expect(cloudFormationMock.commandCalls(ListStacksCommand)[0].args[0].input).toEqual({
                NextToken: undefined,
                StackStatusFilter: expectedIncludeStatuses,
            });
        });
    });

    describe('createStack()', () => {
        it('should successfully call createStack and return response', async () => {
            cloudFormationMock.on(CreateStackCommand).resolves(MOCK_RESPONSES.CREATE_STACK);

            const result = await service.createStack({
                StackName: TEST_CONSTANTS.STACK_NAME,
                TemplateBody: TEST_CONSTANTS.TEMPLATE_BODY,
            });

            expect(result).toEqual(MOCK_RESPONSES.CREATE_STACK);
        });

        it('should throw InsufficientCapabilitiesException when API call fails', async () => {
            const error = createInsufficientCapabilitiesError();
            cloudFormationMock.on(CreateStackCommand).rejects(error);

            await expect(
                service.createStack({
                    StackName: TEST_CONSTANTS.STACK_NAME,
                    TemplateBody: TEST_CONSTANTS.TEMPLATE_BODY,
                }),
            ).rejects.toThrow(error);
        });
    });

    describe('describeStacks()', () => {
        it('should successfully call describeStacks and return response', async () => {
            cloudFormationMock.on(DescribeStacksCommand).resolves(MOCK_RESPONSES.DESCRIBE_STACKS);

            const result = await service.describeStacks();

            expect(result).toEqual(MOCK_RESPONSES.DESCRIBE_STACKS);
        });

        it('should throw StackNotFoundException when API call fails', async () => {
            const error = createStackNotFoundError();
            cloudFormationMock.on(DescribeStacksCommand).rejects(error);

            await expect(service.describeStacks({ StackName: TEST_CONSTANTS.STACK_NAME })).rejects.toThrow(error);
        });

        it('should use custom parameters when provided', async () => {
            cloudFormationMock.on(DescribeStacksCommand).resolves(MOCK_RESPONSES.DESCRIBE_STACKS);

            const result = await service.describeStacks({
                StackName: TEST_CONSTANTS.STACK_NAME,
                NextToken: TEST_CONSTANTS.NEXT_TOKEN,
            });

            expect(result).toEqual(MOCK_RESPONSES.DESCRIBE_STACKS);
        });
    });

    describe('createChangeSet()', () => {
        it('should successfully call createChangeSet and return response', async () => {
            cloudFormationMock.on(CreateChangeSetCommand).resolves(MOCK_RESPONSES.CREATE_CHANGE_SET);

            const result = await service.createChangeSet({
                StackName: TEST_CONSTANTS.STACK_NAME,
                ChangeSetName: TEST_CONSTANTS.CHANGE_SET_NAME,
                TemplateBody: TEST_CONSTANTS.TEMPLATE_BODY,
            });

            expect(result).toEqual(MOCK_RESPONSES.CREATE_CHANGE_SET);
        });

        it('should throw InsufficientCapabilitiesException when API call fails', async () => {
            const error = createInsufficientCapabilitiesError();
            cloudFormationMock.on(CreateChangeSetCommand).rejects(error);

            await expect(
                service.createChangeSet({
                    StackName: TEST_CONSTANTS.STACK_NAME,
                    ChangeSetName: TEST_CONSTANTS.CHANGE_SET_NAME,
                    TemplateBody: TEST_CONSTANTS.TEMPLATE_BODY,
                }),
            ).rejects.toThrow(error);
        });
    });

    describe('describeChangeSet()', () => {
        it('should successfully call describeChangeSet and return response', async () => {
            cloudFormationMock.on(DescribeChangeSetCommand).resolves(MOCK_RESPONSES.DESCRIBE_CHANGE_SET);

            const result = await service.describeChangeSet({
                StackName: TEST_CONSTANTS.STACK_NAME,
                ChangeSetName: TEST_CONSTANTS.CHANGE_SET_NAME,
                IncludePropertyValues: true,
            });

            expect(result).toEqual(MOCK_RESPONSES.DESCRIBE_CHANGE_SET);
        });

        it('should fetch all pages when paginated', async () => {
            const page1 = {
                ...MOCK_RESPONSES.DESCRIBE_CHANGE_SET,
                Changes: [
                    { Type: 'Resource' as const, ResourceChange: { LogicalResourceId: 'Resource1' } },
                    { Type: 'Resource' as const, ResourceChange: { LogicalResourceId: 'Resource2' } },
                    { Type: 'Resource' as const, ResourceChange: { LogicalResourceId: 'Resource3' } },
                ],
                NextToken: 'token1',
            };
            const page2 = {
                ...MOCK_RESPONSES.DESCRIBE_CHANGE_SET,
                Changes: [
                    { Type: 'Resource' as const, ResourceChange: { LogicalResourceId: 'Resource4' } },
                    { Type: 'Resource' as const, ResourceChange: { LogicalResourceId: 'Resource5' } },
                ],
                NextToken: 'token2',
            };
            const page3 = {
                ...MOCK_RESPONSES.DESCRIBE_CHANGE_SET,
                Changes: [{ Type: 'Resource' as const, ResourceChange: { LogicalResourceId: 'Resource6' } }],
                NextToken: undefined,
            };

            cloudFormationMock.on(DescribeChangeSetCommand).resolvesOnce(page1).resolvesOnce(page2).resolvesOnce(page3);

            const result = await service.describeChangeSet({
                StackName: TEST_CONSTANTS.STACK_NAME,
                ChangeSetName: TEST_CONSTANTS.CHANGE_SET_NAME,
                IncludePropertyValues: true,
            });

            expect(result.Changes).toHaveLength(6);
            expect(result.Changes?.[0].ResourceChange?.LogicalResourceId).toBe('Resource1');
            expect(result.Changes?.[5].ResourceChange?.LogicalResourceId).toBe('Resource6');
            expect(result.NextToken).toBeUndefined();
        });

        it('should throw ChangeSetNotFoundException when API call fails', async () => {
            const error = createChangeSetNotFoundError();
            cloudFormationMock.on(DescribeChangeSetCommand).rejects(error);

            await expect(
                service.describeChangeSet({
                    StackName: TEST_CONSTANTS.STACK_NAME,
                    ChangeSetName: TEST_CONSTANTS.CHANGE_SET_NAME,
                    IncludePropertyValues: true,
                }),
            ).rejects.toThrow(error);
        });
    });

    describe('deleteChangeSet()', () => {
        it('should successfully call deleteChangeSet and return response', async () => {
            cloudFormationMock.on(DeleteChangeSetCommand).resolves(MOCK_RESPONSES.DELETE_CHANGE_SET);

            const result = await service.deleteChangeSet({
                ChangeSetName: TEST_CONSTANTS.CHANGE_SET_NAME,
                StackName: TEST_CONSTANTS.STACK_NAME,
            });

            expect(result).toEqual(MOCK_RESPONSES.DELETE_CHANGE_SET);
        });

        it('should throw ChangeSetNotFoundException when API call fails', async () => {
            const error = createChangeSetNotFoundError();
            cloudFormationMock.on(DeleteChangeSetCommand).rejects(error);

            await expect(
                service.deleteChangeSet({
                    ChangeSetName: TEST_CONSTANTS.CHANGE_SET_NAME,
                    StackName: TEST_CONSTANTS.STACK_NAME,
                }),
            ).rejects.toThrow(error);
        });
    });

    describe('detectStackDrift()', () => {
        it('should successfully call detectStackDrift and return response', async () => {
            cloudFormationMock.on(DetectStackDriftCommand).resolves(MOCK_RESPONSES.DETECT_STACK_DRIFT);

            const result = await service.detectStackDrift({
                StackName: TEST_CONSTANTS.STACK_NAME,
            });

            expect(result).toEqual(MOCK_RESPONSES.DETECT_STACK_DRIFT);
        });

        it('should throw StackNotFoundException when API call fails', async () => {
            const error = createStackNotFoundError();
            cloudFormationMock.on(DetectStackDriftCommand).rejects(error);

            await expect(
                service.detectStackDrift({
                    StackName: TEST_CONSTANTS.STACK_NAME,
                }),
            ).rejects.toThrow(error);
        });
    });

    describe('describeStackEvents()', () => {
        it('should successfully call describeStackEvents and return response', async () => {
            cloudFormationMock.on(DescribeStackEventsCommand).resolves(MOCK_RESPONSES.DESCRIBE_STACK_EVENTS);

            const result = await service.describeStackEvents(
                {
                    StackName: TEST_CONSTANTS.STACK_NAME,
                },
                'test-token',
            );

            expect(result).toEqual(MOCK_RESPONSES.DESCRIBE_STACK_EVENTS);
        });

        it('should fetch all pages when paginated', async () => {
            const page1 = {
                ...MOCK_RESPONSES.DESCRIBE_STACK_EVENTS,
                StackEvents: [
                    {
                        StackId: TEST_CONSTANTS.STACK_ID,
                        EventId: 'event-1',
                        StackName: TEST_CONSTANTS.STACK_NAME,
                        LogicalResourceId: 'Resource1',
                        ResourceStatus: 'CREATE_COMPLETE' as const,
                        Timestamp: new Date('2023-01-01T00:00:00Z'),
                        ClientRequestToken: 'test-token',
                    },
                    {
                        StackId: TEST_CONSTANTS.STACK_ID,
                        EventId: 'event-2',
                        StackName: TEST_CONSTANTS.STACK_NAME,
                        LogicalResourceId: 'Resource2',
                        ResourceStatus: 'CREATE_COMPLETE' as const,
                        Timestamp: new Date('2023-01-01T00:01:00Z'),
                        ClientRequestToken: 'test-token',
                    },
                ],
                NextToken: 'token1',
            };
            const page2 = {
                ...MOCK_RESPONSES.DESCRIBE_STACK_EVENTS,
                StackEvents: [
                    {
                        StackId: TEST_CONSTANTS.STACK_ID,
                        EventId: 'event-3',
                        StackName: TEST_CONSTANTS.STACK_NAME,
                        LogicalResourceId: 'Resource3',
                        ResourceStatus: 'CREATE_COMPLETE' as const,
                        Timestamp: new Date('2023-01-01T00:02:00Z'),
                        ClientRequestToken: 'test-token',
                    },
                ],
                NextToken: undefined,
            };

            cloudFormationMock.on(DescribeStackEventsCommand).resolvesOnce(page1).resolvesOnce(page2);

            const result = await service.describeStackEvents(
                {
                    StackName: TEST_CONSTANTS.STACK_NAME,
                },
                'test-token',
            );

            expect(result.StackEvents).toHaveLength(3);
            expect(result.StackEvents?.[0].EventId).toBe('event-1');
            expect(result.StackEvents?.[2].EventId).toBe('event-3');
            expect(result.NextToken).toBeUndefined();
        });

        it('should stop pagination when clientToken no longer matches', async () => {
            const page1 = {
                ...MOCK_RESPONSES.DESCRIBE_STACK_EVENTS,
                StackEvents: [
                    {
                        StackId: TEST_CONSTANTS.STACK_ID,
                        EventId: 'event-1',
                        StackName: TEST_CONSTANTS.STACK_NAME,
                        LogicalResourceId: 'Resource1',
                        ResourceStatus: 'CREATE_COMPLETE' as const,
                        Timestamp: new Date('2023-01-01T00:00:00Z'),
                        ClientRequestToken: 'test-token',
                    },
                    {
                        StackId: TEST_CONSTANTS.STACK_ID,
                        EventId: 'event-2',
                        StackName: TEST_CONSTANTS.STACK_NAME,
                        LogicalResourceId: 'Resource2',
                        ResourceStatus: 'CREATE_COMPLETE' as const,
                        Timestamp: new Date('2023-01-01T00:01:00Z'),
                        ClientRequestToken: 'test-token',
                    },
                ],
                NextToken: 'token1',
            };
            const page2 = {
                ...MOCK_RESPONSES.DESCRIBE_STACK_EVENTS,
                StackEvents: [
                    {
                        StackId: TEST_CONSTANTS.STACK_ID,
                        EventId: 'event-3',
                        StackName: TEST_CONSTANTS.STACK_NAME,
                        LogicalResourceId: 'Resource3',
                        ResourceStatus: 'CREATE_COMPLETE' as const,
                        Timestamp: new Date('2023-01-01T00:02:00Z'),
                        ClientRequestToken: 'test-token',
                    },
                    {
                        StackId: TEST_CONSTANTS.STACK_ID,
                        EventId: 'event-4',
                        StackName: TEST_CONSTANTS.STACK_NAME,
                        LogicalResourceId: 'Resource4',
                        ResourceStatus: 'CREATE_COMPLETE' as const,
                        Timestamp: new Date('2023-01-01T00:03:00Z'),
                        ClientRequestToken: 'different-token',
                    },
                ],
                NextToken: 'token2',
            };
            const page3 = {
                ...MOCK_RESPONSES.DESCRIBE_STACK_EVENTS,
                StackEvents: [
                    {
                        StackId: TEST_CONSTANTS.STACK_ID,
                        EventId: 'event-5',
                        StackName: TEST_CONSTANTS.STACK_NAME,
                        LogicalResourceId: 'Resource5',
                        ResourceStatus: 'CREATE_COMPLETE' as const,
                        Timestamp: new Date('2023-01-01T00:04:00Z'),
                        ClientRequestToken: 'different-token',
                    },
                    {
                        StackId: TEST_CONSTANTS.STACK_ID,
                        EventId: 'event-6',
                        StackName: TEST_CONSTANTS.STACK_NAME,
                        LogicalResourceId: 'Resource6',
                        ResourceStatus: 'CREATE_COMPLETE' as const,
                        Timestamp: new Date('2023-01-01T00:05:00Z'),
                        ClientRequestToken: 'different-token',
                    },
                ],
                NextToken: undefined,
            };

            cloudFormationMock
                .on(DescribeStackEventsCommand)
                .resolvesOnce(page1)
                .resolvesOnce(page2)
                .resolvesOnce(page3);

            const result = await service.describeStackEvents(
                {
                    StackName: TEST_CONSTANTS.STACK_NAME,
                },
                'test-token',
            );

            expect(result.StackEvents).toHaveLength(3); // Only events with matching token (event-1, event-2, event-3)
            expect(result.StackEvents?.[0].EventId).toBe('event-1');
            expect(result.StackEvents?.[1].EventId).toBe('event-2');
            expect(result.StackEvents?.[2].EventId).toBe('event-3');
            expect(result.NextToken).toBeUndefined();
            expect(cloudFormationMock.commandCalls(DescribeStackEventsCommand)).toHaveLength(3); // Should have made 3 calls
        });

        it('should throw StackNotFoundException when API call fails', async () => {
            const error = createStackNotFoundError();
            cloudFormationMock.on(DescribeStackEventsCommand).rejects(error);

            await expect(
                service.describeStackEvents(
                    {
                        StackName: TEST_CONSTANTS.STACK_NAME,
                    },
                    'test-token',
                ),
            ).rejects.toThrow(error);
        });
    });

    describe('describeStackResources()', () => {
        it('should successfully call describeStackResources and return response', async () => {
            cloudFormationMock.on(DescribeStackResourcesCommand).resolves(MOCK_RESPONSES.DESCRIBE_STACK_RESOURCES);

            const result = await service.describeStackResources({
                StackName: TEST_CONSTANTS.STACK_NAME,
            });

            expect(result).toEqual(MOCK_RESPONSES.DESCRIBE_STACK_RESOURCES);
        });

        it('should throw StackNotFoundException when API call fails', async () => {
            const error = createStackNotFoundError();
            cloudFormationMock.on(DescribeStackResourcesCommand).rejects(error);

            await expect(
                service.describeStackResources({
                    StackName: TEST_CONSTANTS.STACK_NAME,
                }),
            ).rejects.toThrow(error);
        });
    });

    describe('describeStackResource()', () => {
        it('should successfully call describeStackResource and return response', async () => {
            cloudFormationMock.on(DescribeStackResourceCommand).resolves(MOCK_RESPONSES.DESCRIBE_STACK_RESOURCE);

            const result = await service.describeStackResource({
                StackName: TEST_CONSTANTS.STACK_NAME,
                LogicalResourceId: TEST_CONSTANTS.LOGICAL_RESOURCE_ID,
            });

            expect(result).toEqual(MOCK_RESPONSES.DESCRIBE_STACK_RESOURCE);
        });

        it('should throw StackNotFoundException when API call fails', async () => {
            const error = createStackNotFoundError();
            cloudFormationMock.on(DescribeStackResourceCommand).rejects(error);

            await expect(
                service.describeStackResource({
                    StackName: TEST_CONSTANTS.STACK_NAME,
                    LogicalResourceId: TEST_CONSTANTS.LOGICAL_RESOURCE_ID,
                }),
            ).rejects.toThrow(error);
        });
    });

    describe('listStackResources()', () => {
        it('should successfully call listStackResources and return response', async () => {
            cloudFormationMock.on(ListStackResourcesCommand).resolves(MOCK_RESPONSES.LIST_STACK_RESOURCES);

            const result = await service.listStackResources({
                StackName: TEST_CONSTANTS.STACK_NAME,
            });

            expect(result).toEqual(MOCK_RESPONSES.LIST_STACK_RESOURCES);
        });

        it('should throw StackNotFoundException when API call fails', async () => {
            const error = createStackNotFoundError();
            cloudFormationMock.on(ListStackResourcesCommand).rejects(error);

            await expect(
                service.listStackResources({
                    StackName: TEST_CONSTANTS.STACK_NAME,
                }),
            ).rejects.toThrow(error);
        });
    });

    describe('describeStackResourceDrifts()', () => {
        it('should successfully call describeStackResourceDrifts and return response', async () => {
            cloudFormationMock
                .on(DescribeStackResourceDriftsCommand)
                .resolves(MOCK_RESPONSES.DESCRIBE_STACK_RESOURCE_DRIFTS);

            const result = await service.describeStackResourceDrifts({
                StackName: TEST_CONSTANTS.STACK_NAME,
            });

            expect(result).toEqual(MOCK_RESPONSES.DESCRIBE_STACK_RESOURCE_DRIFTS);
        });

        it('should throw StackNotFoundException when API call fails', async () => {
            const error = createStackNotFoundError();
            cloudFormationMock.on(DescribeStackResourceDriftsCommand).rejects(error);

            await expect(
                service.describeStackResourceDrifts({
                    StackName: TEST_CONSTANTS.STACK_NAME,
                }),
            ).rejects.toThrow(error);
        });
    });

    describe('waitUntilChangeSetCreateComplete', () => {
        it('should call waitUntilChangeSetCreateComplete with correct parameters and timeout', async () => {
            const mockWaiterResult = { state: WaiterState.SUCCESS };
            vi.mocked(waitUntilChangeSetCreateComplete).mockResolvedValue(mockWaiterResult);

            const params = { ChangeSetName: 'test-changeset', StackName: 'test-stack' };
            const result = await service.waitUntilChangeSetCreateComplete(params, 10);

            expect(waitUntilChangeSetCreateComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    client: expect.any(Object),
                    maxWaitTime: 600, // 10 minutes * 60 seconds
                }),
                params,
            );
            expect(result).toEqual(mockWaiterResult);
        });

        it('should use default timeout of 5 minutes when not specified', async () => {
            const mockWaiterResult = { state: WaiterState.SUCCESS };
            vi.mocked(waitUntilChangeSetCreateComplete).mockResolvedValue(mockWaiterResult);

            const params = { ChangeSetName: 'test-changeset' };
            const result = await service.waitUntilChangeSetCreateComplete(params);

            expect(waitUntilChangeSetCreateComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    maxWaitTime: 300, // 5 minutes * 60 seconds
                }),
                params,
            );
            expect(result).toEqual(mockWaiterResult);
        });
    });

    describe('waitUntilStackUpdateComplete', () => {
        it('should call waitUntilStackUpdateComplete with correct parameters and timeout', async () => {
            const mockWaiterResult = { state: WaiterState.SUCCESS };
            vi.mocked(waitUntilStackUpdateComplete).mockResolvedValue(mockWaiterResult);

            const params = { StackName: 'test-stack' };
            const result = await service.waitUntilStackUpdateComplete(params, 60);

            expect(waitUntilStackUpdateComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    client: expect.any(Object),
                    maxWaitTime: 3600, // 60 minutes * 60 seconds
                }),
                params,
            );
            expect(result).toEqual(mockWaiterResult);
        });

        it('should use default timeout of 30 minutes when not specified', async () => {
            const mockWaiterResult = { state: WaiterState.SUCCESS };
            vi.mocked(waitUntilStackUpdateComplete).mockResolvedValue(mockWaiterResult);

            const params = { StackName: 'test-stack' };
            const result = await service.waitUntilStackUpdateComplete(params);

            expect(waitUntilStackUpdateComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    maxWaitTime: 1800, // 30 minutes * 60 seconds
                }),
                params,
            );
            expect(result).toEqual(mockWaiterResult);
        });
    });

    describe('deleteStack', () => {
        it('should call DeleteStackCommand with correct parameters', async () => {
            const params = { StackName: 'test-stack' };
            const mockResponse = { StackId: 'stack-id', $metadata: {} };

            cloudFormationMock.on(DeleteStackCommand).resolves(mockResponse);

            const result = await service.deleteStack(params);

            expect(result).toBe(mockResponse);
        });
    });

    describe('waitUntilStackCreateComplete', () => {
        it('should wait for stack creation to complete with default timeout', async () => {
            const params = { StackName: 'test-stack' };
            const mockWaiterResult = { state: WaiterState.SUCCESS };

            vi.mocked(waitUntilStackCreateComplete).mockResolvedValue(mockWaiterResult);

            const result = await service.waitUntilStackCreateComplete(params);

            expect(waitUntilStackCreateComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    client: expect.any(Object),
                    maxWaitTime: 1800, // 30 minutes * 60 seconds
                }),
                params,
            );
            expect(result).toBe(mockWaiterResult);
        });

        it('should use custom timeout when provided', async () => {
            const params = { StackName: 'test-stack' };
            const timeoutMinutes = 15;
            const mockWaiterResult = { state: WaiterState.SUCCESS };

            vi.mocked(waitUntilStackCreateComplete).mockResolvedValue(mockWaiterResult);

            const result = await service.waitUntilStackCreateComplete(params, timeoutMinutes);

            expect(waitUntilStackCreateComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    maxWaitTime: timeoutMinutes * 60,
                }),
                params,
            );
            expect(result).toBe(mockWaiterResult);
        });
    });

    describe('should throw if client creation fails', () => {
        it('should throw error when AwsApiClientComponent throws during client creation', async () => {
            mockGetCloudFormationClient.mockImplementation(() => {
                throw new Error('Failed to create AWS CloudFormation client');
            });

            await expect(service.listStacks()).rejects.toThrow('Failed to create AWS CloudFormation client');
        });
    });
});
