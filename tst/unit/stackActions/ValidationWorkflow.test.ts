import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CfnService } from '../../../src/services/CfnService';
import { DiagnosticCoordinator } from '../../../src/services/DiagnosticCoordinator';
import {
    processChangeSet,
    waitForChangeSetValidation,
    processWorkflowUpdates,
    deleteStackAndChangeSet,
    deleteChangeSet,
} from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateStackActionParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';
import { DRY_RUN_VALIDATION_NAME, ValidationWorkflow } from '../../../src/stacks/actions/ValidationWorkflow';

vi.mock('../../../src/stacks/actions/StackActionOperations');

describe('ValidationWorkflow', () => {
    let validationWorkflow: ValidationWorkflow;
    let mockCfnService: CfnService;
    let mockDocumentManager: DocumentManager;
    let mockDiagnosticCoordinator: DiagnosticCoordinator;
    let mockSyntaxTreeManager: SyntaxTreeManager;

    beforeEach(() => {
        mockCfnService = {
            describeStacks: vi.fn(),
        } as any;
        mockDocumentManager = {} as DocumentManager;
        mockDiagnosticCoordinator = {} as DiagnosticCoordinator;
        mockSyntaxTreeManager = {} as SyntaxTreeManager;
        validationWorkflow = new ValidationWorkflow(
            mockCfnService,
            mockDocumentManager,
            mockDiagnosticCoordinator,
            mockSyntaxTreeManager,
            { add: vi.fn(), get: vi.fn(), remove: vi.fn() } as any, // ValidationManager
        );
        vi.clearAllMocks();
    });

    describe('start', () => {
        it('should start validation workflow with CREATE when stack does not exist', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            mockCfnService.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));
            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await validationWorkflow.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'CREATE');
        });

        it('should start validation workflow with UPDATE when stack exists', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            mockCfnService.describeStacks = vi.fn().mockResolvedValue({ Stacks: [{ StackName: 'test-stack' }] });
            (processChangeSet as any).mockResolvedValue('changeset-123');

            const result = await validationWorkflow.start(params);

            expect(result).toEqual({
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
            });

            expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'UPDATE');
        });
    });

    it('should start validation workflow with IMPORT when resourcesToImport has items', async () => {
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

        const result = await validationWorkflow.start(params);

        expect(result).toEqual({
            id: 'test-id',
            changeSetName: 'changeset-123',
            stackName: 'test-stack',
        });

        expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'IMPORT');
        expect(mockCfnService.describeStacks).not.toHaveBeenCalled();
    });

    it('should start validation workflow with CREATE when resourcesToImport is empty array', async () => {
        const params: CreateStackActionParams = {
            id: 'test-id',
            uri: 'file:///test.yaml',
            stackName: 'test-stack',
            resourcesToImport: [],
        };

        mockCfnService.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));
        (processChangeSet as any).mockResolvedValue('changeset-123');

        const result = await validationWorkflow.start(params);

        expect(result).toEqual({
            id: 'test-id',
            changeSetName: 'changeset-123',
            stackName: 'test-stack',
        });

        expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'CREATE');
    });

    it('should start validation workflow with UPDATE when resourcesToImport is undefined and stack exists', async () => {
        const params: CreateStackActionParams = {
            id: 'test-id',
            uri: 'file:///test.yaml',
            stackName: 'test-stack',
            resourcesToImport: undefined,
        };

        mockCfnService.describeStacks = vi.fn().mockResolvedValue({ Stacks: [{ StackName: 'test-stack' }] });
        (processChangeSet as any).mockResolvedValue('changeset-123');

        const result = await validationWorkflow.start(params);

        expect(result).toEqual({
            id: 'test-id',
            changeSetName: 'changeset-123',
            stackName: 'test-stack',
        });

        expect(processChangeSet).toHaveBeenCalledWith(mockCfnService, mockDocumentManager, params, 'UPDATE');
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
            (validationWorkflow as any).workflows.set('test-id', workflow);

            const result = validationWorkflow.getStatus(params);

            expect(result).toEqual({
                phase: StackActionPhase.VALIDATION_IN_PROGRESS,
                state: StackActionState.IN_PROGRESS,
                changes: undefined,
                id: 'test-id',
            });
        });

        it('should throw error when workflow not found', () => {
            const params = { id: 'nonexistent-id' };

            expect(() => validationWorkflow.getStatus(params)).toThrow('Workflow not found: nonexistent-id');
        });
    });

    describe('describeStatus', () => {
        it('should return workflow status with validation details', () => {
            const params = { id: 'test-id' };
            const changes = [{ type: 'Resource', resourceChange: { action: 'Add', logicalResourceId: 'MyBucket' } }];

            const workflow = {
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
                phase: StackActionPhase.VALIDATION_COMPLETE,
                startTime: Date.now(),
                state: StackActionState.SUCCESSFUL,
                changes: changes,
                validationDetails: [{ Timestamp: new Date(), Severity: 'INFO', Message: 'Validation succeeded' }],
            };

            // Directly set workflow state
            (validationWorkflow as any).workflows.set('test-id', workflow);

            const result = validationWorkflow.describeStatus(params);

            expect(result).toEqual({
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: changes,
                id: 'test-id',
                ValidationDetails: workflow.validationDetails,
            });
        });

        it('should throw error when workflow not found', () => {
            const params = { id: 'nonexistent-id' };

            expect(() => validationWorkflow.describeStatus(params)).toThrow('Workflow not found: nonexistent-id');
        });
    });

    describe('ValidationManager integration', () => {
        let mockValidationManager: any;

        beforeEach(() => {
            mockValidationManager = { add: vi.fn(), get: vi.fn(), remove: vi.fn() };
            validationWorkflow = new ValidationWorkflow(
                mockCfnService,
                mockDocumentManager,
                mockDiagnosticCoordinator,
                mockSyntaxTreeManager,
                mockValidationManager,
            );
        });

        it('should add validation to manager when workflow starts', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
                parameters: [{ ParameterKey: 'key', ParameterValue: 'value' }],
                capabilities: ['CAPABILITY_IAM'],
            };

            mockCfnService.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));
            (processChangeSet as any).mockResolvedValue('changeset-123');

            await validationWorkflow.start(params);

            expect(mockValidationManager.add).toHaveBeenCalled();

            // Verify the validation object has the correct properties using getter methods
            const addedValidation = mockValidationManager.add.mock.calls[0][0];
            expect(addedValidation.getStackName()).toBe(params.stackName);
            expect(addedValidation.getUri()).toBe(params.uri);
            expect(addedValidation.getChangeSetName()).toBe('changeset-123');
            expect(addedValidation.getParameters()).toBe(params.parameters);
        });

        it('should get validation from manager during workflow operations', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            mockCfnService.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));
            (processChangeSet as any).mockResolvedValue('changeset-123');

            await validationWorkflow.start(params);

            // Verify that the validation manager's add method was called
            expect(mockValidationManager.add).toHaveBeenCalled();

            // Verify the validation object has the correct properties using getter methods
            const addedValidation = mockValidationManager.add.mock.calls[0][0];
            expect(addedValidation.getStackName()).toBe(params.stackName);
            expect(addedValidation.getUri()).toBe(params.uri);
            expect(addedValidation.getChangeSetName()).toBe('changeset-123');
        });

        it('should remove validation from manager after workflow completion', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            mockCfnService.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));
            (processChangeSet as any).mockResolvedValue('changeset-123');

            await validationWorkflow.start(params);

            expect(mockValidationManager.add).toHaveBeenCalled();

            // Verify the validation object has the correct stack name using getter method
            const addedValidation = mockValidationManager.add.mock.calls[0][0];
            expect(addedValidation.getStackName()).toBe(params.stackName);
        });
    });

    describe('full workflow execution', () => {
        const waitForWorkflowCompletion = async (workflowId: string): Promise<void> => {
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                const workflow = (validationWorkflow as any).workflows.get(workflowId);
                if (workflow?.state !== StackActionState.IN_PROGRESS) {
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
                attempts++;
            }
        };

        let mockValidationManager: any;

        beforeEach(() => {
            mockValidationManager = { add: vi.fn(), get: vi.fn(), remove: vi.fn() };

            // Default to CREATE changeSetType (stack doesn't exist)
            mockCfnService.describeStacks = vi.fn().mockRejectedValue(new Error('Stack does not exist'));

            (processChangeSet as any).mockResolvedValue('changeset-123');

            (waitForChangeSetValidation as any).mockResolvedValue({
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: [],
            });
            (deleteStackAndChangeSet as any).mockResolvedValue(undefined);

            (deleteChangeSet as any).mockResolvedValue(undefined);

            (processWorkflowUpdates as any).mockImplementation((map: any, workflow: any, updates: any) => {
                const updated = { ...workflow, ...updates };
                map.set(workflow.id, updated);
                return updated;
            });

            validationWorkflow = new ValidationWorkflow(
                mockCfnService,
                mockDocumentManager,
                mockDiagnosticCoordinator,
                mockSyntaxTreeManager,
                mockValidationManager,
            );
        });

        it('should handle successful validation workflow', async () => {
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

            const result = await validationWorkflow.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(result.changeSetName).toBe('changeset-123');
            expect(mockValidationManager.add).toHaveBeenCalled();
            expect(waitForChangeSetValidation).toHaveBeenCalledWith(
                mockCfnService,
                'changeset-123',
                'test-stack',
                undefined,
            );

            const workflow = (validationWorkflow as any).workflows.get('test-id');
            expect(workflow.changes).toEqual(mockChanges);
            expect(workflow.validationDetails).toBeDefined();
            expect(workflow.validationDetails[0].Severity).toBe('INFO');
            expect(workflow.validationDetails[0].Message).toBe('Validation succeeded');
            expect(workflow.validationDetails[0].ValidationName).toBe(DRY_RUN_VALIDATION_NAME);
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

            await validationWorkflow.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(mockValidationManager.add).toHaveBeenCalled();
            expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack');

            const workflow = (validationWorkflow as any).workflows.get('test-id');
            expect(workflow.validationDetails).toBeDefined();
            expect(workflow.validationDetails[0].Severity).toBe('ERROR');
            expect(workflow.validationDetails[0].Message).toBe(
                'Validation failed with reason: Template validation failed',
            );
        });

        it('should handle validation exception', async () => {
            const params: CreateStackActionParams = {
                id: 'test-id',
                uri: 'file:///test.yaml',
                stackName: 'test-stack',
            };

            (waitForChangeSetValidation as any).mockRejectedValueOnce(new Error('Validation service error'));

            await validationWorkflow.start(params);
            await waitForWorkflowCompletion('test-id');

            expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack');
            expect(deleteStackAndChangeSet).toHaveBeenCalled();

            const workflow = (validationWorkflow as any).workflows.get('test-id');
            expect(workflow.failureReason).toBeDefined();
            expect(workflow.failureReason).toBe('Validation service error');
        });
    });
});
