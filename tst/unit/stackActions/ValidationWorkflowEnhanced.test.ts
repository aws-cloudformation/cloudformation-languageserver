import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StackActionPhase, StackActionState } from '../../../src/stacks/actions/StackActionRequestType';
import { ValidationWorkflow } from '../../../src/stacks/actions/ValidationWorkflow';

describe('ValidationWorkflow Enhanced Features', () => {
    let workflow: ValidationWorkflow;
    let mockCfnService: any;
    let mockValidationManager: any;

    beforeEach(() => {
        mockCfnService = {
            describeStacks: vi.fn(),
            createChangeSet: vi.fn(),
            waitUntilChangeSetCreateComplete: vi.fn(),
            describeChangeSet: vi.fn(),
            deleteChangeSet: vi.fn(),
            deleteStack: vi.fn(),
        };

        mockValidationManager = {
            add: vi.fn(),
            get: vi.fn(),
            remove: vi.fn(),
        };

        workflow = new ValidationWorkflow(
            mockCfnService,
            { get: vi.fn().mockReturnValue({ getText: () => '{}', contents: () => '{}' }) } as any, // DocumentManager
            {} as any, // DiagnosticCoordinator
            {} as any, // SyntaxTreeManager
            mockValidationManager,
        );
    });

    it('should create and store validation on start', async () => {
        mockCfnService.describeStacks.mockRejectedValue(new Error('Stack not found'));
        mockCfnService.createChangeSet.mockResolvedValue({});

        const params = {
            id: 'test-id',
            uri: 'test.yaml',
            stackName: 'test-stack',
            parameters: [],
            capabilities: [],
        };

        await workflow.start(params);

        expect(mockValidationManager.add).toHaveBeenCalled();
        // Verify that add was called with a validation object
        const addCall = mockValidationManager.add.mock.calls[0];
        expect(addCall[0]).toBeDefined();
        expect(addCall[0].getStackName()).toBe('test-stack');
    });

    it('should update validation phase on successful completion', async () => {
        const mockValidation = {
            setPhase: vi.fn(),
            setChanges: vi.fn(),
        };

        mockValidationManager.get.mockReturnValue(mockValidation);

        // Mock successful response
        mockCfnService.waitUntilChangeSetCreateComplete.mockResolvedValue({
            state: 'SUCCESS',
        });
        mockCfnService.describeChangeSet.mockResolvedValue({
            Status: 'CREATE_COMPLETE',
            Changes: [{ Type: 'Resource' }],
        });

        workflow['workflows'].set('test-id', {
            id: 'test-id',
            changeSetName: 'test-changeset',
            stackName: 'test-stack',
            phase: StackActionPhase.VALIDATION_IN_PROGRESS,
            startTime: Date.now(),
            state: StackActionState.IN_PROGRESS,
        });

        await workflow['runValidationAsync'](
            {
                uri: 'test-uri',
                id: 'test-id',
                stackName: 'test-stack',
            },
            'test-changeset',
            ChangeSetType.CREATE,
        );

        expect(mockValidation.setPhase).toHaveBeenCalledWith(StackActionPhase.VALIDATION_COMPLETE);
        expect(mockValidation.setChanges).toHaveBeenCalled();
    });

    it('should update validation status on failure', async () => {
        const mockValidation = {
            setPhase: vi.fn(),
            setChanges: vi.fn(),
        };

        mockValidationManager.get.mockReturnValue(mockValidation);
        mockCfnService.waitUntilChangeSetCreateComplete.mockRejectedValue(new Error('Test error'));

        workflow['workflows'].set('test-id', {
            id: 'test-id',
            changeSetName: 'test-changeset',
            stackName: 'test-stack',
            phase: StackActionPhase.VALIDATION_IN_PROGRESS,
            startTime: Date.now(),
            state: StackActionState.IN_PROGRESS,
        });

        await workflow['runValidationAsync'](
            {
                uri: 'test-uri',
                id: 'test-id',
                stackName: 'test-stack',
            },
            'test-changeset',
            ChangeSetType.CREATE,
        );

        expect(mockValidation.setPhase).toHaveBeenCalledWith(StackActionPhase.VALIDATION_FAILED);
    });

    it('should cleanup validation object after workflow completion', async () => {
        const mockValidation = {
            setPhase: vi.fn(),
            setChanges: vi.fn(),
        };

        mockValidationManager.get.mockReturnValue(mockValidation);
        mockCfnService.waitUntilChangeSetCreateComplete.mockRejectedValue(new Error('Test error'));

        workflow['workflows'].set('test-id', {
            id: 'test-id',
            changeSetName: 'test-changeset',
            stackName: 'test-stack',
            phase: StackActionPhase.VALIDATION_IN_PROGRESS,
            startTime: Date.now(),
            state: StackActionState.IN_PROGRESS,
        });

        await workflow['runValidationAsync'](
            {
                uri: 'test-uri',
                id: 'test-id',
                stackName: 'test-stack',
            },
            'test-changeset',
            ChangeSetType.CREATE,
        );

        expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack');
    });

    describe('Public API Integration Tests', () => {
        it('should handle complete workflow through public methods', async () => {
            const mockValidation = {
                setPhase: vi.fn(),
                setChanges: vi.fn(),
            };

            mockValidationManager.get.mockReturnValue(mockValidation);
            mockCfnService.describeStacks.mockRejectedValue(new Error('Stack not found'));
            mockCfnService.createChangeSet.mockResolvedValue({});

            // Mock successful validation
            mockCfnService.waitUntilChangeSetCreateComplete.mockResolvedValue({
                state: 'SUCCESS',
            });
            mockCfnService.describeChangeSet.mockResolvedValue({
                Status: 'CREATE_COMPLETE',
                Changes: [{ Type: 'Resource' }],
            });

            const params = {
                id: 'test-id',
                uri: 'test.yaml',
                stackName: 'test-stack',
                parameters: [],
                capabilities: [],
            };

            // Start workflow through public API
            const startResult = await workflow.start(params);
            expect(startResult.id).toBe('test-id');
            expect(mockValidationManager.add).toHaveBeenCalled();

            // Allow async validation to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Check status through public API
            const statusResult = workflow.getStatus({ id: 'test-id' });
            expect(statusResult.id).toBe('test-id');
        });

        it('should handle workflow failure through public methods', async () => {
            const mockValidation = {
                setPhase: vi.fn(),
                setChanges: vi.fn(),
            };

            mockValidationManager.get.mockReturnValue(mockValidation);
            mockCfnService.describeStacks.mockRejectedValue(new Error('Stack not found'));
            mockCfnService.createChangeSet.mockResolvedValue({});

            // Mock validation failure
            mockCfnService.waitUntilChangeSetCreateComplete.mockRejectedValue(new Error('Validation failed'));

            const params = {
                id: 'test-id-fail',
                uri: 'test.yaml',
                stackName: 'test-stack-fail',
                parameters: [],
                capabilities: [],
            };

            // Start workflow through public API
            const startResult = await workflow.start(params);
            expect(startResult.id).toBe('test-id-fail');
            expect(mockValidationManager.add).toHaveBeenCalled();

            // Allow async validation to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Verify validation manager was called appropriately
            expect(mockValidationManager.remove).toHaveBeenCalledWith('test-stack-fail');
        });
    });
});
