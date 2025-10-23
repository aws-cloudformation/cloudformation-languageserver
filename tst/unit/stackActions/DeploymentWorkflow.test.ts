import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { Identifiable } from '../../../src/protocol/LspTypes';
import { CfnService } from '../../../src/services/CfnService';
import { DeploymentWorkflow } from '../../../src/stacks/actions/DeploymentWorkflow';
import {
    waitForDeployment,
    isStackInReview,
    mapChangesToStackChanges,
} from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateDeploymentParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';

vi.mock('../../../src/stacks/actions/StackActionOperations', async () => {
    const actual = await vi.importActual('../../../src/stacks/actions/StackActionOperations');
    return {
        ...actual,
        waitForDeployment: vi.fn(),
        determineChangeSetType: vi.fn(),
        mapChangesToStackChanges: vi.fn(),
        isStackInReview: vi.fn(),
    };
});

describe('DeploymentWorkflow', () => {
    let deploymentWorkflow: DeploymentWorkflow;
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
            executeChangeSet: vi.fn(),
            describeChangeSet: vi.fn(),
            describeStackEvents: vi.fn(),
        } as any;
        mockDocumentManager = {} as DocumentManager;
        deploymentWorkflow = new DeploymentWorkflow(mockCfnService, mockDocumentManager);

        vi.clearAllMocks();
    });

    describe('start', () => {
        it('should execute changeset and start deployment workflow', async () => {
            const mockChanges = [{ Action: 'Add', ResourceType: 'AWS::S3::Bucket' }];
            const mockMappedChanges = [
                { type: 'Resource', resourceChange: { action: 'Add', logicalResourceId: 'MyBucket' } },
            ];

            mockCfnService.executeChangeSet = vi.fn().mockResolvedValue({});
            mockCfnService.describeChangeSet = vi.fn().mockResolvedValue({ Changes: mockChanges });
            (mapChangesToStackChanges as any).mockReturnValue(mockMappedChanges);
            (isStackInReview as any).mockResolvedValue(true);

            // Don't resolve waitForDeployment so async operation stays pending
            (waitForDeployment as any).mockImplementation(() => new Promise(() => {}));

            const result = await deploymentWorkflow.start(testCreateDeploymentParams);

            expect(mockCfnService.executeChangeSet).toHaveBeenCalledWith({
                StackName: testStackName,
                ChangeSetName: testChangeSetName,
                ClientRequestToken: testId,
            });

            expect(mockCfnService.describeChangeSet).toHaveBeenCalledWith({
                StackName: testStackName,
                ChangeSetName: testChangeSetName,
                IncludePropertyValues: true,
            });

            expect(result).toEqual(testCreateDeploymentParams);

            // Verify initial workflow state is set (async operation is still pending)
            const workflow = (deploymentWorkflow as any).workflows.get(testId);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_IN_PROGRESS);
            expect(workflow.state).toBe(StackActionState.IN_PROGRESS);
            expect(workflow.changes).toBe(mockMappedChanges);
        });
    });

    describe('getStatus', () => {
        it('should get workflow status', () => {
            const workflow = {
                id: testId,
                changeSetName: testChangeSetName,
                stackName: testStackName,
                phase: StackActionPhase.DEPLOYMENT_IN_PROGRESS,
                startTime: Date.now(),
                state: StackActionState.IN_PROGRESS,
            };

            // Directly set workflow state
            (deploymentWorkflow as any).workflows.set(testId, workflow);

            const result = deploymentWorkflow.getStatus(testIdentifiableParams);

            expect(result).toEqual({
                phase: StackActionPhase.DEPLOYMENT_IN_PROGRESS,
                state: StackActionState.IN_PROGRESS,
                changes: undefined,
                id: testId,
            });
        });

        it('should throw error when workflow not found', () => {
            const getStatusParams = { id: 'nonexistent-id' };

            expect(() => deploymentWorkflow.getStatus(getStatusParams)).toThrow('Workflow not found: nonexistent-id');
        });
    });

    describe('describeStatus', () => {
        it('should return workflow status with deployment events and failure reason', () => {
            const changes = [{ type: 'Resource', resourceChange: { action: 'Add', logicalResourceId: 'MyBucket' } }];

            const workflow = {
                id: testId,
                changeSetName: testChangeSetName,
                stackName: testStackName,
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                startTime: Date.now(),
                state: StackActionState.SUCCESSFUL,
                changes: changes,
                deploymentEvents: [{ LogicalResourceId: 'MyBucket', ResourceType: 'AWS::S3::Bucket' }],
                failureReason: undefined,
            };

            // Directly set workflow state
            (deploymentWorkflow as any).workflows.set(testId, workflow);

            const result = deploymentWorkflow.describeStatus(testIdentifiableParams);

            expect(result).toEqual({
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: changes,
                id: testId,
                DeploymentEvents: workflow.deploymentEvents,
                FailureReason: workflow.failureReason,
            });
        });

        it('should throw error when workflow not found', () => {
            const describeStatusParams = { id: 'nonexistent-id' };

            expect(() => deploymentWorkflow.describeStatus(describeStatusParams)).toThrow(
                'Workflow not found: nonexistent-id',
            );
        });
    });

    describe('full workflow execution', () => {
        const waitForWorkflowCompletion = async (workflowId: string): Promise<void> => {
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                const workflow = (deploymentWorkflow as any).workflows.get(workflowId);
                if (workflow?.state !== StackActionState.IN_PROGRESS) {
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
                attempts++;
            }
        };

        beforeEach(() => {
            mockCfnService.executeChangeSet = vi.fn().mockResolvedValue({});
            mockCfnService.describeChangeSet = vi.fn().mockResolvedValue({ Changes: [] });

            mockCfnService.describeStackEvents = vi.fn().mockResolvedValue({
                StackEvents: [
                    {
                        LogicalResourceId: 'MyBucket',
                        ResourceType: 'AWS::S3::Bucket',
                        Timestamp: new Date('2023-01-01T10:00:00Z'),
                        ResourceStatus: 'CREATE_COMPLETE',
                        ResourceStatusReason: 'Resource creation completed successfully',
                    },
                    {
                        LogicalResourceId: 'MyRole',
                        ResourceType: 'AWS::IAM::Role',
                        Timestamp: new Date('2023-01-01T10:01:00Z'),
                        ResourceStatus: 'CREATE_COMPLETE',
                    },
                ],
            });

            (waitForDeployment as any).mockResolvedValue({
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                state: StackActionState.SUCCESSFUL,
            });

            (isStackInReview as any).mockResolvedValue(true);
            (mapChangesToStackChanges as any).mockReturnValue([]);

            // Don't mock processWorkflowUpdates - use the real implementation
        });

        it('should execute full deployment workflow successfully', async () => {
            await deploymentWorkflow.start(testCreateDeploymentParams);
            await waitForWorkflowCompletion(testId);

            expect(mockCfnService.executeChangeSet).toHaveBeenCalledWith({
                StackName: testStackName,
                ChangeSetName: testChangeSetName,
                ClientRequestToken: testId,
            });
            expect(waitForDeployment).toHaveBeenCalledWith(mockCfnService, testStackName, ChangeSetType.CREATE);

            const workflow = (deploymentWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.SUCCESSFUL);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_COMPLETE);
            expect(workflow.deploymentEvents).toHaveLength(2);
            expect(workflow.deploymentEvents[0].LogicalResourceId).toBe('MyBucket');
            expect(workflow.deploymentEvents[0].ResourceType).toBe('AWS::S3::Bucket');
            expect(workflow.deploymentEvents[1].LogicalResourceId).toBe('MyRole');
            expect(workflow.deploymentEvents[1].ResourceType).toBe('AWS::IAM::Role');
            expect(workflow.failureReason).toBeUndefined();
        });

        it('should handle waitForDeployment returning failed', async () => {
            (waitForDeployment as any).mockResolvedValue({
                phase: StackActionPhase.DEPLOYMENT_FAILED,
                state: StackActionState.FAILED,
            });

            await deploymentWorkflow.start(testCreateDeploymentParams);
            await waitForWorkflowCompletion(testId);

            const workflow = (deploymentWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_FAILED);
        });

        it('should handle waitForDeployment throwing exception', async () => {
            (waitForDeployment as any).mockRejectedValue(new Error('Deployment service error'));

            await deploymentWorkflow.start(testCreateDeploymentParams);

            // Wait longer for the async error to be processed
            await new Promise((resolve) => setTimeout(resolve, 200));

            const workflow = (deploymentWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_FAILED);
            expect(workflow.failureReason).toBe('Deployment service error');
        });

        it('should handle executeChangeSet throwing exception', async () => {
            mockCfnService.executeChangeSet = vi.fn().mockRejectedValueOnce(new Error('Execute changeset failed'));

            await expect(deploymentWorkflow.start(testCreateDeploymentParams)).rejects.toThrow(
                'Execute changeset failed',
            );
        });

        it('should handle processDeploymentEvents throwing exception', async () => {
            mockCfnService.describeStackEvents = vi.fn().mockRejectedValueOnce(new Error('Failed to get stack events'));

            await deploymentWorkflow.start(testCreateDeploymentParams);
            await waitForWorkflowCompletion(testId);

            // Workflow should still succeed even if processDeploymentEvents fails
            const workflow = (deploymentWorkflow as any).workflows.get(testId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_FAILED);
            expect(workflow.failureReason).toBe('Failed to get stack events');
            expect(workflow.deploymentEvents).toBeUndefined();
        });
    });
});
