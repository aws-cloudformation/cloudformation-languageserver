import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import { SyntaxTreeManager } from '../../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../document/DocumentManager';
import { Identifiable } from '../../protocol/LspTypes';
import { CfnExternal } from '../../server/CfnExternal';
import { CfnInfraCore } from '../../server/CfnInfraCore';
import { CfnService } from '../../services/CfnService';
import { DiagnosticCoordinator } from '../../services/DiagnosticCoordinator';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';
import {
    deleteStackAndChangeSet,
    deleteChangeSet,
    processChangeSet,
    waitForValidation,
    processWorkflowUpdates,
} from './StackActionOperations';
import {
    CreateStackActionParams,
    CreateStackActionResult,
    StackActionPhase,
    StackActionState,
    GetStackActionStatusResult,
    DescribeValidationStatusResult,
} from './StackActionRequestType';
import { StackActionWorkflowState, StackActionWorkflow } from './StackActionWorkflowType';
import { Validation } from './Validation';
import { ValidationManager } from './ValidationManager';

export const CFN_VALIDATION_SOURCE = 'CFN Dry-Run';
export const DRY_RUN_VALIDATION_NAME = 'Change Set Dry-Run';

export class ValidationWorkflow implements StackActionWorkflow<DescribeValidationStatusResult> {
    private readonly workflows = new Map<string, StackActionWorkflowState>();
    private readonly log = LoggerFactory.getLogger(ValidationWorkflow);

    constructor(
        private readonly cfnService: CfnService,
        private readonly documentManager: DocumentManager,
        private readonly diagnosticCoordinator: DiagnosticCoordinator,
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly validationManager: ValidationManager,
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

        // Create and store validation after ChangeSet creation
        const validation = new Validation(
            params.uri,
            params.stackName,
            changeSetName,
            params.parameters,
            params.capabilities,
        );
        validation.setPhase(StackActionPhase.VALIDATION_IN_PROGRESS);
        this.validationManager.add(validation);

        // Set initial workflow state
        this.workflows.set(params.id, {
            id: params.id,
            changeSetName: changeSetName,
            stackName: params.stackName,
            phase: StackActionPhase.VALIDATION_IN_PROGRESS,
            startTime: Date.now(),
            state: StackActionState.IN_PROGRESS,
        });

        void this.runValidationAsync(params.id, changeSetName, params.stackName, changeSetType);

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

    describeStatus(params: Identifiable): DescribeValidationStatusResult {
        const workflow = this.workflows.get(params.id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${params.id}`);
        }

        return {
            ...this.getStatus(params),
            ValidationDetails: workflow.validationDetails,
            FailureReason: workflow.failureReason,
        };
    }

    protected async runValidationAsync(
        workflowId: string,
        changeSetName: string,
        stackName: string,
        changeSetType: ChangeSetType,
    ): Promise<void> {
        let existingWorkflow = this.workflows.get(workflowId);
        if (!existingWorkflow) {
            this.log.error({ workflowId }, 'Workflow not found during async execution');
            return;
        }

        try {
            const result = await waitForValidation(this.cfnService, changeSetName, stackName);

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
                    validationDetails: [
                        {
                            ValidationName: DRY_RUN_VALIDATION_NAME,
                            Timestamp: DateTime.now(),
                            Severity: 'ERROR',
                            Message: `Validation failed with reason: ${result.failureReason}`,
                        },
                    ],
                    failureReason: result.failureReason,
                });
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
            this.log.error({ error, workflowId }, 'Validation workflow threw exception');

            const validation = this.validationManager.get(stackName);
            if (validation) {
                validation.setPhase(StackActionPhase.VALIDATION_FAILED);
            }

            processWorkflowUpdates(this.workflows, existingWorkflow, {
                phase: StackActionPhase.VALIDATION_FAILED,
                state: StackActionState.FAILED,
                failureReason: extractErrorMessage(error),
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

    static create(core: CfnInfraCore, external: CfnExternal): ValidationWorkflow {
        return new ValidationWorkflow(
            external.cfnService,
            core.documentManager,
            core.diagnosticCoordinator,
            core.syntaxTreeManager,
            new ValidationManager(),
        );
    }
}
