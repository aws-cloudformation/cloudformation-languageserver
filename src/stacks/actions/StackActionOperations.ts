import { Change, ChangeSetType, StackStatus } from '@aws-sdk/client-cloudformation';
import { WaiterState } from '@smithy/util-waiter';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { ResponseError, ErrorCodes, Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { TopLevelSection } from '../../context/ContextType';
import { getEntityMap } from '../../context/SectionContextBuilder';
import { SyntaxTreeManager } from '../../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../../document/DocumentManager';
import { CfnService } from '../../services/CfnService';
import { DescribeEventsOutput } from '../../services/CfnServiceV2';
import { DiagnosticCoordinator } from '../../services/DiagnosticCoordinator';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';
import { retryWithExponentialBackoff } from '../../utils/Retry';
import { pointToPosition } from '../../utils/TypeConverters';
import {
    StackChange,
    StackActionPhase,
    StackActionState,
    CreateValidationParams,
    ValidationDetail,
} from './StackActionRequestType';
import {
    StackActionWorkflowState,
    ValidationWaitForResult,
    DeploymentWaitForResult,
    changeSetNamePrefix,
} from './StackActionWorkflowType';
import { CFN_VALIDATION_SOURCE } from './ValidationWorkflow';

const logger = LoggerFactory.getLogger('StackActionOperations');

function logCleanupError(error: unknown, workflowId: string, changeSetName: string, operation: string): void {
    logger.warn(error, `Failed to cleanup ${operation} ${workflowId} ${changeSetName}`);
}

export async function processChangeSet(
    cfnService: CfnService,
    documentManager: DocumentManager,
    params: CreateValidationParams,
    changeSetType: ChangeSetType,
): Promise<string> {
    const document = documentManager.get(params.uri);
    if (!document) {
        throw new ResponseError(ErrorCodes.InvalidParams, `Document not found: ${params.uri}`);
    }

    const changeSetName = `${changeSetNamePrefix}-${params.id}-${uuidv4()}`;

    await cfnService.createChangeSet({
        StackName: params.stackName,
        ChangeSetName: changeSetName,
        TemplateBody: document.contents(),
        Parameters: params.parameters,
        Capabilities: params.capabilities,
        ChangeSetType: changeSetType,
        ResourcesToImport: params.resourcesToImport,
    });

    return changeSetName;
}

export async function waitForChangeSetValidation(
    cfnService: CfnService,
    changeSetName: string,
    stackName: string,
): Promise<ValidationWaitForResult> {
    try {
        // TODO: change to waitForChangeSetCreateComplete, which will not throw error on create change set failure
        const result = await cfnService.waitUntilChangeSetCreateComplete({
            StackName: stackName,
            ChangeSetName: changeSetName,
        });

        if (result.state === WaiterState.SUCCESS) {
            const response = await cfnService.describeChangeSet({
                StackName: stackName,
                ChangeSetName: changeSetName,
                IncludePropertyValues: true,
            });

            return {
                phase: StackActionPhase.VALIDATION_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                changes: mapChangesToStackChanges(response.Changes),
                failureReason: result.reason ? String(result.reason) : undefined,
                nextToken: response.NextToken,
            };
        } else {
            logger.warn(
                { reason: result.reason ? String(result.reason) : 'Unknown validation failure' },
                'Validation failed',
            );
            return {
                phase: StackActionPhase.VALIDATION_FAILED,
                state: StackActionState.FAILED,
                failureReason: result.reason ? String(result.reason) : undefined,
            };
        }
    } catch (error) {
        logger.error(error, 'Validation failed with error');
        return {
            phase: StackActionPhase.VALIDATION_FAILED,
            state: StackActionState.FAILED,
            failureReason: extractErrorMessage(error),
        };
    }
}

export async function waitForDeployment(
    cfnService: CfnService,
    stackName: string,
    changeSetType: ChangeSetType,
): Promise<DeploymentWaitForResult> {
    try {
        const result =
            changeSetType === ChangeSetType.CREATE
                ? await cfnService.waitUntilStackCreateComplete({
                      StackName: stackName,
                  })
                : changeSetType === ChangeSetType.IMPORT
                  ? await cfnService.waitUntilStackImportComplete({
                        StackName: stackName,
                    })
                  : await cfnService.waitUntilStackUpdateComplete({
                        StackName: stackName,
                    });

        if (result.state === WaiterState.SUCCESS) {
            return {
                phase: StackActionPhase.DEPLOYMENT_COMPLETE,
                state: StackActionState.SUCCESSFUL,
                failureReason: result.reason ? String(result.reason) : undefined,
            };
        } else {
            logger.warn(
                { reason: result.reason ? String(result.reason) : 'Unknown deployment failure' },
                'Deployment failed',
            );
            return {
                phase: StackActionPhase.DEPLOYMENT_FAILED,
                state: StackActionState.FAILED,
                failureReason: result.reason ? String(result.reason) : undefined,
            };
        }
    } catch (error) {
        logger.error(error, 'Deployment failed with error');
        return {
            phase: StackActionPhase.DEPLOYMENT_FAILED,
            state: StackActionState.FAILED,
            failureReason: extractErrorMessage(error),
        };
    }
}

export async function cleanupReviewStack(
    cfnService: CfnService,
    workflow: StackActionWorkflowState,
    workflowId: string,
): Promise<void> {
    try {
        await retryWithExponentialBackoff(
            () =>
                cfnService.deleteStack({
                    StackName: workflow.stackName,
                }),
            {
                maxRetries: 3,
                initialDelayMs: 1000,
                operationName: `Delete stack ${workflow.stackName}`,
            },
            logger,
        );
    } catch (error) {
        logCleanupError(error, workflowId, workflow.changeSetName, 'workflow resources');
    }
}

export async function deleteChangeSet(
    cfnService: CfnService,
    workflow: StackActionWorkflowState,
    workflowId: string,
): Promise<void> {
    try {
        await retryWithExponentialBackoff(
            () =>
                cfnService.deleteChangeSet({
                    StackName: workflow.stackName,
                    ChangeSetName: workflow.changeSetName,
                }),
            {
                maxRetries: 3,
                initialDelayMs: 1000,
                operationName: `Delete change set ${workflow.changeSetName}`,
            },
            logger,
        );
    } catch (error) {
        logCleanupError(error, workflowId, workflow.changeSetName, 'change set');
    }
}

export function mapChangesToStackChanges(changes?: Change[]): StackChange[] | undefined {
    return changes?.map((change: Change) => ({
        type: change.Type,
        resourceChange: change.ResourceChange
            ? {
                  action: change.ResourceChange.Action,
                  logicalResourceId: change.ResourceChange.LogicalResourceId,
                  physicalResourceId: change.ResourceChange.PhysicalResourceId,
                  resourceType: change.ResourceChange.ResourceType,
                  replacement: change.ResourceChange.Replacement,
                  scope: change.ResourceChange.Scope,
                  beforeContext: change.ResourceChange.BeforeContext,
                  afterContext: change.ResourceChange.AfterContext,
                  details: change.ResourceChange.Details,
              }
            : undefined,
    }));
}

export function processWorkflowUpdates(
    workflows: Map<string, StackActionWorkflowState>,
    existingWorkflow: StackActionWorkflowState,
    workflowUpdates: Partial<StackActionWorkflowState>,
): StackActionWorkflowState {
    existingWorkflow = {
        ...existingWorkflow,
        ...workflowUpdates,
    };
    workflows.set(existingWorkflow.id, existingWorkflow);

    return existingWorkflow;
}

export function parseValidationEvents(events: DescribeEventsOutput, validationName: string): ValidationDetail[] {
    const validEvents = events.OperationEvents.filter((event) => event.EventType === 'VALIDATION_ERROR');

    return validEvents.map((event) => {
        const timestamp = event.Timestamp instanceof Date ? event.Timestamp.toISOString() : event.Timestamp;
        return {
            Timestamp: DateTime.fromISO(timestamp),
            ValidationName: validationName,
            LogicalId: event.LogicalResourceId,
            Message: [event.ValidationName, event.ValidationStatusReason].filter(Boolean).join(': '),
            Severity: event.ValidationFailureMode === 'FAIL' ? 'ERROR' : 'INFO',
            ResourcePropertyPath: event.ValidationPath,
        };
    });
}

export async function publishValidationDiagnostics(
    uri: string,
    events: ValidationDetail[],
    syntaxTreeManager: SyntaxTreeManager,
    diagnosticCoordinator: DiagnosticCoordinator,
): Promise<void> {
    const syntaxTree = syntaxTreeManager.getSyntaxTree(uri);
    if (!syntaxTree) {
        logger.error('No syntax tree found');
        return;
    }

    const diagnostics: Diagnostic[] = [];
    for (const event of events) {
        let range: Range | undefined;

        if (event.ResourcePropertyPath) {
            range = diagnosticCoordinator.getKeyRangeFromPath(uri, event.ResourcePropertyPath);
        } else if (event.LogicalId) {
            // fall back to using LogicalId and underlining entire resource
            logger.warn(event, 'No ResourcePropertyPath found, falling back to using LogicalId');
            const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);

            const startPosition = resourcesMap?.get(event.LogicalId)?.startPosition;
            const endPosition = resourcesMap?.get(event.LogicalId)?.endPosition;
            if (startPosition && endPosition) {
                range = {
                    start: pointToPosition(startPosition),
                    end: pointToPosition(endPosition),
                };
            }
        }

        if (range) {
            diagnostics.push({
                severity: event.Severity === 'ERROR' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
                range: range,
                message: event.Message,
                source: CFN_VALIDATION_SOURCE,
                data: uuidv4(),
            });
        }
    }

    await diagnosticCoordinator.publishDiagnostics(CFN_VALIDATION_SOURCE, uri, diagnostics);
}

// If a stack is in REVIEW_IN_PROGRESS, this indicates that a stack was created by the createChangeSet method
export async function isStackInReview(stackName: string, cfnService: CfnService): Promise<boolean> {
    const describeStacksResult = await cfnService.describeStacks({ StackName: stackName });

    const stackResult = describeStacksResult.Stacks?.filter((stack) => stack.StackName === stackName)[0];

    if (!stackResult) {
        throw new Error(`Stack not found: ${stackName}`);
    }

    return stackResult.StackStatus === StackStatus.REVIEW_IN_PROGRESS;
}
