import { ChangeSetType, StackEvent } from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import { DocumentManager } from '../../document/DocumentManager';
import { Identifiable } from '../../protocol/LspTypes';
import { CfnExternal } from '../../server/CfnExternal';
import { CfnInfraCore } from '../../server/CfnInfraCore';
import { CfnService } from '../../services/CfnService';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';
import {
    processChangeSet,
    waitForChangeSetValidation,
    waitForDeployment,
    processWorkflowUpdates,
} from './StackActionOperations';
import {
    CreateStackActionParams,
    CreateStackActionResult,
    StackActionPhase,
    StackActionState,
    GetStackActionStatusResult,
    DescribeDeploymentStatusResult,
    DeploymentEvent,
} from './StackActionRequestType';
import { StackActionWorkflowState, StackActionWorkflow } from './StackActionWorkflowType';
import { DRY_RUN_VALIDATION_NAME } from './ValidationWorkflow';

export class DeploymentWorkflow implements StackActionWorkflow<DescribeDeploymentStatusResult> {
    protected readonly workflows = new Map<string, StackActionWorkflowState>();
    protected readonly log = LoggerFactory.getLogger(DeploymentWorkflow);

    constructor(
        protected readonly cfnService: CfnService,
        protected readonly documentManager: DocumentManager,
    ) {}

    async start(params: CreateStackActionParams): Promise<CreateStackActionResult> {
        // Determine ChangeSet type based on resourcesToImport and stack existence
        let changeSetType: ChangeSetType;

        if (params.resourcesToImport && params.resourcesToImport.length > 0) {
            changeSetType = ChangeSetType.IMPORT;
        } else {
            try {
                await this.cfnService.describeStacks({ StackName: params.stackName });
                changeSetType = ChangeSetType.UPDATE;
            } catch {
                changeSetType = ChangeSetType.CREATE;
            }
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

        void this.runDeploymentAsync(params, changeSetName, changeSetType);

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

    describeStatus(params: Identifiable): DescribeDeploymentStatusResult {
        const workflow = this.workflows.get(params.id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${params.id}`);
        }

        return {
            ...this.getStatus(params),
            ValidationDetails: workflow.validationDetails,
            DeploymentEvents: workflow.deploymentEvents,
            FailureReason: workflow.failureReason,
        };
    }

    protected async runDeploymentAsync(
        params: CreateStackActionParams,
        changeSetName: string,
        changeSetType: ChangeSetType,
    ): Promise<void> {
        const workflowId = params.id;
        const stackName = params.stackName;

        let validationResult;
        let existingWorkflow = this.workflows.get(workflowId);
        if (!existingWorkflow) {
            this.log.error({ workflowId }, 'Workflow not found during async execution');
            return;
        }

        try {
            validationResult = await waitForChangeSetValidation(this.cfnService, changeSetName, stackName);

            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: validationResult.phase,
                changes: validationResult.changes,
            });

            if (validationResult.state === StackActionState.FAILED) {
                existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                    state: StackActionState.FAILED,
                    validationDetails: [
                        {
                            ValidationName: DRY_RUN_VALIDATION_NAME,
                            Timestamp: DateTime.now(),
                            Severity: 'ERROR',
                            Message: `Validation failed with reason: ${validationResult.failureReason}`,
                        },
                    ],
                });

                return;
            } else {
                existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                    validationDetails: [
                        {
                            ValidationName: DRY_RUN_VALIDATION_NAME,
                            Timestamp: DateTime.now(),
                            Severity: 'INFO',
                            Message: 'Validation succeeded',
                        },
                    ],
                });
            }
        } catch (error) {
            this.log.error({ error, workflowId }, 'Deployment workflow threw exception during validation phase');
            processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: StackActionPhase.VALIDATION_FAILED,
                state: StackActionState.FAILED,
                failureReason: extractErrorMessage(error),
            });

            return;
        }

        try {
            await this.cfnService.executeChangeSet({
                StackName: stackName,
                ChangeSetName: changeSetName,
                ClientRequestToken: workflowId,
            });
        } catch (error) {
            this.log.error({ error, workflowId }, 'Deployment workflow threw exception during deployment start phase');
            processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: StackActionPhase.DEPLOYMENT_FAILED,
                state: StackActionState.FAILED,
                failureReason: extractErrorMessage(error),
            });

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
            this.log.error({ error, workflowId }, 'Deployment workflow threw exception during deployment phase');
            processWorkflowUpdates(this.workflows, existingWorkflow, {
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
            // Fetch all events for the workflow
            let nextToken: string | undefined;
            const allEvents: StackEvent[] = [];
            do {
                const stackEventsResponse = await this.cfnService.describeStackEvents(
                    { StackName: stackName },
                    { nextToken },
                );

                const events = stackEventsResponse.StackEvents ?? [];
                const matchingEvents = events.filter((event) => event.ClientRequestToken === existingWorkflow.id);

                allEvents.push(...matchingEvents);

                // Stop if no more events match the client request token
                if (matchingEvents.length === 0) {
                    break;
                }

                nextToken = stackEventsResponse.NextToken;
            } while (nextToken);

            const deploymentEvents: DeploymentEvent[] =
                allEvents.map((event) => ({
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
        }
    }

    static create(core: CfnInfraCore, external: CfnExternal): DeploymentWorkflow {
        return new DeploymentWorkflow(external.cfnService, core.documentManager);
    }
}
