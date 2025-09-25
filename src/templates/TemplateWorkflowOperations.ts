import { Change, ChangeSetType } from '@aws-sdk/client-cloudformation';
import { WaiterState } from '@smithy/util-waiter';
import { v4 as uuidv4 } from 'uuid';
import { ResponseError, ErrorCodes } from 'vscode-languageserver';
import { DocumentManager } from '../document/DocumentManager';
import { CfnService } from '../services/CfnService';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { retryWithExponentialBackoff } from '../utils/Retry';
import { TemplateChange, TemplateStatus, WorkflowResult, TemplateActionParams } from './TemplateRequestType';
import {
    TemplateWorkflowState,
    ValidationWaitForResult,
    DeploymentWaitForResult,
    changeSetNamePrefix,
} from './TemplateWorkflowType';

const LOGGER = LoggerFactory.getLogger('TemplateWorkflowOperations');

export async function processChangeSet(
    cfnService: CfnService,
    documentManager: DocumentManager,
    params: TemplateActionParams,
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
    });

    return changeSetName;
}

export async function waitForValidation(
    cfnService: CfnService,
    changeSetName: string,
    stackName: string,
): Promise<ValidationWaitForResult> {
    try {
        const result = await cfnService.waitUntilChangeSetCreateComplete({
            StackName: stackName,
            ChangeSetName: changeSetName,
        });

        if (result.state === WaiterState.SUCCESS) {
            const response = await cfnService.describeChangeSet({
                StackName: stackName,
                ChangeSetName: changeSetName,
            });

            return {
                status: TemplateStatus.VALIDATION_COMPLETE,
                result: WorkflowResult.SUCCESSFUL,
                changes: mapChangesToTemplateChanges(response.Changes),
                reason: result.reason ? String(result.reason) : undefined,
            };
        } else {
            return {
                status: TemplateStatus.VALIDATION_FAILED,
                result: WorkflowResult.FAILED,
                reason: result.reason ? String(result.reason) : undefined,
            };
        }
    } catch (error) {
        return {
            status: TemplateStatus.VALIDATION_FAILED,
            result: WorkflowResult.FAILED,
            reason: error instanceof Error ? error.message : 'Validation failed',
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
                : await cfnService.waitUntilStackUpdateComplete({
                      StackName: stackName,
                  });

        if (result.state === WaiterState.SUCCESS) {
            return {
                status: TemplateStatus.DEPLOYMENT_COMPLETE,
                result: WorkflowResult.SUCCESSFUL,
                reason: result.reason ? String(result.reason) : undefined,
            };
        } else {
            return {
                status: TemplateStatus.DEPLOYMENT_FAILED,
                result: WorkflowResult.FAILED,
                reason: result.reason ? String(result.reason) : undefined,
            };
        }
    } catch (error) {
        LOGGER.info({ error: extractErrorMessage(error) }, 'Validation failed with error');
        return {
            status: TemplateStatus.DEPLOYMENT_FAILED,
            result: WorkflowResult.FAILED,
            reason: String(error),
        };
    }
}

export async function deleteStackAndChangeSet(
    cfnService: CfnService,
    workflow: TemplateWorkflowState,
    workflowId: string,
): Promise<void> {
    try {
        // Delete changeset first
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
            LOGGER,
        );

        // Delete stack
        // TODO only delete stack for CREATE operation
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
            LOGGER,
        );
    } catch (error) {
        LOGGER.warn(
            { error, workflowId, changeSetName: workflow.changeSetName },
            'Failed to cleanup workflow resources',
        );
    }
}

export async function deleteChangeSet(
    cfnService: CfnService,
    workflow: TemplateWorkflowState,
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
            LOGGER,
        );
    } catch (error) {
        LOGGER.warn(
            { error, workflowId, changeSetName: workflow.changeSetName },
            'Failed to cleanup workflow resources',
        );
    }
}

export function mapChangesToTemplateChanges(changes?: Change[]): TemplateChange[] | undefined {
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
                  details: change.ResourceChange.Details,
              }
            : undefined,
    }));
}
