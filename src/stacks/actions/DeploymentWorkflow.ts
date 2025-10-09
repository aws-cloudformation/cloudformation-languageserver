import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { DocumentManager } from '../../document/DocumentManager';
import { Identifiable } from '../../protocol/LspTypes';
import { ServerComponents } from '../../server/ServerComponents';
import { CfnService } from '../../services/CfnService';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { processChangeSet, waitForValidation, waitForDeployment } from './StackActionOperations';
import {
    CreateStackActionParams,
    CreateStackActionResult,
    StackActionPhase,
    StackActionState,
    GetStackActionStatusResult,
} from './StackActionRequestType';
import { StackActionWorkflowState, StackActionWorkflow } from './StackActionWorkflowType';

export class DeploymentWorkflow implements StackActionWorkflow {
    private readonly workflows = new Map<string, StackActionWorkflowState>();
    private readonly log = LoggerFactory.getLogger(DeploymentWorkflow);

    constructor(
        private readonly cfnService: CfnService,
        private readonly documentManager: DocumentManager,
    ) {}

    static create(components: ServerComponents): DeploymentWorkflow {
        return new DeploymentWorkflow(components.cfnService, components.documentManager);
    }

    async start(params: CreateStackActionParams): Promise<CreateStackActionResult> {
        // Check if stack exists to determine CREATE vs UPDATE
        let changeSetType: ChangeSetType = ChangeSetType.CREATE;
        try {
            await this.cfnService.describeStacks({ StackName: params.stackName });
            changeSetType = ChangeSetType.UPDATE;
        } catch {
            changeSetType = ChangeSetType.CREATE;
        }

        const changeSetName = await processChangeSet(this.cfnService, this.documentManager, params, changeSetType);

        // Set initial workflow state
        this.workflows.set(params.id, {
            id: params.id,
            changeSetName: changeSetName,
            stackName: params.stackName,
            phase: StackActionPhase.VALIDATION_IN_PROGRESS,
            startTime: Date.now(),
            state: StackActionState.IN_PROGRESS,
        });

        void this.runDeploymentAsync(params.id, changeSetName, params.stackName, changeSetType);

        return {
            id: params.id,
            changeSetName: changeSetName,
            stackName: params.stackName,
        };
    }

    getStatus(params: Identifiable): GetStackActionStatusResult {
        const workflow = this.workflows.get(params.id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${params.id}`);
        }

        return {
            phase: workflow.phase,
            state: workflow.state,
            changes: workflow.changes,
            id: workflow.id,
        };
    }

    private async runDeploymentAsync(
        workflowId: string,
        changeSetName: string,
        stackName: string,
        changeSetType: ChangeSetType,
    ): Promise<void> {
        let validationResult;
        const existingWorkflow = this.workflows.get(workflowId);
        if (!existingWorkflow) {
            this.log.error({ workflowId }, 'Workflow not found during async execution');
            return;
        }

        try {
            validationResult = await waitForValidation(this.cfnService, changeSetName, stackName);

            this.workflows.set(workflowId, {
                ...existingWorkflow,
                phase: validationResult.phase,
                state: validationResult.state,
                changes: validationResult.changes,
            });

            if (validationResult.state === StackActionState.FAILED) {
                return;
            }

            this.workflows.set(workflowId, {
                ...existingWorkflow,
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.IN_PROGRESS,
                changes: validationResult.changes,
            });

            await this.cfnService.executeChangeSet({
                StackName: stackName,
                ChangeSetName: changeSetName,
            });

            this.workflows.set(workflowId, {
                ...existingWorkflow,
                phase: StackActionPhase.DEPLOYMENT_IN_PROGRESS,
                state: StackActionState.IN_PROGRESS,
                changes: validationResult.changes,
            });

            const deploymentResult = await waitForDeployment(this.cfnService, stackName, changeSetType);

            this.workflows.set(workflowId, {
                ...existingWorkflow,
                phase: deploymentResult.phase,
                state: deploymentResult.state,
                changes: validationResult.changes,
            });
        } catch (error) {
            this.log.error({ error, workflowId }, 'Deployment workflow failed');
            this.workflows.set(workflowId, {
                ...existingWorkflow,
                phase: validationResult ? StackActionPhase.DEPLOYMENT_FAILED : StackActionPhase.VALIDATION_FAILED,
                state: StackActionState.FAILED,
                changes: validationResult?.changes,
            });
        }
    }
}
