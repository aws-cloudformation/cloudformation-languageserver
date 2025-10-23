import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import { SyntaxTreeManager } from '../../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../document/DocumentManager';
import { CfnExternal } from '../../server/CfnExternal';
import { CfnInfraCore } from '../../server/CfnInfraCore';
import { CfnServiceV2 } from '../../services/CfnServiceV2';
import { DiagnosticCoordinator } from '../../services/DiagnosticCoordinator';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';
import { DeploymentWorkflow } from './DeploymentWorkflow';
import {
    waitForChangeSetValidation,
    waitForDeployment,
    processWorkflowUpdates,
    parseValidationEvents,
    publishValidationDiagnostics,
} from './StackActionOperations';
import { CreateStackActionParams, StackActionPhase, StackActionState } from './StackActionRequestType';
import { DRY_RUN_VALIDATION_NAME } from './ValidationWorkflow';
import { VALIDATION_V2_NAME } from './ValidationWorkflowV2';

export class DeploymentWorkflowV2 extends DeploymentWorkflow {
    protected override readonly log = LoggerFactory.getLogger(DeploymentWorkflowV2);

    constructor(
        protected cfnServiceV2: CfnServiceV2,
        documentManager: DocumentManager,
        protected diagnosticCoordinator: DiagnosticCoordinator,
        protected syntaxTreeManager: SyntaxTreeManager,
    ) {
        super(cfnServiceV2, documentManager);
    }

    override async runDeploymentAsync(
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

            const describeEventsResponse = await this.cfnServiceV2.describeEvents({
                ChangeSetName: changeSetName,
                StackName: stackName,
            });

            const validationDetails = parseValidationEvents(describeEventsResponse, VALIDATION_V2_NAME);

            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                validationDetails: validationDetails,
            });

            await publishValidationDiagnostics(
                params.uri,
                validationDetails,
                this.syntaxTreeManager,
                this.diagnosticCoordinator,
                this.documentManager,
            );

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

    static override create(core: CfnInfraCore, external: CfnExternal): DeploymentWorkflowV2 {
        return new DeploymentWorkflowV2(
            new CfnServiceV2(external.awsClient),
            core.documentManager,
            core.diagnosticCoordinator,
            core.syntaxTreeManager,
        );
    }
}
