import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { CfnService } from '../../../src/services/CfnService';
import { DeploymentWorkflow } from '../../../src/templates/DeploymentWorkflow';
import { TemplateActionParams, TemplateStatus, WorkflowResult } from '../../../src/templates/TemplateRequestType';
import { processChangeSet } from '../../../src/templates/TemplateWorkflowOperations';

vi.mock('../../../src/templates/TemplateWorkflowOperations');

describe('DeploymentWorkflow', () => {
    let deploymentWorkflow: DeploymentWorkflow;
    let mockCfnService: CfnService;
    let mockDocumentManager: DocumentManager;

    beforeEach(() => {
        mockCfnService = {} as CfnService;
        mockDocumentManager = {} as DocumentManager;
        deploymentWorkflow = new DeploymentWorkflow(mockCfnService, mockDocumentManager);
        vi.clearAllMocks();
    });

    describe('start', () => {
        it('should start deployment workflow with CREATE when stack does not exist', async () => {
            const params: TemplateActionParams = {
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
            const params: TemplateActionParams = {
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
    });

    describe('getStatus', () => {
        it('should return workflow status', () => {
            const params = { id: 'test-id' };

            const workflow = {
                id: 'test-id',
                changeSetName: 'changeset-123',
                stackName: 'test-stack',
                status: TemplateStatus.VALIDATION_IN_PROGRESS,
                startTime: Date.now(),
                result: WorkflowResult.IN_PROGRESS,
            };

            // Directly set workflow state
            (deploymentWorkflow as any).workflows.set('test-id', workflow);

            const result = deploymentWorkflow.getStatus(params);

            expect(result).toEqual({
                status: TemplateStatus.VALIDATION_IN_PROGRESS,
                result: WorkflowResult.IN_PROGRESS,
                changes: undefined,
                id: 'test-id',
            });
        });

        it('should throw error when workflow not found', () => {
            const params = { id: 'nonexistent-id' };

            expect(() => deploymentWorkflow.getStatus(params)).toThrow('Workflow not found: nonexistent-id');
        });
    });
});
