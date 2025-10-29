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
    cleanupReviewStack,
    deleteChangeSet,
    processChangeSet,
    waitForChangeSetValidation,
    processWorkflowUpdates,
    isStackInReview,
} from './StackActionOperations';
import {
    CreateValidationParams,
    StackActionPhase,
    StackActionState,
    GetStackActionStatusResult,
    DescribeValidationStatusResult,
    CreateStackActionResult,
} from './StackActionRequestType';
import { StackActionWorkflow, StackActionWorkflowState } from './StackActionWorkflowType';
import { Validation } from './Validation';
import { ValidationManager } from './ValidationManager';

export const CFN_VALIDATION_SOURCE = 'CFN Dry-Run';
export const DRY_RUN_VALIDATION_NAME = 'Change Set Dry-Run';

export class ValidationWorkflow implements StackActionWorkflow<CreateValidationParams, DescribeValidationStatusResult> {
    protected readonly workflows = new Map<string, StackActionWorkflowState>();
    protected readonly log = LoggerFactory.getLogger(ValidationWorkflow);

    constructor(
        protected readonly cfnService: CfnService,
        protected readonly documentManager: DocumentManager,
        protected readonly diagnosticCoordinator: DiagnosticCoordinator,
        protected readonly syntaxTreeManager: SyntaxTreeManager,
        protected readonly validationManager: ValidationManager,
    ) {}

    async start(params: CreateValidationParams): Promise<CreateStackActionResult> {
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

        void this.runValidationAsync(params, changeSetName);

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

    protected async runValidationAsync(params: CreateValidationParams, changeSetName: string): Promise<void> {
        const workflowId = params.id;
        const stackName = params.stackName;

        let existingWorkflow = this.workflows.get(workflowId);
        if (!existingWorkflow) {
            this.log.error({ workflowId }, 'Workflow not found during async execution');
            return;
        }

        try {
            const result = await waitForChangeSetValidation(this.cfnService, changeSetName, stackName);

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
            this.log.error(error, `Validation workflow threw exception ${workflowId}`);

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
            await this.handleCleanup(params, existingWorkflow);
        }
    }

    protected async handleCleanup(params: CreateValidationParams, existingWorkflow: StackActionWorkflowState) {
        // Cleanup validation object to prevent memory leaks
        this.validationManager.remove(params.stackName);

        if (!params.keepChangeSet) {
            try {
                if (await isStackInReview(params.stackName, this.cfnService)) {
                    await cleanupReviewStack(this.cfnService, existingWorkflow, params.id);
                } else {
                    await deleteChangeSet(this.cfnService, existingWorkflow, params.id);
                }
            } catch (error) {
                this.log.error(error, 'Resource cleanup failed');
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
