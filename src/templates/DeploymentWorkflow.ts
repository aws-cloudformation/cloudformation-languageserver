import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { DocumentManager } from '../document/DocumentManager';
import { Identifiable } from '../protocol/LspTypes';
import { ServerComponents } from '../server/ServerComponents';
import { CfnService } from '../services/CfnService';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import {
    TemplateActionParams,
    TemplateActionResult,
    TemplateStatus,
    WorkflowResult,
    TemplateStatusResult,
} from './TemplateRequestType';
import { processChangeSet, waitForValidation, waitForDeployment } from './TemplateWorkflowOperations';
import { TemplateWorkflowState, TemplateWorkflow } from './TemplateWorkflowType';

export class DeploymentWorkflow implements TemplateWorkflow {
    private readonly workflows = new Map<string, TemplateWorkflowState>();
    private readonly log = LoggerFactory.getLogger(DeploymentWorkflow);

    constructor(
        private readonly cfnService: CfnService,
        private readonly documentManager: DocumentManager,
    ) {}

    static create(components: ServerComponents): DeploymentWorkflow {
        return new DeploymentWorkflow(components.cfnService, components.documentManager);
    }

    async start(params: TemplateActionParams): Promise<TemplateActionResult> {
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
            status: TemplateStatus.VALIDATION_IN_PROGRESS,
            startTime: Date.now(),
            result: WorkflowResult.IN_PROGRESS,
        });

        void this.runDeploymentAsync(params.id, changeSetName, params.stackName, changeSetType);

        return {
            id: params.id,
            changeSetName: changeSetName,
            stackName: params.stackName,
        };
    }

    getStatus(params: Identifiable): TemplateStatusResult {
        const workflow = this.workflows.get(params.id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${params.id}`);
        }

        return {
            status: workflow.status,
            result: workflow.result,
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
                status: validationResult.status,
                result: validationResult.result,
                changes: validationResult.changes,
            });

            if (validationResult.result === WorkflowResult.FAILED) {
                return;
            }

            this.workflows.set(workflowId, {
                ...existingWorkflow,
                status: TemplateStatus.VALIDATION_COMPLETE,
                result: WorkflowResult.IN_PROGRESS,
                changes: validationResult.changes,
            });

            await this.cfnService.executeChangeSet({
                StackName: stackName,
                ChangeSetName: changeSetName,
            });

            this.workflows.set(workflowId, {
                ...existingWorkflow,
                status: TemplateStatus.DEPLOYMENT_IN_PROGRESS,
                result: WorkflowResult.IN_PROGRESS,
                changes: validationResult.changes,
            });

            const deploymentResult = await waitForDeployment(this.cfnService, stackName, changeSetType);

            this.workflows.set(workflowId, {
                ...existingWorkflow,
                status: deploymentResult.status,
                result: deploymentResult.result,
                changes: validationResult.changes,
            });
        } catch (error) {
            this.log.error({ error, workflowId }, 'Deployment workflow failed');
            this.workflows.set(workflowId, {
                ...existingWorkflow,
                status: validationResult ? TemplateStatus.DEPLOYMENT_FAILED : TemplateStatus.VALIDATION_FAILED,
                result: WorkflowResult.FAILED,
                changes: validationResult?.changes,
            });
        }
    }
}
