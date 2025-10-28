import { WaiterState } from '@smithy/util-waiter';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { Identifiable } from '../../../src/protocol/LspTypes';
import { CfnService } from '../../../src/services/CfnService';
import { ChangeSetDeletionWorkflow } from '../../../src/stacks/actions/ChangeSetDeletionWorkflow';
import { isStackInReview, mapChangesToStackChanges } from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateDeploymentParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';

vi.mock('../../../src/stacks/actions/StackActionOperations', async () => {
    const actual = await vi.importActual('../../../src/stacks/actions/StackActionOperations');
    return {
        ...actual,
        isStackInReview: vi.fn(),
        mapChangesToStackChanges: vi.fn(),
    };
});

describe('ChangeSetDeletionWorkflow', () => {
    let deletionWorkflow: ChangeSetDeletionWorkflow;
    let mockCfnService: CfnService;
    let mockDocumentManager: DocumentManager;

    const testId = 'test-id';
    const testStackName = 'test-stack';
    const testChangeSetName = 'test-change-set-name';

    const testCreateDeploymentParams: CreateDeploymentParams = {
        id: testId,
        stackName: testStackName,
        changeSetName: testChangeSetName,
    };

    const testIdentifiableParams: Identifiable = {
        id: testId,
    };

    beforeEach(() => {
        mockCfnService = {
            describeChangeSet: vi.fn(),
            deleteChangeSet: vi.fn(),
            deleteStack: vi.fn(),
            waitUntilStackDeleteComplete: vi.fn(),
            listChangeSets: vi.fn(),
        } as any;
        mockDocumentManager = {} as DocumentManager;
        deletionWorkflow = new ChangeSetDeletionWorkflow(mockCfnService, mockDocumentManager);

        vi.clearAllMocks();
    });

    describe('start', () => {
        it('should delete changeset when stack has multiple changesets', async () => {
            const mockChanges = [{ Action: 'Add', ResourceType: 'AWS::S3::Bucket' }];
            const mockMappedChanges = [
                { type: 'Resource', resourceChange: { action: 'Add', logicalResourceId: 'MyBucket' } },
            ];

            mockCfnService.describeChangeSet = vi.fn().mockResolvedValue({ Changes: mockChanges });
            mockCfnService.deleteChangeSet = vi.fn().mockResolvedValue({});
            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }, { ChangeSetName: 'changeset2' }],
            });
            (isStackInReview as any).mockResolvedValue(true);
            (mapChangesToStackChanges as any).mockReturnValue(mockMappedChanges);

            const result = await deletionWorkflow.start(testCreateDeploymentParams);

            expect(mockCfnService.deleteChangeSet).toHaveBeenCalledWith({
                StackName: testStackName,
                ChangeSetName: testChangeSetName,
            });
            expect(mockCfnService.deleteStack).not.toHaveBeenCalled();
            expect(result).toEqual(testCreateDeploymentParams);
        });

        it('should delete stack when it has only one changeset', async () => {
            const mockChanges = [{ Action: 'Add', ResourceType: 'AWS::S3::Bucket' }];
            const mockMappedChanges = [
                { type: 'Resource', resourceChange: { action: 'Add', logicalResourceId: 'MyBucket' } },
            ];

            mockCfnService.describeChangeSet = vi.fn().mockResolvedValue({ Changes: mockChanges });
            mockCfnService.deleteStack = vi.fn().mockResolvedValue({});
            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }],
            });
            (isStackInReview as any).mockResolvedValue(true);
            (mapChangesToStackChanges as any).mockReturnValue(mockMappedChanges);

            const result = await deletionWorkflow.start(testCreateDeploymentParams);

            expect(mockCfnService.deleteStack).toHaveBeenCalledWith({
                StackName: testStackName,
            });
            expect(mockCfnService.deleteChangeSet).not.toHaveBeenCalled();
            expect(result).toEqual(testCreateDeploymentParams);
        });
    });

    describe('getStatus', () => {
        it('should get workflow status', () => {
            const workflow = {
                id: testId,
                changeSetName: testChangeSetName,
                stackName: testStackName,
                phase: StackActionPhase.DELETION_IN_PROGRESS,
                startTime: Date.now(),
                state: StackActionState.IN_PROGRESS,
            };

            (deletionWorkflow as any).workflows.set(testId, workflow);

            const result = deletionWorkflow.getStatus(testIdentifiableParams);

            expect(result).toEqual({
                phase: StackActionPhase.DELETION_IN_PROGRESS,
                state: StackActionState.IN_PROGRESS,
                changes: undefined,
                id: testId,
            });
        });

        it('should throw error when workflow not found', () => {
            expect(() => deletionWorkflow.getStatus({ id: 'nonexistent-id' })).toThrow(
                'Workflow not found: nonexistent-id',
            );
        });
    });

    describe('describeStatus', () => {
        it('should return workflow status with failure reason', () => {
            const workflow = {
                id: testId,
                changeSetName: testChangeSetName,
                stackName: testStackName,
                phase: StackActionPhase.DELETION_FAILED,
                startTime: Date.now(),
                state: StackActionState.FAILED,
                failureReason: 'Deletion failed',
            };

            (deletionWorkflow as any).workflows.set(testId, workflow);

            const result = deletionWorkflow.describeStatus(testIdentifiableParams);

            expect(result).toEqual({
                phase: StackActionPhase.DELETION_FAILED,
                state: StackActionState.FAILED,
                changes: undefined,
                id: testId,
                FailureReason: 'Deletion failed',
            });
        });
    });

    describe('changeset deletion polling', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should complete when changeset is not found', async () => {
            const mockChanges = [{ Action: 'Add', ResourceType: 'AWS::S3::Bucket' }];

            mockCfnService.describeChangeSet = vi
                .fn()
                .mockResolvedValueOnce({ Changes: mockChanges }) // Initial call in start()
                .mockRejectedValue(new Error('ChangeSetNotFound'));
            mockCfnService.deleteChangeSet = vi.fn().mockResolvedValue({});
            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }, { ChangeSetName: 'changeset2' }],
            });
            (isStackInReview as any).mockResolvedValue(true);
            (mapChangesToStackChanges as any).mockReturnValue([]);

            await deletionWorkflow.start(testCreateDeploymentParams);

            // Advance timer to trigger polling
            vi.advanceTimersByTime(2000);
            await vi.runAllTimersAsync();

            const workflow = (deletionWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.SUCCESSFUL);
            expect(workflow.phase).toBe(StackActionPhase.DELETION_COMPLETE);
        });

        it('should fail on timeout', async () => {
            const mockChanges = [{ Action: 'Add', ResourceType: 'AWS::S3::Bucket' }];

            mockCfnService.describeChangeSet = vi
                .fn()
                .mockResolvedValueOnce({ Changes: mockChanges }) // Initial call in start()
                .mockResolvedValue({}); // Polling calls - changeset still exists
            mockCfnService.deleteChangeSet = vi.fn().mockResolvedValue({});
            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }, { ChangeSetName: 'changeset2' }],
            });
            (isStackInReview as any).mockResolvedValue(true);
            (mapChangesToStackChanges as any).mockReturnValue([]);

            await deletionWorkflow.start(testCreateDeploymentParams);

            // Advance timer to timeout (5 minutes)
            vi.advanceTimersByTime(300_000);
            await vi.runAllTimersAsync();

            const workflow = (deletionWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DELETION_FAILED);
            expect(workflow.failureReason).toBe('Changeset deletion timeout');
        });
    });

    describe('stack deletion', () => {
        it('should complete stack deletion successfully', async () => {
            const mockChanges = [{ Action: 'Add', ResourceType: 'AWS::S3::Bucket' }];

            mockCfnService.describeChangeSet = vi.fn().mockResolvedValue({ Changes: mockChanges });
            mockCfnService.deleteStack = vi.fn().mockResolvedValue({});
            mockCfnService.waitUntilStackDeleteComplete = vi.fn().mockResolvedValue({
                state: WaiterState.SUCCESS,
            });
            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }],
            });
            (isStackInReview as any).mockResolvedValue(true);
            (mapChangesToStackChanges as any).mockReturnValue([]);

            await deletionWorkflow.start(testCreateDeploymentParams);

            // Wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 50));

            const workflow = (deletionWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.SUCCESSFUL);
            expect(workflow.phase).toBe(StackActionPhase.DELETION_COMPLETE);
        });

        it('should handle stack deletion failure', async () => {
            const mockChanges = [{ Action: 'Add', ResourceType: 'AWS::S3::Bucket' }];

            mockCfnService.describeChangeSet = vi.fn().mockResolvedValue({ Changes: mockChanges });
            mockCfnService.deleteStack = vi.fn().mockResolvedValue({});
            mockCfnService.waitUntilStackDeleteComplete = vi.fn().mockResolvedValue({
                state: WaiterState.FAILURE,
                reason: 'Stack deletion failed',
            });
            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }],
            });
            (isStackInReview as any).mockResolvedValue(true);
            (mapChangesToStackChanges as any).mockReturnValue([]);

            await deletionWorkflow.start(testCreateDeploymentParams);

            // Wait for async operation
            await new Promise((resolve) => setTimeout(resolve, 50));

            const workflow = (deletionWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DELETION_FAILED);
            expect(workflow.failureReason).toBe('Stack deletion failed');
        });
    });
    describe('full workflow execution', () => {
        const waitForWorkflowCompletion = async (workflowId: string): Promise<void> => {
            let attempts = 0;
            const maxAttempts = 50;
            while (attempts < maxAttempts) {
                const workflow = (deletionWorkflow as any).workflows.get(workflowId);
                if (workflow?.state !== StackActionState.IN_PROGRESS) {
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
                attempts++;
            }
        };

        beforeEach(() => {
            vi.useRealTimers();
            mockCfnService.describeChangeSet = vi.fn().mockResolvedValue({ Changes: [] });
            mockCfnService.deleteChangeSet = vi.fn().mockResolvedValue({});
            mockCfnService.deleteStack = vi.fn().mockResolvedValue({});
            mockCfnService.waitUntilStackDeleteComplete = vi.fn().mockResolvedValue({
                state: WaiterState.SUCCESS,
            });

            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }],
                nextToken: 'token123',
            });
            (isStackInReview as any).mockResolvedValue(true);
            (mapChangesToStackChanges as any).mockReturnValue([]);
        });

        it('should execute full changeset deletion workflow successfully', async () => {
            // Mock changeset deletion success (changeset not found after polling)
            mockCfnService.describeChangeSet = vi
                .fn()
                .mockResolvedValueOnce({ Changes: [] }) // Initial call in start()
                .mockRejectedValue(new Error('ChangeSetNotFound')); // Polling calls

            await deletionWorkflow.start(testCreateDeploymentParams);
            await waitForWorkflowCompletion(testId);

            expect(mockCfnService.deleteChangeSet).toHaveBeenCalledWith({
                StackName: testStackName,
                ChangeSetName: testChangeSetName,
            });

            expect(mockCfnService.listChangeSets).toBeCalledTimes(1);
            const workflow = (deletionWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.SUCCESSFUL);
            expect(workflow.phase).toBe(StackActionPhase.DELETION_COMPLETE);
            expect(workflow.failureReason).toBeUndefined();
        });

        it('should execute full stack deletion workflow successfully', async () => {
            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }], // Single changeset
            });

            await deletionWorkflow.start(testCreateDeploymentParams);
            await waitForWorkflowCompletion(testId);

            expect(mockCfnService.deleteStack).toHaveBeenCalledWith({
                StackName: testStackName,
            });

            const workflow = (deletionWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.SUCCESSFUL);
            expect(workflow.phase).toBe(StackActionPhase.DELETION_COMPLETE);
            expect(workflow.failureReason).toBeUndefined();
        });

        it('should handle changeset deletion polling error', async () => {
            // Mock changeset deletion failure (other error during polling)
            mockCfnService.describeChangeSet = vi
                .fn()
                .mockResolvedValueOnce({ Changes: [] }) // Initial call in start()
                .mockRejectedValue(new Error('AccessDenied')); // Polling calls

            await deletionWorkflow.start(testCreateDeploymentParams);
            await waitForWorkflowCompletion(testId);

            const workflow = (deletionWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DELETION_FAILED);
            expect(workflow.failureReason).toBe('AccessDenied');
        });

        it('should handle stack deletion failure', async () => {
            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }], // Single changeset
            });
            mockCfnService.waitUntilStackDeleteComplete = vi.fn().mockResolvedValue({
                state: WaiterState.FAILURE,
                reason: 'Stack has dependent resources',
            });

            await deletionWorkflow.start(testCreateDeploymentParams);
            await waitForWorkflowCompletion(testId);

            const workflow = (deletionWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DELETION_FAILED);
            expect(workflow.failureReason).toBe('Stack has dependent resources');
        });

        it('should handle stack deletion exception', async () => {
            mockCfnService.listChangeSets = vi.fn().mockResolvedValue({
                changeSets: [{ ChangeSetName: 'changeset1' }], // Single changeset
            });
            mockCfnService.waitUntilStackDeleteComplete = vi
                .fn()
                .mockRejectedValue(new Error('Stack deletion service error'));

            await deletionWorkflow.start(testCreateDeploymentParams);
            await waitForWorkflowCompletion(testId);

            const workflow = (deletionWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DELETION_FAILED);
            expect(workflow.failureReason).toBe('Stack deletion service error');
        });

        it('should handle start method exceptions', async () => {
            mockCfnService.describeChangeSet = vi.fn().mockRejectedValue(new Error('Failed to describe changeset'));

            await expect(deletionWorkflow.start(testCreateDeploymentParams)).rejects.toThrow(
                'Failed to describe changeset',
            );
        });
    });
});
