import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { SyntaxTreeManager } from '../../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../document/DocumentManager';
import { Identifiable } from '../../protocol/LspTypes';
import { ServerComponents } from '../../server/ServerComponents';
import { CfnService } from '../../services/CfnService';
import { DiagnosticCoordinator } from '../../services/DiagnosticCoordinator';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { deleteStackAndChangeSet, deleteChangeSet, processChangeSet, waitForValidation } from './StackActionOperations';
import {
    StackActionParams,
    StackActionResult,
    StackActionPhase,
    StackActionStatus,
    StackActionStatusResult,
} from './StackActionRequestType';
import { StackActionWorkflowState, StackActionWorkflow } from './StackActionWorkflowType';
import { Validation } from './Validation';
import { ValidationManager } from './ValidationManager';

export const CFN_VALIDATION_SOURCE = 'CFN Dry-Run';

export class ValidationWorkflow implements StackActionWorkflow {
    private readonly workflows = new Map<string, StackActionWorkflowState>();
    private readonly log = LoggerFactory.getLogger(ValidationWorkflow);

    constructor(
        private readonly cfnService: CfnService,
        private readonly documentManager: DocumentManager,
        private readonly diagnosticCoordinator: DiagnosticCoordinator,
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly validationManager: ValidationManager,
    ) {}

    static create(components: ServerComponents): ValidationWorkflow {
        return new ValidationWorkflow(
            components.cfnService,
            components.documentManager,
            components.diagnosticCoordinator,
            components.syntaxTreeManager,
            components.validationManager,
        );
    }

    async start(params: StackActionParams): Promise<StackActionResult> {
        // Check if stack exists to determine CREATE vs UPDATE
        let changeSetType: ChangeSetType = ChangeSetType.CREATE;
        try {
            await this.cfnService.describeStacks({ StackName: params.stackName });
            changeSetType = ChangeSetType.UPDATE;
        } catch {
            changeSetType = ChangeSetType.CREATE;
        }

        const changeSetName = await processChangeSet(this.cfnService, this.documentManager, params, changeSetType);

        // Create and store validation after ChangeSet creation
        const validation = new Validation(
            params.uri,
            params.stackName,
            changeSetName,
            params.parameters,
            params.capabilities,
        );
        validation.setStatus(StackActionPhase.VALIDATION_IN_PROGRESS);
        this.validationManager.add(validation);

        // Set initial workflow state
        this.workflows.set(params.id, {
            id: params.id,
            changeSetName: changeSetName,
            stackName: params.stackName,
            phase: StackActionPhase.VALIDATION_IN_PROGRESS,
            startTime: Date.now(),
            status: StackActionStatus.IN_PROGRESS,
        });

        void this.runValidationAsync(params.id, changeSetName, params.stackName, changeSetType);

        return {
            id: params.id,
            changeSetName: changeSetName,
            stackName: params.stackName,
        };
    }

    getStatus(params: Identifiable): StackActionStatusResult {
        const workflow = this.workflows.get(params.id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${params.id}`);
        }

        return {
            phase: workflow.phase,
            status: workflow.status,
            changes: workflow.changes,
            id: workflow.id,
        };
    }

    private async runValidationAsync(
        workflowId: string,
        changeSetName: string,
        stackName: string,
        changeSetType: ChangeSetType,
    ): Promise<void> {
        const existingWorkflow = this.workflows.get(workflowId);
        if (!existingWorkflow) {
            this.log.error({ workflowId }, 'Workflow not found during async execution');
            return;
        }

        try {
            const result = await waitForValidation(this.cfnService, changeSetName, stackName);

            const validation = this.validationManager.get(stackName);
            if (validation) {
                validation.setStatus(result.phase);
                if (result.changes) {
                    validation.setChanges(result.changes);
                }
            }

            this.workflows.set(workflowId, {
                ...existingWorkflow,
                phase: result.phase,
                status: result.status,
                changes: result.changes,
            });
        } catch (error) {
            this.log.error({ error, workflowId }, 'Validation workflow failed');

            const validation = this.validationManager.get(stackName);
            if (validation) {
                validation.setStatus(StackActionPhase.VALIDATION_FAILED);
            }

            this.workflows.set(workflowId, {
                ...existingWorkflow,
                phase: StackActionPhase.VALIDATION_FAILED,
                status: StackActionStatus.FAILED,
            });
        } finally {
            // Cleanup validation object to prevent memory leaks
            this.validationManager.remove(stackName);

            if (changeSetType === ChangeSetType.CREATE) {
                await deleteStackAndChangeSet(this.cfnService, existingWorkflow, workflowId);
            } else {
                await deleteChangeSet(this.cfnService, existingWorkflow, workflowId);
            }
        }
    }
}
