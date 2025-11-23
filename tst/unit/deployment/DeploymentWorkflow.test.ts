import { readFileSync } from 'fs';
import { join } from 'path';
import { WaiterState } from '@smithy/util-waiter';
import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { DeploymentWorkflow } from '../../../src/stacks/actions/DeploymentWorkflow';
import {
    CreateDeploymentParams,
    StackActionPhase,
    StackActionState,
} from '../../../src/stacks/actions/StackActionRequestType';
import { createMockComponents } from '../../utils/MockServerComponents';

const TEMPLATE_PATH = join(__dirname, '../../resources/templates/simple.yaml');
const TEST_TEMPLATE_URI = `file://${TEMPLATE_PATH}`;

describe('DeploymentWorkflow', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let deploymentWorkflow: DeploymentWorkflow;

    beforeEach(() => {
        mockComponents = createMockComponents();

        const templateContent = readFileSync(TEMPLATE_PATH, 'utf8');
        mockComponents.documentManager.get.withArgs(TEST_TEMPLATE_URI).returns({
            contents: () => templateContent,
            uri: TEST_TEMPLATE_URI,
            documentType: DocumentType.YAML,
        } as any);

        mockComponents.cfnService.describeChangeSet.resolves({
            Status: 'CREATE_COMPLETE',
            Changes: [{ ResourceChange: { Action: 'Add', LogicalResourceId: 'TestResource' } }],
            $metadata: {},
        });
        mockComponents.cfnService.describeStacks.resolves({
            Stacks: [
                {
                    StackName: 'test-stack',
                    StackStatus: 'CREATE_COMPLETE',
                    CreationTime: new Date(),
                },
            ],
            $metadata: {},
        });
        mockComponents.cfnService.executeChangeSet.resolves({ $metadata: {} });
        mockComponents.cfnService.waitUntilStackUpdateComplete.resolves({ state: WaiterState.SUCCESS });
        mockComponents.cfnService.waitUntilStackImportComplete.resolves({ state: WaiterState.SUCCESS });
        mockComponents.cfnService.describeStackEvents.resolves({
            StackEvents: [
                {
                    EventId: 'event-1',
                    StackId:
                        'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/12345678-1234-1234-1234-123456789012',
                    StackName: 'test-stack',
                    LogicalResourceId: 'TestResource',
                    ResourceStatus: 'CREATE_COMPLETE',
                    Timestamp: new Date(),
                },
            ],
            $metadata: {},
        });

        deploymentWorkflow = new DeploymentWorkflow(mockComponents.cfnService, mockComponents.documentManager);
    });

    it('should complete deployment workflow', async () => {
        const params: CreateDeploymentParams = {
            id: 'test-deployment-1',
            changeSetName: 'test-changeset',
            stackName: 'test-stack',
        };

        const result = await deploymentWorkflow.start(params);
        await new Promise((resolve) => setTimeout(resolve, 25));

        expect(result.id).toBe('test-deployment-1');
        expect(result.changeSetName).toBe('test-changeset');
        expect(result.stackName).toBe('test-stack');

        expect(mockComponents.cfnService.describeChangeSet.called).toBe(true);
        expect(mockComponents.cfnService.executeChangeSet.called).toBe(true);

        const executeChangeSetArgs = mockComponents.cfnService.executeChangeSet.getCall(0).args[0];
        expect(executeChangeSetArgs.ChangeSetName).toBe('test-changeset');
        expect(executeChangeSetArgs.StackName).toBe('test-stack');

        const status = deploymentWorkflow.getStatus({ id: 'test-deployment-1' });
        expect(status.phase).toBe(StackActionPhase.DEPLOYMENT_COMPLETE);
        expect(status.state).toBe(StackActionState.SUCCESSFUL);
    });

    it('should handle import deployment', async () => {
        mockComponents.cfnService.describeChangeSet.resolves({
            Status: 'CREATE_COMPLETE',
            Changes: [{ ResourceChange: { Action: 'Import', LogicalResourceId: 'ImportedResource' } }],
            $metadata: {},
        });
        mockComponents.cfnService.describeStacks.resolves({
            Stacks: [
                {
                    StackName: 'test-stack',
                    StackStatus: 'CREATE_COMPLETE',
                    CreationTime: new Date(),
                },
            ],
            $metadata: {},
        });
        mockComponents.cfnService.executeChangeSet.resolves({ $metadata: {} });
        mockComponents.cfnService.waitUntilStackUpdateComplete.resolves({ state: WaiterState.SUCCESS });

        const params: CreateDeploymentParams = {
            id: 'test-deployment-import',
            changeSetName: 'test-import-changeset',
            stackName: 'test-stack',
        };

        await deploymentWorkflow.start(params);
        await new Promise((resolve) => setTimeout(resolve, 25));

        expect(mockComponents.cfnService.executeChangeSet.called).toBe(true);
        const executeChangeSetArgs = mockComponents.cfnService.executeChangeSet.getCall(0).args[0];
        expect(executeChangeSetArgs.ChangeSetName).toBe('test-import-changeset');

        const status = deploymentWorkflow.getStatus({ id: 'test-deployment-import' });
        expect(status.phase).toBe(StackActionPhase.DEPLOYMENT_COMPLETE);
        expect(status.state).toBe(StackActionState.SUCCESSFUL);
    });

    it('should handle deployment failure', async () => {
        mockComponents.cfnService.executeChangeSet.rejects(new Error('Deployment failed'));

        const params: CreateDeploymentParams = {
            id: 'test-deployment-2',
            changeSetName: 'test-changeset',
            stackName: 'test-stack',
        };

        await expect(deploymentWorkflow.start(params)).rejects.toThrow('Deployment failed');

        expect(mockComponents.cfnService.executeChangeSet.called).toBe(true);

        const status = deploymentWorkflow.getStatus({ id: 'test-deployment-2' });
        expect(status.phase).toBe(StackActionPhase.DEPLOYMENT_FAILED);
        expect(status.state).toBe(StackActionState.FAILED);
    });

    it('should handle changeset not found', async () => {
        mockComponents.cfnService.describeChangeSet.rejects(new Error('ChangeSet not found'));

        const params: CreateDeploymentParams = {
            id: 'test-deployment-3',
            changeSetName: 'non-existent-changeset',
            stackName: 'test-stack',
        };

        await expect(deploymentWorkflow.start(params)).rejects.toThrow('ChangeSet not found');

        expect(mockComponents.cfnService.executeChangeSet.called).toBe(false);

        const status = deploymentWorkflow.getStatus({ id: 'test-deployment-3' });
        expect(status.phase).toBe(StackActionPhase.DEPLOYMENT_FAILED);
        expect(status.state).toBe(StackActionState.FAILED);
    });
});
