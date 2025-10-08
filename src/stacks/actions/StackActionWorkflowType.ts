import { Identifiable } from '../../protocol/LspTypes';
import { AwsEnv } from '../../utils/Environment';
import { ExtensionName } from '../../utils/ExtensionConfig';
import {
    CreateStackActionParams,
    CreateStackActionResult,
    GetStackActionStatusResult,
    StackActionPhase,
    StackActionState,
    StackChange,
} from './StackActionRequestType';

export type StackActionWorkflowState = {
    id: string;
    changeSetName: string;
    stackName: string;
    startTime: number;
    state: StackActionState;
    phase: StackActionPhase;
    changes?: StackChange[];
    lastPolled?: number;
};

export type ValidationWaitForResult = {
    state: StackActionState;
    phase: StackActionPhase;
    changes?: StackChange[];
    reason?: string;
};

export type DeploymentWaitForResult = {
    state: StackActionState;
    phase: StackActionPhase;
    reason?: string;
};

export const changeSetNamePrefix = `${ExtensionName}-${AwsEnv}`.replaceAll(' ', '-');

export interface StackActionWorkflow {
    start(params: CreateStackActionParams): Promise<CreateStackActionResult>;
    getStatus(params: Identifiable): GetStackActionStatusResult;
}
