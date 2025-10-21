import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CfnServiceV2 } from '../../../src/services/CfnServiceV2';
import { DiagnosticCoordinator } from '../../../src/services/DiagnosticCoordinator';
import { DeploymentWorkflowV2 } from '../../../src/stacks/actions/DeploymentWorkflowV2';
import {
    processChangeSet,
    waitForChangeSetValidation,
    waitForDeployment,
    processWorkflowUpdates,
    parseValidationEvents,
    publishValidationDiagnostics,
} from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateStackActionParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';
import { DRY_RUN_VALIDATION_NAME } from '../../../src/stacks/actions/ValidationWorkflow';
import { VALIDATION_V2_NAME } from '../../../src/stacks/actions/ValidationWorkflowV2';

vi.mock('../../../src/stacks/actions/StackActionOperations');

describe('DeploymentWorkflow', () => {
    let deploymentWorkflowV2: DeploymentWorkflowV2;
    let mockCfnServiceV2: CfnServiceV2;
    let mockDocumentManager: DocumentManager;
    let mockDiagnosticCoordinator: DiagnosticCoordinator;
    let mockSyntaxTreeManager: SyntaxTreeManager;

    beforeEach(() => {
        mockCfnServiceV2 = {
            describeStacks: vi.fn(),
        } as any;
        mockDocumentManager = {} as DocumentManager;
        mockDiagnosticCoordinator = {
            publishDiagnostics: vi.fn().mockResolvedValue(undefined),
        } as any;
        mockSyntaxTreeManager = {
            getSyntaxTree: vi.fn(),
        } as any;

        mockCfnServiceV2.describeEvents = vi.fn().mockResolvedValue({
            OperationEvents: [],
        });
        (parseValidationEvents as any).mockReturnValue([]);

        deploymentWorkflowV2 = new DeploymentWorkflowV2(
            mockCfnServiceV2,
            mockDocumentManager,
            mockDiagnosticCoordinator,
            mockSyntaxTreeManager,
        );
        vi.clearAllMocks();
    });

    describe('full workflow execution', () => {
        const waitForWorkflowCompletion = async (workflowId: string): Promise<void> => {
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                const workflow = (deploymentWorkflowV2 as any).workflows.get(workflowId);
                if (workflow?.state !== StackActionState.IN_PROGRESS) {
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
                attempts++;
            }
        };

        beforeEach(() => {
            mockCfnServiceV2.describeStacks = vi.fn().mockRejectedValue(new Error('Stack not found'));

            mockCfnServiceV2.executeChangeSet = vi.fn().mockResolvedValue({});

            mockCfnServiceV2.describeStackEvents = vi.fn().mockResolvedValue({
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

            (processChangeSet as any).mockResolvedValue('test-changeset');

            (waitForChangeSetValidation as any).mockResolvedValue({
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

            const mockDescribeEventsResponse = {
                OperationEvents: [
                    {
                        EventId: 'event-1',
                        EventType: 'VALIDATION_ERROR',
                        Timestamp: '2023-01-01T00:00:00Z',
                        LogicalResourceId: 'TestResource',
                        ValidationPath: '/Resources/TestResource/Properties/BucketName',
                        ValidationFailureMode: 'FAIL',
                        ValidationName: 'TestValidation',
                        ValidationStatusReason: 'Test error',
                    },
                ],
            };

            mockCfnServiceV2.describeEvents = vi.fn().mockResolvedValueOnce(mockDescribeEventsResponse);

            const mockParseValidationEventsResponse = [
                {
                    ValidationName: VALIDATION_V2_NAME,
                    LogicalId: 'TestResource',
                    ResourcePropertPath: '/Resources/TestResource/Properties/BucketName',
                    Timestamp: DateTime.fromISO('2023-01-01T00:00:00Z'),
                    Severity: 'ERROR',
                    Message: 'TestValidation: Test error',
                },
            ];

            (parseValidationEvents as any).mockReturnValueOnce(mockParseValidationEventsResponse);

            await deploymentWorkflowV2.start(params);
            await waitForWorkflowCompletion(workflowId);
            expect(parseValidationEvents).toHaveBeenCalledWith(mockDescribeEventsResponse, VALIDATION_V2_NAME);

            expect(publishValidationDiagnostics).toHaveBeenCalledWith(
                params.uri,
                mockParseValidationEventsResponse,
                mockSyntaxTreeManager,
                mockDiagnosticCoordinator,
            );

            // Verify StackActionOperations method calls
            expect(processChangeSet).toHaveBeenCalledWith(
                mockCfnServiceV2,
                mockDocumentManager,
                params,
                ChangeSetType.CREATE,
            );
            expect(waitForChangeSetValidation).toHaveBeenCalledWith(mockCfnServiceV2, 'test-changeset', 'test-stack');
            expect(mockCfnServiceV2.executeChangeSet).toHaveBeenCalledWith({
                StackName: 'test-stack',
                ChangeSetName: 'test-changeset',
                ClientRequestToken: workflowId,
            });
            expect(waitForDeployment).toHaveBeenCalledWith(mockCfnServiceV2, 'test-stack', ChangeSetType.CREATE);

            const workflow = (deploymentWorkflowV2 as any).workflows.get(workflowId);
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
            (waitForChangeSetValidation as any).mockResolvedValueOnce({
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

            await deploymentWorkflowV2.start(params);
            await waitForWorkflowCompletion(workflowId);

            const workflow = (deploymentWorkflowV2 as any).workflows.get(workflowId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.validationDetails[0].Message).toContain('Validation failed with reason: Invalid template');
        });

        it('should handle waitForValidation throwing exception', async () => {
            // Override the default mock for this test
            (waitForChangeSetValidation as any).mockRejectedValueOnce(new Error('Validation service error'));

            const workflowId = 'test-workflow-id';
            const params: CreateStackActionParams = {
                id: workflowId,
                stackName: 'test-stack',
                uri: 'file://test.yaml',
                parameters: [],
                capabilities: [],
            };

            await deploymentWorkflowV2.start(params);
            await waitForWorkflowCompletion(workflowId);

            const workflow = (deploymentWorkflowV2 as any).workflows.get(workflowId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.failureReason).toBe('Validation service error');
        });

        it('should handle executeChangeSet throwing exception', async () => {
            // Override the default mock for this test
            mockCfnServiceV2.executeChangeSet = vi.fn().mockRejectedValueOnce(new Error('Execute changeset failed'));

            const workflowId = 'test-workflow-id';
            const params: CreateStackActionParams = {
                id: workflowId,
                stackName: 'test-stack',
                uri: 'file://test.yaml',
                parameters: [],
                capabilities: [],
            };

            await deploymentWorkflowV2.start(params);
            await waitForWorkflowCompletion(workflowId);

            const workflow = (deploymentWorkflowV2 as any).workflows.get(workflowId);
            expect(workflow.state).toBe(StackActionState.FAILED);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_FAILED);
            expect(workflow.failureReason).toBe('Execute changeset failed');
        });

        it('should handle processDeploymentEvents throwing exception', async () => {
            // Override the default mock for this test
            mockCfnServiceV2.describeStackEvents = vi
                .fn()
                .mockRejectedValueOnce(new Error('Failed to get stack events'));

            const workflowId = 'test-workflow-id';
            const params: CreateStackActionParams = {
                id: workflowId,
                stackName: 'test-stack',
                uri: 'file://test.yaml',
                parameters: [],
                capabilities: [],
            };

            await deploymentWorkflowV2.start(params);
            await waitForWorkflowCompletion(workflowId);

            // Workflow should still succeed even if processDeploymentEvents fails
            const workflow = (deploymentWorkflowV2 as any).workflows.get(workflowId);
            expect(workflow.state).toBe(StackActionState.SUCCESSFUL);
            expect(workflow.phase).toBe(StackActionPhase.DEPLOYMENT_COMPLETE);
            expect(workflow.deploymentEvents).toBeUndefined();
        });
    });
});
