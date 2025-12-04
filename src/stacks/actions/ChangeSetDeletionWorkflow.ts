import { WaiterState } from '@smithy/util-waiter';
import { DocumentManager } from '../../document/DocumentManager';
import { Identifiable } from '../../protocol/LspTypes';
import { CfnExternal } from '../../server/CfnExternal';
import { CfnInfraCore } from '../../server/CfnInfraCore';
import { CfnService } from '../../services/CfnService';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { Measure } from '../../telemetry/TelemetryDecorator';
import { extractErrorMessage } from '../../utils/Errors';
import { processWorkflowUpdates, mapChangesToStackChanges, isStackInReview } from './StackActionOperations';
import {
    StackActionPhase,
    StackActionState,
    GetStackActionStatusResult,
    CreateDeploymentParams,
    CreateStackActionResult,
    DeleteChangeSetParams,
    DescribeDeletionStatusResult,
} from './StackActionRequestType';
import { StackActionWorkflow, StackActionWorkflowState } from './StackActionWorkflowType';

export class ChangeSetDeletionWorkflow
    implements StackActionWorkflow<DeleteChangeSetParams, DescribeDeletionStatusResult>
{
    protected readonly workflows = new Map<string, StackActionWorkflowState>();
    protected readonly log = LoggerFactory.getLogger(ChangeSetDeletionWorkflow);

    constructor(
        protected readonly cfnService: CfnService,
        protected readonly documentManager: DocumentManager,
    ) {}

    @Measure({ name: 'changeSetDeletionWorkflow' })
    async start(params: CreateDeploymentParams): Promise<CreateStackActionResult> {
        const describeChangeSetResult = await this.cfnService.describeChangeSet({
            StackName: params.stackName,
            ChangeSetName: params.changeSetName,
            IncludePropertyValues: true,
        });

        const shouldDeleteStack =
            (await isStackInReview(params.stackName, this.cfnService)) &&
            !(await this.hasMultipleChangeSets(params.stackName));

        if (shouldDeleteStack) {
            await this.cfnService.deleteStack({ StackName: params.stackName });
        } else {
            await this.cfnService.deleteChangeSet({
                StackName: params.stackName,
                ChangeSetName: params.changeSetName,
            });
        }

        // Set initial workflow state
        this.workflows.set(params.id, {
            id: params.id,
            changeSetName: params.changeSetName,
            stackName: params.stackName,
            phase: StackActionPhase.DELETION_IN_PROGRESS,
            startTime: Date.now(),
            state: StackActionState.IN_PROGRESS,
            changes: mapChangesToStackChanges(describeChangeSetResult.Changes),
        });

        if (shouldDeleteStack) {
            void this.runStackDeletionAsync(params);
        } else {
            void this.runChangeSetDeletionAsync(params);
        }

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

    describeStatus(params: Identifiable): DescribeDeletionStatusResult {
        const workflow = this.workflows.get(params.id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${params.id}`);
        }

        return {
            ...this.getStatus(params),
            FailureReason: workflow.failureReason,
        };
    }

    protected async runStackDeletionAsync(params: CreateDeploymentParams): Promise<void> {
        const workflowId = params.id;

        let existingWorkflow = this.workflows.get(workflowId);
        if (!existingWorkflow) {
            this.log.error({ workflowId }, 'Workflow not found during async execution');
            return;
        }

        try {
            const deploymentResult = await this.cfnService.waitUntilStackDeleteComplete({
                StackName: params.stackName,
            });

            const isSuccessful = deploymentResult.state === WaiterState.SUCCESS;

            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: isSuccessful ? StackActionPhase.DELETION_COMPLETE : StackActionPhase.DELETION_FAILED,
                state: isSuccessful ? StackActionState.SUCCESSFUL : StackActionState.FAILED,
                failureReason: isSuccessful ? undefined : String(deploymentResult.reason), // reason only appears on failure
            });
        } catch (error) {
            this.log.error(error, `Deletion workflow threw exception ${workflowId}`);
            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: StackActionPhase.DELETION_FAILED,
                state: StackActionState.FAILED,
                failureReason: extractErrorMessage(error),
            });
        }
    }

    protected runChangeSetDeletionAsync(params: CreateDeploymentParams): void {
        const workflowId = params.id;

        let existingWorkflow = this.workflows.get(workflowId);
        if (!existingWorkflow) {
            this.log.error({ workflowId }, 'Workflow not found during async execution');
            return;
        }

        // there is no sdk waiter function for waiting until change set deletes
        const intervalId = setInterval(() => {
            this.cfnService
                .describeChangeSet({
                    StackName: params.stackName,
                    IncludePropertyValues: false,
                    ChangeSetName: params.changeSetName,
                })
                .then(() => {
                    // ChangeSet still exists, continue polling
                })
                .catch((error) => {
                    const extractedError = extractErrorMessage(error);

                    if (extractedError.includes('ChangeSetNotFound') || extractedError.includes('does not exist')) {
                        clearInterval(intervalId);

                        const updatedWorkflow = this.workflows.get(workflowId);
                        if (updatedWorkflow) {
                            existingWorkflow = processWorkflowUpdates(this.workflows, updatedWorkflow, {
                                phase: StackActionPhase.DELETION_COMPLETE,
                                state: StackActionState.SUCCESSFUL,
                            });
                        }
                    } else {
                        clearInterval(intervalId);
                        const updatedWorkflow = this.workflows.get(workflowId);
                        if (updatedWorkflow) {
                            existingWorkflow = processWorkflowUpdates(this.workflows, updatedWorkflow, {
                                phase: StackActionPhase.DELETION_FAILED,
                                state: StackActionState.FAILED,
                                failureReason: extractedError,
                            });
                        }
                    }
                });
        }, 1000); // Poll every 1 second

        setTimeout(() => {
            clearInterval(intervalId);

            const updatedWorkflow = this.workflows.get(workflowId);

            if (updatedWorkflow && updatedWorkflow.state === StackActionState.IN_PROGRESS) {
                existingWorkflow = processWorkflowUpdates(this.workflows, updatedWorkflow, {
                    phase: StackActionPhase.DELETION_FAILED,
                    state: StackActionState.FAILED,
                    failureReason: 'Changeset deletion timeout',
                });
            }
        }, 300_000); // 5 minute timeout
    }

    static create(core: CfnInfraCore, external: CfnExternal): ChangeSetDeletionWorkflow {
        return new ChangeSetDeletionWorkflow(external.cfnService, core.documentManager);
    }

    private async hasMultipleChangeSets(stackName: string): Promise<boolean> {
        const result = await this.cfnService.listChangeSets(stackName);

        const changeSetCount = result.changeSets.length;

        // Minimum one change set per page, if nextToken is defined there is at least two change sets
        if (changeSetCount > 1 || result.nextToken) {
            return true;
        } else {
            return false;
        }
    }
}
