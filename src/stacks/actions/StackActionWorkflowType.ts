import { Identifiable } from '../../protocol/LspTypes';
import { AwsEnv } from '../../utils/Environment';
import { ExtensionName } from '../../utils/ExtensionConfig';
import {
    CreateStackActionParams,
    CreateStackActionResult,
    DeploymentEvent,
    GetStackActionStatusResult,
    StackActionPhase,
    StackActionState,
    StackChange,
    ValidationDetail,
} from './StackActionRequestType';

export type StackActionWorkflowState = {
    id: string;
    changeSetName: string;
    stackName: string;
    startTime: number;
    state: StackActionState;
    phase: StackActionPhase;
    changes?: StackChange[];
    deploymentEvents?: DeploymentEvent[];
    validationDetails?: ValidationDetail[];
    lastPolled?: number;
    failureReason?: string;
};

export type ValidationWaitForResult = {
    state: StackActionState;
    phase: StackActionPhase;
    changes?: StackChange[];
    failureReason?: string;
    nextToken?: string;
};

export type DeploymentWaitForResult = {
    state: StackActionState;
    phase: StackActionPhase;
    failureReason?: string;
};

export const changeSetNamePrefix = `${ExtensionName}-${AwsEnv}`.replaceAll(' ', '-');

export interface StackActionWorkflow<TDescribeResult> {
    start(params: CreateStackActionParams): Promise<CreateStackActionResult>;
    getStatus(params: Identifiable): GetStackActionStatusResult;
    describeStatus(params: Identifiable): TDescribeResult;
}
