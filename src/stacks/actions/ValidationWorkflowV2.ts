/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChangeSetType } from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import Parser from 'tree-sitter';
import { v4 as uuidv4 } from 'uuid';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { TopLevelSection } from '../../context/ContextType';
import { FileContextManager } from '../../context/FileContextManager';
import { getEntityMap } from '../../context/SectionContextBuilder';
import { SyntaxTreeManager } from '../../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../document/DocumentManager';
import { CfnExternal } from '../../server/CfnExternal';
import { CfnInfraCore } from '../../server/CfnInfraCore';
import { CfnServiceV2, DescribeEventsOutput } from '../../services/CfnServiceV2';
import { DiagnosticCoordinator } from '../../services/DiagnosticCoordinator';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';
import { pointToPosition } from '../../utils/TypeConverters';
import {
    deleteStackAndChangeSet,
    deleteChangeSet,
    waitForChangeSetValidation,
    processWorkflowUpdates,
} from './StackActionOperations';
import {
    CreateStackActionParams,
    StackActionPhase,
    StackActionState,
    ValidationDetail,
} from './StackActionRequestType';
import { ValidationManager } from './ValidationManager';
import { CFN_VALIDATION_SOURCE, ValidationWorkflow } from './ValidationWorkflow';

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
        params: CreateStackActionParams,
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

            const validationDetails: ValidationDetail[] = this.parseEvents(describeEventsResponse);

            existingWorkflow = processWorkflowUpdates(this.workflows, existingWorkflow, {
                validationDetails: validationDetails,
            });

            this.publishDiagnostics(uri, validationDetails);
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
            // Cleanup validation object to prevent memory leaks
            this.validationManager.remove(stackName);

            if (changeSetType === ChangeSetType.CREATE) {
                await deleteStackAndChangeSet(this.cfnServiceV2, existingWorkflow, workflowId);
            } else {
                await deleteChangeSet(this.cfnServiceV2, existingWorkflow, workflowId);
            }
        }
    }

    private parseEvents(events: DescribeEventsOutput): ValidationDetail[] {
        const validEvents = events.OperationEvents.filter((event) => event.EventType === 'VALIDATION_ERROR');

        return validEvents.map((event) => {
            const timestamp = event.Timestamp instanceof Date ? event.Timestamp.toISOString() : event.Timestamp;
            return {
                Timestamp: DateTime.fromISO(timestamp),
                ValidationName: VALIDATION_V2_NAME,
                LogicalId: event.LogicalResourceId,
                Message: [event.ValidationName, event.ValidationStatusReason].filter(Boolean).join(': '),
                Severity: event.ValidationFailureMode === 'FAIL' ? 'ERROR' : 'INFO',
                ResourcePropertyPath: event.ValidationPath,
            };
        });
    }

    private publishDiagnostics(uri: string, events: ValidationDetail[]): void {
        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(uri);
        if (!syntaxTree) {
            this.log.error('No syntax tree found');
            return;
        }

        const diagnostics: Diagnostic[] = [];
        for (const event of events) {
            let startPosition: Parser.Point | undefined;
            let endPosition: Parser.Point | undefined;

            if (event.ResourcePropertyPath) {
                this.log.debug({ event }, 'Getting property-specific start and end positions');

                // Parse ValidationPath like "/Resources/S3Bucket" or "/Resources/S3Bucket/Properties/BucketName"
                const pathSegments = event.ResourcePropertyPath.split('/').filter(Boolean);

                const nodeByPath = syntaxTree.getNodeByPath(pathSegments);

                startPosition = nodeByPath.node?.startPosition;
                endPosition = nodeByPath.node?.endPosition;
            } else if (event.LogicalId) {
                // fall back to using LogicalId and underlining entire resource
                this.log.debug({ event }, 'No ResourcePropertyPath found, falling back to using LogicalId');
                const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);

                startPosition = resourcesMap?.get(event.LogicalId)?.startPosition;
                endPosition = resourcesMap?.get(event.LogicalId)?.endPosition;
            }

            if (startPosition && endPosition) {
                diagnostics.push({
                    severity: event.Severity === 'ERROR' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
                    range: {
                        start: pointToPosition(startPosition),
                        end: pointToPosition(endPosition),
                    },
                    message: event.Message,
                    source: CFN_VALIDATION_SOURCE,
                    data: uuidv4(), // TODO: Figure out why the
                });
            }
        }

        this.diagnosticCoordinator
            .publishDiagnostics(CFN_VALIDATION_SOURCE, uri, diagnostics)
            .catch((error: unknown) => {
                this.log.error({ error }, 'Error publishing validation diagnostics');
            });
    }

    static override create(core: CfnInfraCore, external: CfnExternal): ValidationWorkflowV2 {
        return new ValidationWorkflowV2(
            external.cfnServiceV2,
            core.documentManager,
            core.diagnosticCoordinator,
            core.syntaxTreeManager,
            new ValidationManager(),
            core.fileContextManager,
        );
    }
}
