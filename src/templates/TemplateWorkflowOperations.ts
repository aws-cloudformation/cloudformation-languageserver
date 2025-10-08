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

const logger = LoggerFactory.getLogger('TemplateWorkflowOperations');

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
                IncludePropertyValues: true,
            });

            return {
                status: TemplateStatus.VALIDATION_COMPLETE,
                result: WorkflowResult.SUCCESSFUL,
                changes: mapChangesToTemplateChanges(response.Changes),
                reason: result.reason ? String(result.reason) : undefined,
            };
        } else {
            logger.warn(
                { reason: result.reason ? String(result.reason) : 'Unknown validation failure' },
                'Validation failed',
            );
            return {
                status: TemplateStatus.VALIDATION_FAILED,
                result: WorkflowResult.FAILED,
                reason: result.reason ? String(result.reason) : undefined, // TODO: Return reason as part of LSP Response
            };
        }
    } catch (error) {
        logger.error({ error: extractErrorMessage(error) }, 'Validation failed with error');
        return {
            status: TemplateStatus.VALIDATION_FAILED,
            result: WorkflowResult.FAILED,
            reason: extractErrorMessage(error),
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
            logger.warn(
                { reason: result.reason ? String(result.reason) : 'Unknown deployment failure' },
                'Deployment failed',
            );
            return {
                status: TemplateStatus.DEPLOYMENT_FAILED,
                result: WorkflowResult.FAILED,
                reason: result.reason ? String(result.reason) : undefined, // TODO: Return reason as part of LSP Response
            };
        }
    } catch (error) {
        logger.error({ error: extractErrorMessage(error) }, 'Deployment failed with error');
        return {
            status: TemplateStatus.DEPLOYMENT_FAILED,
            result: WorkflowResult.FAILED,
            reason: extractErrorMessage(error),
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
            logger,
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
            logger,
        );
    } catch (error) {
        logger.warn(
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
            logger,
        );
    } catch (error) {
        logger.warn(
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
                  beforeContext: change.ResourceChange.BeforeContext,
                  afterContext: change.ResourceChange.AfterContext,
                  details: change.ResourceChange.Details,
              }
            : undefined,
    }));
}
