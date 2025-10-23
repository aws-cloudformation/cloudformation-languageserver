import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { FileContextManager } from '../../context/FileContextManager';
import { SyntaxTreeManager } from '../../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../document/DocumentManager';
import { CfnExternal } from '../../server/CfnExternal';
import { CfnInfraCore } from '../../server/CfnInfraCore';
import { CfnServiceV2 } from '../../services/CfnServiceV2';
import { DiagnosticCoordinator } from '../../services/DiagnosticCoordinator';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';
import {
    waitForChangeSetValidation,
    processWorkflowUpdates,
    parseValidationEvents,
    publishValidationDiagnostics,
} from './StackActionOperations';
import { CreateValidationParams, StackActionPhase, StackActionState } from './StackActionRequestType';
import { ValidationManager } from './ValidationManager';
import { ValidationWorkflow } from './ValidationWorkflow';

export const VALIDATION_V2_NAME = 'Enhanced Validation';

export class ValidationWorkflowV2 extends ValidationWorkflow {
    protected override readonly log = LoggerFactory.getLogger(ValidationWorkflowV2);

    constructor(
        protected cfnServiceV2: CfnServiceV2,
        documentManager: DocumentManager,
        diagnosticCoordinator: DiagnosticCoordinator,
        syntaxTreeManager: SyntaxTreeManager,
        validationManager: ValidationManager,
        protected fileContextManager: FileContextManager,
    ) {
        super(cfnServiceV2, documentManager, diagnosticCoordinator, syntaxTreeManager, validationManager);
    }

    override async runValidationAsync(
        params: CreateValidationParams,
        changeSetName: string,
        changeSetType: ChangeSetType,
    ): Promise<void> {
        const uri = params.uri;
        const workflowId = params.id;
        const stackName = params.stackName;

        let existingWorkflow = this.workflows.get(workflowId);
        if (!existingWorkflow) {
            this.log.error({ workflowId }, 'Workflow not found during async execution');
            return;
        }

        try {
            const result = await waitForChangeSetValidation(this.cfnServiceV2, changeSetName, stackName);

            const validation = this.validationManager.get(stackName);
            if (validation) {
                validation.setPhase(result.phase);
                if (result.changes) {
                    validation.setChanges(result.changes);
                }
            }

            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: result.phase,
                state: result.state,
                changes: result.changes,
            });

            if (result.state === StackActionState.FAILED) {
                existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                    failureReason: result.failureReason,
                });
            }

            const describeEventsResponse = await this.cfnServiceV2.describeEvents({
                ChangeSetName: changeSetName,
                StackName: stackName,
            });

            const validationDetails = parseValidationEvents(describeEventsResponse, VALIDATION_V2_NAME);

            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                validationDetails: validationDetails,
            });

            await publishValidationDiagnostics(
                uri,
                validationDetails,
                this.syntaxTreeManager,
                this.diagnosticCoordinator,
            );
        } catch (error) {
            this.log.error({ error, workflowId }, 'Validation workflow threw exception');

            const validation = this.validationManager.get(stackName);
            if (validation) {
                validation.setPhase(StackActionPhase.VALIDATION_FAILED);
            }

            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: StackActionPhase.VALIDATION_FAILED,
                state: StackActionState.FAILED,
                failureReason: extractErrorMessage(error),
            });
        } finally {
            await this.handleCleanup(params, existingWorkflow, changeSetType);
        }
    }

    static override create(core: CfnInfraCore, external: CfnExternal): ValidationWorkflowV2 {
        return new ValidationWorkflowV2(
            new CfnServiceV2(external.awsClient),
            core.documentManager,
            core.diagnosticCoordinator,
            core.syntaxTreeManager,
            new ValidationManager(),
            core.fileContextManager,
        );
    }
}
