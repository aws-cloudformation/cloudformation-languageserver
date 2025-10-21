import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CfnService } from '../../../src/services/CfnService';
import { DeploymentWorkflow } from '../../../src/stacks/actions/DeploymentWorkflow';
import {
    processChangeSet,
    waitForValidation,
    waitForDeployment,
    processWorkflowUpdates,
} from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateStackActionParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';
import { DRY_RUN_VALIDATION_NAME } from '../../../src/stacks/actions/ValidationWorkflow';

vi.mock('../../../src/stacks/actions/StackActionOperations');

describe('DeploymentWorkflow', () => {
    let deploymentWorkflow: DeploymentWorkflow;
    let mockCfnService: CfnService;
    let mockDocumentManager: DocumentManager;

    beforeEach(() => {
        mockCfnService = {
            describeStacks: vi.fn(),
        } as any;
        mockDocumentManager = {} as DocumentManager;
        deploymentWorkflow = new DeploymentWorkflow(mockCfnService, mockDocumentManager);
        vi.clearAllMocks();
    });

    describe('start', () => {
        it('should start deployment workflow with CREATE when stack does not exist', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            mockCfnService.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));
            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await deploymentWorkflow.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'CREATE');
        });

        it('should start deployment workflow with UPDATE when stack exists', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            mockCfnService.describeStacks = vi.fn().mockResolvedValue({ Stacks: [{ StackName: 'test-stack' }] });
            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await deploymentWorkflow.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'UPDATE');
        });

        it('should start deployment workflow with IMPORT when resourcesToImport has items', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                resourcesToImport: [
                    {
                        ResourceType: 'AWS::S3::Bucket',
                        LogicalResourceId: 'MyBucket',
                        ResourceIdentifier: { BucketName: 'my-bucket' },
                    },
                ],
            };

            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await deploymentWorkflow.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'IMPORT');
            expect(mockCfnService.describeStacks).not.toHaveBeenCalled();
        });

        it('should start deployment workflow with CREATE when resourcesToImport is empty array', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                resourcesToImport: [],
            };

            mockCfnService.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));
            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await deploymentWorkflow.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'CREATE');
        });

        it('should start deployment workflow with UPDATE when resourcesToImport is undefined and stack exists', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                resourcesToImport: undefined,
            };

            mockCfnService.describeStacks = vi.fn().mockResolvedValue({ Stacks: [{ StackName: 'test-stack' }] });
            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await deploymentWorkflow.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'UPDATE');
        });
    });

    describe('getStatus', () => {
        it('should return workflow status', () => {
            const params = { id: 'test-id' };

            const workflow = {
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
                phase: StackActionPhase.VALIDATION_IN_PROGRESS,
                startTime: Date.now(),
                state: StackActionState.IN_PROGRESS,
            };

            // Directly set workflow state
            (deploymentWorkflow as any).workflows.set('test-id', workflow);

            const result = deploymentWorkflow.getStatus(params);

            expect(result).toEqual({
                phase: StackActionPhase.VALIDATION_IN_PROGRESS,
                state: StackActionState.IN_PROGRESS,
                changes: undefined,
                id: 'test-id',
            });
        });

        it('should throw error when workflow not found', () => {
            const params = { id: 'nonexistent-id' };

            expect(() => deploymentWorkflow.getStatus(params)).toThrow('Workflow not found: nonexistent-id');
        });
    });

    describe('describeStatus', () => {
        it('should return workflow status with validation details and deployment events', () => {
            const params = { id: 'test-id' };
            const changes = [{ type: 'Resource', resourceChange: { action: 'Add', logicalResourceId: 'MyBucket' } }];

            const workflow = {
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                startTime: Date.now(),
                state: StackActionState.SUCCESSFUL,
                changes: changes,
                validationDetails: [{ Timestamp: new Date(), Severity: 'INFO', Message: 'Validation succeeded' }],
                deploymentEvents: [{ LogicalResourceId: 'MyBucket', ResourceType: 'AWS::S3::Bucket' }],
            };

            // Directly set workflow state
            (deploymentWorkflow as any).workflows.set('test-id', workflow);

            const result = deploymentWorkflow.describeStatus(params);

            expect(result).toEqual({
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: changes,
                id: 'test-id',
                ValidationDetails: workflow.validationDetails,
                DeploymentEvents: workflow.deploymentEvents,
            });
        });

        it('should throw error when workflow not found', () => {
            const params = { id: 'nonexistent-id' };

            expect(() => deploymentWorkflow.describeStatus(params)).toThrow('Workflow not found: nonexistent-id');
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
            mockCfnService.describeStacks = vi.fn().mockRejectedValue(new Error('Stack not found'));

            mockCfnService.executeChangeSet = vi.fn().mockResolvedValue({});

            mockCfnService.describeStackEvents = vi.fn().mockImplementation((_params, options) => {
                if (options?.nextToken) {
                    return Promise.resolve({ StackEvents: [] });
                }
                return Promise.resolve({
                    StackEvents: [
                        {
                            LogicalResourceId: 'MyBucket',
                            ResourceType: 'AWS::S3::Bucket',
                            Timestamp: new Date('2023-01-01T10:00:00Z'),
                            ResourceStatus: 'CREATE_COMPLETE',
                            ResourceStatusReason: 'Resource creation completed successfully',
                            ClientRequestToken: 'test-workflow-id',
                        },
                        {
                            LogicalResourceId: 'MyRole',
                            ResourceType: 'AWS::IAM::Role',
                            Timestamp: new Date('2023-01-01T10:01:00Z'),
                            ResourceStatus: 'CREATE_COMPLETE',
                            ClientRequestToken: 'test-workflow-id',
                        },
                    ],
                });
            });

            (processChangeSet as any).mockResolvedValue('test-changeset');

            (waitForValidation as any).mockResolvedValue({
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: [],
            });

            (waitForDeployment as any).mockResolvedValue({
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                state: StackActionState.SUCCESSFUL,
            });

            (processWorkflowUpdates as any).mockImplementation((map: any, workflow: any, updates: any) => {
                const updated = { ...workflow, ...updates };
                map.set(workflow.id, updated);
                return updated;
            });
        });

        it('should execute full deployment workflow successfully', async () => {
            const workflowId = 'test-workflow-id';
            const params: CreateStackActionParams = {
                id: workflowId,
                stackName: 'test-stack',
                uri: 'file://test.yaml',
                parameters: [],
                capabilities: [],
            };

            await deploymentWorkflow.start(params);
            await waitForWorkflowCompletion(workflowId);

            // Verify StackActionOperations method calls
            expect(processChangeSet).toHaveBeenCalledWith(
                mockCfnService,
                mockDocumentManager,
                params,
                ChangeSetType.CREATE,
            );
            expect(waitForValidation).toHaveBeenCalledWith(mockCfnService, 'test-changeset', 'test-stack');
            expect(mockCfnService.executeChangeSet).toHaveBeenCalledWith({
                StackName: 'test-stack',
                ChangeSetName: 'test-changeset',
                ClientRequestToken: workflowId,
            });
            expect(waitForDeployment).toHaveBeenCalledWith(mockCfnService, 'test-stack', ChangeSetType.CREATE);

            const workflow = (deploymentWorkflow as any).workflows.get(workflowId);
            expect(workflow.state).toBe(StackActionState.SUCCESSFUL);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_COMPLETE);
            expect(workflow.validationDetails).toBeDefined();
            expect(workflow.validationDetails).toHaveLength(1);
            expect(workflow.validationDetails[0].Severity).toBe('INFO');
            expect(workflow.validationDetails[0].Message).toBe('Validation succeeded');
            expect(workflow.validationDetails[0].ValidationName).toBe(DRY_RUN_VALIDATION_NAME);
            expect(workflow.deploymentEvents).toBeDefined();
            expect(workflow.deploymentEvents).toHaveLength(2);
            expect(workflow.deploymentEvents[0].LogicalResourceId).toBe('MyBucket');
            expect(workflow.deploymentEvents[0].ResourceType).toBe('AWS::S3::Bucket');
            expect(workflow.deploymentEvents[1].LogicalResourceId).toBe('MyRole');
            expect(workflow.deploymentEvents[1].ResourceType).toBe('AWS::IAM::Role');
            expect(workflow.failureReason).toBeUndefined();
        });

        it('should handle waitForValidation returning failed', async () => {
            // Override the default mock for this test
            (waitForValidation as any).mockResolvedValueOnce({
                phase: StackActionPhase.VALIDATION_FAILED,
                state: StackActionState.FAILED,
                failureReason: 'Invalid template',
            });

            const workflowId = 'test-workflow-id';
            const params: CreateStackActionParams = {
                id: workflowId,
                stackName: 'test-stack',
                uri: 'file://test.yaml',
                parameters: [],
                capabilities: [],
            };

            await deploymentWorkflow.start(params);
            await waitForWorkflowCompletion(workflowId);

            const workflow = (deploymentWorkflow as any).workflows.get(workflowId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.validationDetails[0].Message).toContain('Validation failed with reason: Invalid template');
        });

        it('should handle waitForValidation throwing exception', async () => {
            // Override the default mock for this test
            (waitForValidation as any).mockRejectedValueOnce(new Error('Validation service error'));

            const workflowId = 'test-workflow-id';
            const params: CreateStackActionParams = {
                id: workflowId,
                stackName: 'test-stack',
                uri: 'file://test.yaml',
                parameters: [],
                capabilities: [],
            };

            await deploymentWorkflow.start(params);
            await waitForWorkflowCompletion(workflowId);

            const workflow = (deploymentWorkflow as any).workflows.get(workflowId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.failureReason).toBe('Validation service error');
        });

        it('should handle executeChangeSet throwing exception', async () => {
            // Override the default mock for this test
            mockCfnService.executeChangeSet = vi.fn().mockRejectedValueOnce(new Error('Execute changeset failed'));

            const workflowId = 'test-workflow-id';
            const params: CreateStackActionParams = {
                id: workflowId,
                stackName: 'test-stack',
                uri: 'file://test.yaml',
                parameters: [],
                capabilities: [],
            };

            await deploymentWorkflow.start(params);
            await waitForWorkflowCompletion(workflowId);

            const workflow = (deploymentWorkflow as any).workflows.get(workflowId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_FAILED);
            expect(workflow.failureReason).toBe('Execute changeset failed');
        });

        it('should handle processDeploymentEvents throwing exception', async () => {
            // Override the default mock for this test
            mockCfnService.describeStackEvents = vi.fn().mockRejectedValueOnce(new Error('Failed to get stack events'));

            const workflowId = 'test-workflow-id';
            const params: CreateStackActionParams = {
                id: workflowId,
                stackName: 'test-stack',
                uri: 'file://test.yaml',
                parameters: [],
                capabilities: [],
            };

            await deploymentWorkflow.start(params);
            await waitForWorkflowCompletion(workflowId);

            // Workflow should still succeed even if processDeploymentEvents fails
            const workflow = (deploymentWorkflow as any).workflows.get(workflowId);
            expect(workflow.state).toBe(StackActionState.SUCCESSFUL);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_COMPLETE);
            expect(workflow.deploymentEvents).toBeUndefined();
        });
    });
});
