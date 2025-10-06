import { Identifiable } from '../../protocol/LspTypes';
import { AwsEnv } from '../../utils/Environment';
import { ExtensionName } from '../../utils/ExtensionConfig';
import {
    StackActionParams,
    StackActionResult,
    StackActionStatusResult,
    StackActionPhase,
    StackActionStatus,
    StackChange,
} from './StackActionRequestType';

export type StackActionWorkflowState = {
    id: string;
    changeSetName: string;
    stackName: string;
    startTime: number;
    status: StackActionStatus;
    phase: StackActionPhase;
    changes?: StackChange[];
    lastPolled?: number;
};

export type ValidationWaitForResult = {
    status: StackActionStatus;
    phase: StackActionPhase;
    changes?: StackChange[];
    reason?: string;
};

export type DeploymentWaitForResult = {
    status: StackActionStatus;
    phase: StackActionPhase;
    reason?: string;
};

export const changeSetNamePrefix = `${ExtensionName}-${AwsEnv}`.replaceAll(' ', '-');

export interface StackActionWorkflow {
    start(params: StackActionParams): Promise<StackActionResult>;
    getStatus(params: Identifiable): StackActionStatusResult;
}
