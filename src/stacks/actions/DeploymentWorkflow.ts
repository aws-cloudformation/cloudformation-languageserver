import { ChangeSetType, DescribeChangeSetCommandOutput } from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import { DocumentManager } from '../../document/DocumentManager';
import { Identifiable } from '../../protocol/LspTypes';
import { CfnExternal } from '../../server/CfnExternal';
import { CfnInfraCore } from '../../server/CfnInfraCore';
import { CfnService } from '../../services/CfnService';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';
import {
    waitForDeployment,
    processWorkflowUpdates,
    mapChangesToStackChanges,
    isStackInReview,
} from './StackActionOperations';
import {
    StackActionPhase,
    StackActionState,
    GetStackActionStatusResult,
    DeploymentEvent,
    DescribeDeploymentStatusResult,
    CreateDeploymentParams,
    CreateStackActionResult,
} from './StackActionRequestType';
import { StackActionWorkflow, StackActionWorkflowState } from './StackActionWorkflowType';

export class DeploymentWorkflow implements StackActionWorkflow<CreateDeploymentParams, DescribeDeploymentStatusResult> {
    protected readonly workflows = new Map<string, StackActionWorkflowState>();
    protected readonly log = LoggerFactory.getLogger(DeploymentWorkflow);

    constructor(
        protected readonly cfnService: CfnService,
        protected readonly documentManager: DocumentManager,
    ) {}

    async start(params: CreateDeploymentParams): Promise<CreateStackActionResult> {
        const describeChangeSetResult = await this.cfnService.describeChangeSet({
            StackName: params.stackName,
            ChangeSetName: params.changeSetName,
            IncludePropertyValues: true,
        });

        const changeSetType = await this.determineChangeSetType(
            describeChangeSetResult,
            params.stackName,
            this.cfnService,
        );

        await this.cfnService.executeChangeSet({
            StackName: params.stackName,
            ChangeSetName: params.changeSetName,
            ClientRequestToken: params.id,
        });

        // Set initial workflow state
        this.workflows.set(params.id, {
            id: params.id,
            changeSetName: params.changeSetName,
            stackName: params.stackName,
            phase: StackActionPhase.DEPLOYMENT_IN_PROGRESS,
            startTime: Date.now(),
            state: StackActionState.IN_PROGRESS,
            changes: mapChangesToStackChanges(describeChangeSetResult.Changes),
        });

        void this.runDeploymentAsync(params, changeSetType);

        return params;
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

    describeStatus(params: Identifiable): DescribeDeploymentStatusResult {
        const workflow = this.workflows.get(params.id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${params.id}`);
        }

        return {
            ...this.getStatus(params),
            DeploymentEvents: workflow.deploymentEvents,
            FailureReason: workflow.failureReason,
        };
    }

    protected async runDeploymentAsync(params: CreateDeploymentParams, changeSetType: ChangeSetType): Promise<void> {
        const workflowId = params.id;
        const stackName = params.stackName;

        let existingWorkflow = this.workflows.get(workflowId);
        if (!existingWorkflow) {
            this.log.error({ workflowId }, 'Workflow not found during async execution');
            return;
        }

        try {
            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                ...existingWorkflow,
                phase: StackActionPhase.DEPLOYMENT_IN_PROGRESS,
                state: StackActionState.IN_PROGRESS,
            });

            const deploymentResult = await waitForDeployment(this.cfnService, stackName, changeSetType);

            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: deploymentResult.phase,
                state: deploymentResult.state,
            });
        } catch (error) {
            this.log.error({ error, workflowId }, 'Deployment workflow threw exception');
            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: StackActionPhase.DEPLOYMENT_FAILED,
                state: StackActionState.FAILED,
                failureReason: extractErrorMessage(error),
            });
        } finally {
            await this.processDeploymentEvents(existingWorkflow, stackName); // Even if the deployment fails, some deployment events may have occurred
        }
    }

    protected async processDeploymentEvents(
        existingWorkflow: StackActionWorkflowState,
        stackName: string,
    ): Promise<void> {
        try {
            const stackEventsResponse = await this.cfnService.describeStackEvents(
                { StackName: stackName },
                existingWorkflow.id,
            );

            const deploymentEvents: DeploymentEvent[] =
                stackEventsResponse.StackEvents?.map((event) => ({
                    LogicalResourceId: event.LogicalResourceId,
                    ResourceType: event.ResourceType,
                    Timestamp: event.Timestamp ? DateTime.fromJSDate(event.Timestamp) : undefined,
                    ResourceStatus: event.ResourceStatus,
                    ResourceStatusReason: event.ResourceStatusReason,
                    DetailedStatus: event.DetailedStatus,
                })) ?? [];

            processWorkflowUpdates(this.workflows, existingWorkflow, {
                deploymentEvents: deploymentEvents,
            });
        } catch (error) {
            this.log.error({ error, stackName }, 'Failed to process deployment events');

            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: StackActionPhase.DEPLOYMENT_FAILED,
                state: StackActionState.FAILED,
                failureReason: extractErrorMessage(error),
            });
        }
    }

    static create(core: CfnInfraCore, external: CfnExternal): DeploymentWorkflow {
        return new DeploymentWorkflow(external.cfnService, core.documentManager);
    }

    private async determineChangeSetType(
        describeChangeSetResult: DescribeChangeSetCommandOutput,
        stackName: string,
        cfnService: CfnService,
    ): Promise<ChangeSetType> {
        if (describeChangeSetResult.Changes?.some((change) => change.ResourceChange?.Action === 'Import')) {
            return ChangeSetType.IMPORT;
        } else if (await isStackInReview(stackName, cfnService)) {
            return ChangeSetType.CREATE;
        } else {
            return ChangeSetType.UPDATE;
        }
    }
}
