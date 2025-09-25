import { Identifiable } from '../protocol/LspTypes';
import { AwsEnv } from '../utils/Environment';
import { ExtensionName } from '../utils/ExtensionConfig';
import {
    TemplateActionParams,
    TemplateActionResult,
    TemplateStatusResult,
    TemplateStatus,
    WorkflowResult,
    TemplateChange,
} from './TemplateRequestType';

export type TemplateWorkflowState = {
    id: string;
    changeSetName: string;
    stackName: string;
    status: TemplateStatus;
    startTime: number;
    result: WorkflowResult;
    changes?: TemplateChange[];
    lastPolled?: number;
};

export type ValidationWaitForResult = {
    status: TemplateStatus;
    result: WorkflowResult;
    changes?: TemplateChange[];
    reason?: string;
};

export type DeploymentWaitForResult = {
    status: TemplateStatus;
    result: WorkflowResult;
    reason?: string;
};

export const changeSetNamePrefix = `${ExtensionName}-${AwsEnv}`.replaceAll(' ', '-');

export interface TemplateWorkflow {
    start(params: TemplateActionParams): Promise<TemplateActionResult>;
    getStatus(params: Identifiable): TemplateStatusResult;
}
