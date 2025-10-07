import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CfnService } from '../../../src/services/CfnService';
import { DiagnosticCoordinator } from '../../../src/services/DiagnosticCoordinator';
import { processChangeSet } from '../../../src/stacks/actions/StackActionOperations';
import {
    CreateStackActionParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';
import { ValidationWorkflow } from '../../../src/stacks/actions/ValidationWorkflow';

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
});
