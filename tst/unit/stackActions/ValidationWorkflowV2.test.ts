import { DateTime } from 'luxon';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileContextManager } from '../../../src/context/FileContextManager';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CfnServiceV2 } from '../../../src/services/CfnServiceV2';
import { DiagnosticCoordinator } from '../../../src/services/DiagnosticCoordinator';
import {
    processChangeSet,
    waitForChangeSetValidation,
    processWorkflowUpdates,
    deleteStackAndChangeSet,
    deleteChangeSet,
    parseValidationEvents,
    publishValidationDiagnostics,
} from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateStackActionParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';
import { ValidationManager } from '../../../src/stacks/actions/ValidationManager';
import { ValidationWorkflowV2, VALIDATION_V2_NAME } from '../../../src/stacks/actions/ValidationWorkflowV2';

vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

vi.mock('../../../src/stacks/actions/StackActionOperations');

describe('ValidationWorkflowV2', () => {
    let validationWorkflowV2: ValidationWorkflowV2;
    let mockCfnServiceV2: CfnServiceV2;
    let mockDocumentManager: DocumentManager;
    let mockDiagnosticCoordinator: DiagnosticCoordinator;
    let mockSyntaxTreeManager: SyntaxTreeManager;
    let mockFileContextManager: FileContextManager;
    let mockValidationManager: ValidationManager;

    const waitForWorkflowCompletion = async (workflowId: string): Promise<void> => {
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            const workflow = (validationWorkflowV2 as any).workflows.get(workflowId);
            await new Promise((resolve) => setTimeout(resolve, 25));
            if (workflow?.state !== StackActionState.IN_PROGRESS) {
                return;
            }
            attempts++;
        }
    };

    beforeEach(() => {
        mockCfnServiceV2 = {
            describeStacks: vi.fn(),
            describeEvents: vi.fn(),
        } as any;
        mockDocumentManager = {} as DocumentManager;
        mockDiagnosticCoordinator = {
            publishDiagnostics: vi.fn().mockResolvedValue(undefined),
        } as any;
        mockSyntaxTreeManager = {
            getSyntaxTree: vi.fn(),
        } as any;
        mockFileContextManager = {} as FileContextManager;

        mockValidationManager = { add: vi.fn(), get: vi.fn(), remove: vi.fn() } as any;

        mockCfnServiceV2.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));

        (processChangeSet as any).mockResolvedValue('changeset-123');

        (waitForChangeSetValidation as any).mockResolvedValue({
            phase: StackActionPhase.VALIDATION_COMPLETE,
            state: StackActionState.SUCCESSFUL,
            changes: [],
        });

        mockCfnServiceV2.describeEvents = vi.fn().mockResolvedValue({
            OperationEvents: [],
        });

        (deleteStackAndChangeSet as any).mockResolvedValue(undefined);
        (deleteChangeSet as any).mockResolvedValue(undefined);

        (processWorkflowUpdates as any).mockImplementation((map: any, workflow: any, updates: any) => {
            const updated = { ...workflow, ...updates };
            map.set(workflow.id, updated);
            return updated;
        });

        mockCfnServiceV2.describeEvents = vi.fn().mockResolvedValue({
            OperationEvents: [],
        });
        (parseValidationEvents as any).mockReturnValue(Promise<void>);

        validationWorkflowV2 = new ValidationWorkflowV2(
            mockCfnServiceV2,
            mockDocumentManager,
            mockDiagnosticCoordinator,
            mockSyntaxTreeManager,
            mockValidationManager,
            mockFileContextManager,
        );

        vi.clearAllMocks();
    });

    describe('full workflow execution', () => {
        it('should handle successful validation workflow with events and diagnostics publishing', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            const mockChanges = [{ resourceChange: { action: 'Add', logicalResourceId: 'TestResource' } }];
            (waitForChangeSetValidation as any).mockResolvedValueOnce({
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: mockChanges,
            });

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

            const result = await validationWorkflowV2.start(params);
            await waitForWorkflowCompletion('test-id');

            // Verify workflow execution
            expect(result.changeSetName).toBe('changeset-123');
            expect(mockValidationManager.add).toHaveBeenCalled();
            expect(waitForChangeSetValidation).toHaveBeenCalledWith(mockCfnServiceV2, 'changeset-123', 'test-stack');
            expect(mockCfnServiceV2.describeEvents).toHaveBeenCalledWith({
                ChangeSetName: 'changeset-123',
                StackName: 'test-stack',
            });

            // Verify workflow state
            const workflow = (validationWorkflowV2 as any).workflows.get('test-id');
            expect(workflow.changes).toEqual(mockChanges);

            expect(parseValidationEvents).toHaveBeenCalledWith(mockDescribeEventsResponse, VALIDATION_V2_NAME);

            expect(publishValidationDiagnostics).toHaveBeenCalledWith(
                params.uri,
                mockParseValidationEventsResponse,
                mockSyntaxTreeManager,
                mockDiagnosticCoordinator,
            );
        });

        it('should handle validation failure', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            (waitForChangeSetValidation as any).mockResolvedValueOnce({
                phase: StackActionPhase.VALIDATION_FAILED,
                state: StackActionState.FAILED,
                failureReason: 'Template validation failed',
            });

            await validationWorkflowV2.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(mockValidationManager.add).toHaveBeenCalled();
            expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack');

            const workflow = (validationWorkflowV2 as any).workflows.get('test-id');
            expect(workflow.failureReason).toBe('Template validation failed');
        });

        it('should handle validation exception', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            (waitForChangeSetValidation as any).mockRejectedValueOnce(new Error('Validation service error'));

            await validationWorkflowV2.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack');
            expect(deleteStackAndChangeSet).toHaveBeenCalled();

            const workflow = (validationWorkflowV2 as any).workflows.get('test-id');
            expect(workflow.failureReason).toBe('Validation service error');
        });

        it('should handle Describe Events failure', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            (waitForChangeSetValidation as any).mockResolvedValueOnce({
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: [],
            });

            mockCfnServiceV2.describeEvents = vi.fn().mockRejectedValueOnce(new Error('Describe Events failed'));

            await validationWorkflowV2.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack');

            const workflow = (validationWorkflowV2 as any).workflows.get('test-id');
            expect(workflow.failureReason).toBe('Describe Events failed');
        });
    });
});
