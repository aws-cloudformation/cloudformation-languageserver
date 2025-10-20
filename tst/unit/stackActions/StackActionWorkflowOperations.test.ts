import { Change, ChangeSetType } from '@aws-sdk/client-cloudformation';
import { WaiterState } from '@smithy/util-waiter';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponseError } from 'vscode-languageserver';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CfnService } from '../../../src/services/CfnService';
import {
    processChangeSet,
    waitForChangeSetValidation,
    waitForDeployment,
    deleteStackAndChangeSet,
    deleteChangeSet,
    mapChangesToStackChanges,
} from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateStackActionParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';
import { StackActionWorkflowState } from '../../../src/stacks/actions/StackActionWorkflowType';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';

vi.mock('../../../src/utils/Retry', () => ({
    retryWithExponentialBackoff: vi.fn(),
}));

describe('StackActionWorkflowOperations', () => {
    let mockCfnService: CfnService;
    let mockDocumentManager: DocumentManager;

    beforeEach(() => {
        mockCfnService = {
            createChangeSet: vi.fn(),
            describeChangeSet: vi.fn(),
            deleteChangeSet: vi.fn(),
            waitUntilChangeSetCreateComplete: vi.fn(),
            waitUntilStackUpdateComplete: vi.fn(),
            waitUntilStackCreateComplete: vi.fn(),
            deleteStack: vi.fn(),
        } as any;

        mockDocumentManager = {
            get: vi.fn(),
        } as any;

        vi.clearAllMocks();
    });

    describe('processChangeSet', () => {
        it('should create change set successfully', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            (mockDocumentManager.get as any).mockReturnValue({
                contents: () => 'template content',
            });

            (mockCfnService.createChangeSet as any).mockResolvedValue({
                Id: 'changeset-123',
            });

            const result = await processChangeSet(mockCfnService, mockDocumentManager, params, 'CREATE');

            expect(result).toContain('AWS-CloudFormation');
            expect(mockCfnService.createChangeSet).toHaveBeenCalledWith({
                StackName: 'test-stack',
                ChangeSetName: expect.stringContaining(ExtensionName.replaceAll(' ', '-')),
                TemplateBody: 'template content',
                Parameters: undefined,
                Capabilities: undefined,
                ChangeSetType: 'CREATE',
            });
        });

        it('should throw error when document not found', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///missing.yaml',
                stackName: 'test-stack',
            };

            (mockDocumentManager.get as any).mockReturnValue(undefined);

            await expect(processChangeSet(mockCfnService, mockDocumentManager, params, 'CREATE')).rejects.toThrow(
                ResponseError,
            );
        });
    });

    describe('waitForDeployment', () => {
        it('should return successful deployment result', async () => {
            (mockCfnService.waitUntilStackCreateComplete as any).mockResolvedValue({
                state: WaiterState.SUCCESS,
            });

            const result = await waitForDeployment(mockCfnService, 'test-stack', ChangeSetType.CREATE);

            expect(result).toEqual({
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                reason: undefined,
            });
            expect(mockCfnService.waitUntilStackCreateComplete).toHaveBeenCalledWith({
                StackName: 'test-stack',
            });
        });

        it('should return failed deployment result', async () => {
            (mockCfnService.waitUntilStackCreateComplete as any).mockResolvedValue({
                state: WaiterState.FAILURE,
            });

            const result = await waitForDeployment(mockCfnService, 'test-stack', ChangeSetType.CREATE);

            expect(result).toEqual({
                phase: StackActionPhase.DEPLOYMENT_FAILED,
                state: StackActionState.FAILED,
                reason: undefined,
            });
        });

        it('should use UPDATE waiter for UPDATE changeset type', async () => {
            (mockCfnService.waitUntilStackUpdateComplete as any).mockResolvedValue({
                state: WaiterState.SUCCESS,
            });

            const result = await waitForDeployment(mockCfnService, 'test-stack', ChangeSetType.UPDATE);

            expect(result).toEqual({
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                reason: undefined,
            });
            expect(mockCfnService.waitUntilStackUpdateComplete).toHaveBeenCalledWith({
                StackName: 'test-stack',
            });
        });
    });

    describe('deleteStackAndChangeSet', () => {
        it('should call retryWithExponentialBackoff with correct parameters', async () => {
            const { retryWithExponentialBackoff } = await import('../../../src/utils/Retry');
            (retryWithExponentialBackoff as any).mockResolvedValue(undefined);

            const workflow: StackActionWorkflowState = {
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
                phase: StackActionPhase.VALIDATION_COMPLETE,
                startTime: Date.now(),
                state: StackActionState.SUCCESSFUL,
            };

            await deleteStackAndChangeSet(mockCfnService, workflow, 'workflow-id');

            expect(retryWithExponentialBackoff).toHaveBeenCalledWith(
                expect.any(Function),
                {
                    maxRetries: 3,
                    initialDelayMs: 1000,
                    operationName: 'Delete change set changeset-123',
                },
                expect.any(Object), // logger
            );
        });
    });

    describe('deleteChangeSet', () => {
        it('should delete changeset only', async () => {
            const { retryWithExponentialBackoff } = await import('../../../src/utils/Retry');
            (retryWithExponentialBackoff as any).mockResolvedValue(undefined);

            const workflow: StackActionWorkflowState = {
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
                phase: StackActionPhase.VALIDATION_COMPLETE,
                startTime: Date.now(),
                state: StackActionState.SUCCESSFUL,
            };

            await deleteChangeSet(mockCfnService, workflow, 'workflow-id');

            expect(retryWithExponentialBackoff).toHaveBeenCalledWith(
                expect.any(Function),
                {
                    maxRetries: 3,
                    initialDelayMs: 1000,
                    operationName: 'Delete change set changeset-123',
                },
                expect.any(Object), // logger
            );
        });
    });

    describe('mapChangesToStackChanges', () => {
        it('should map AWS SDK changes to stack changes', () => {
            const changes: Change[] = [
                {
                    Type: 'Resource',
                    ResourceChange: {
                        Action: 'Add',
                        LogicalResourceId: 'TestBucket',
                        PhysicalResourceId: 'test-bucket-123',
                        ResourceType: 'AWS::S3::Bucket',
                        Replacement: 'False',
                        Scope: ['Properties'],
                        Details: [
                            {
                                Target: {
                                    Attribute: 'BucketName' as any,
                                    Name: 'TestBucket',
                                    RequiresRecreation: 'Never',
                                },
                            },
                        ],
                    },
                },
            ];

            const result = mapChangesToStackChanges(changes);

            expect(result).toHaveLength(1);
            expect(result![0]).toEqual({
                type: 'Resource',
                resourceChange: {
                    action: 'Add',
                    logicalResourceId: 'TestBucket',
                    physicalResourceId: 'test-bucket-123',
                    resourceType: 'AWS::S3::Bucket',
                    replacement: 'False',
                    scope: ['Properties'],
                    details: [
                        {
                            Target: {
                                Attribute: 'BucketName',
                                Name: 'TestBucket',
                                RequiresRecreation: 'Never',
                            },
                        },
                    ],
                },
            });
        });

        it('should handle undefined changes', () => {
            const result = mapChangesToStackChanges(undefined);
            expect(result).toBeUndefined();
        });

        it('should handle empty changes array', () => {
            const result = mapChangesToStackChanges([]);
            expect(result).toEqual([]);
        });
    });

    describe('waitForValidation', () => {
        it('should return successful result when changeset creation succeeds', async () => {
            (mockCfnService.waitUntilChangeSetCreateComplete as any).mockResolvedValue({
                state: WaiterState.SUCCESS,
            });

            (mockCfnService.describeChangeSet as any).mockResolvedValue({
                Changes: [
                    {
                        Type: 'Resource',
                        ResourceChange: {
                            Action: 'Add',
                            LogicalResourceId: 'TestBucket',
                        },
                    },
                ],
            });

            const result = await waitForChangeSetValidation(mockCfnService, 'test-changeset', 'test-stack');

            expect(result.phase).toBe(StackActionPhase.VALIDATION_COMPLETE);
            expect(result.state).toBe(StackActionState.SUCCESSFUL);
            expect(result.changes).toBeDefined();
            expect(mockCfnService.waitUntilChangeSetCreateComplete).toHaveBeenCalledWith({
                ChangeSetName: 'test-changeset',
                StackName: 'test-stack',
            });
            expect(mockCfnService.describeChangeSet).toHaveBeenCalledWith({
                ChangeSetName: 'test-changeset',
                StackName: 'test-stack',
                IncludePropertyValues: true,
            });
        });

        it('should return failed result when changeset creation fails', async () => {
            (mockCfnService.waitUntilChangeSetCreateComplete as any).mockResolvedValue({
                state: WaiterState.FAILURE,
                reason: 'Test failure',
            });

            const result = await waitForChangeSetValidation(mockCfnService, 'test-changeset', 'test-stack');

            expect(result.phase).toBe(StackActionPhase.VALIDATION_FAILED);
            expect(result.state).toBe(StackActionState.FAILED);
            expect(result.failureReason).toBe('Test failure');
        });

        it('should handle exceptions with error message', async () => {
            (mockCfnService.waitUntilChangeSetCreateComplete as any).mockRejectedValue(new Error('Network error'));

            const result = await waitForChangeSetValidation(mockCfnService, 'test-changeset', 'test-stack');

            expect(result.phase).toBe(StackActionPhase.VALIDATION_FAILED);
            expect(result.state).toBe(StackActionState.FAILED);
            expect(result.failureReason).toBe('Network error');
        });

        it('should handle non-Error exceptions', async () => {
            (mockCfnService.waitUntilChangeSetCreateComplete as any).mockRejectedValue('String error');

            const result = await waitForChangeSetValidation(mockCfnService, 'test-changeset', 'test-stack');

            expect(result.phase).toBe(StackActionPhase.VALIDATION_FAILED);
            expect(result.state).toBe(StackActionState.FAILED);
            expect(result.failureReason).toBe('String error');
        });
    });
});
