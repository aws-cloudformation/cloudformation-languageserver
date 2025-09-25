import { Parameter, Capability, ResourceChangeDetail } from '@aws-sdk/client-cloudformation';
import { RequestType } from 'vscode-languageserver-protocol';
import { Parameter as EntityParameter } from '../context/semantic/Entity';
import { Identifiable } from '../protocol/LspTypes';

export type TemplateActionParams = Identifiable & {
    uri: string;
    stackName: string;
    parameters?: Parameter[];
    capabilities?: Capability[];
};

export type TemplateActionResult = Identifiable & {
    id: string;
    changeSetName: string;
    stackName: string;
};

export type GetParametersParams = {
    uri: string;
};

export type GetParametersResult = {
    parameters: EntityParameter[];
};

export type TemplateChange = {
    type?: string;
    resourceChange?: {
        action?: string;
        logicalResourceId?: string;
        physicalResourceId?: string;
        resourceType?: string;
        replacement?: string;
        scope?: string[];
        details?: ResourceChangeDetail[];
    };
};

export enum TemplateStatus {
    VALIDATION_STARTED = 'VALIDATION_STARTED',
    DEPLOYMENT_STARTED = 'DEPLOYMENT_STARTED',
    VALIDATION_IN_PROGRESS = 'VALIDATION_IN_PROGRESS',
    DEPLOYMENT_IN_PROGRESS = 'DEPLOYMENT_IN_PROGRESS',
    VALIDATION_COMPLETE = 'VALIDATION_COMPLETE',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    DEPLOYMENT_COMPLETE = 'DEPLOYMENT_COMPLETE',
    DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
}

export enum WorkflowResult {
    IN_PROGRESS = 'IN_PROGRESS',
    SUCCESSFUL = 'SUCCESSFUL',
    FAILED = 'FAILED',
}

export type TemplateStatusResult = Identifiable & {
    status: TemplateStatus;
    result: WorkflowResult;
    changes?: TemplateChange[];
};

export const TemplateValidationCreateRequest = new RequestType<TemplateActionParams, TemplateActionResult, void>(
    'aws/cfn/template/validation/create',
);

export const TemplateDeploymentCreateRequest = new RequestType<TemplateActionParams, TemplateActionResult, void>(
    'aws/cfn/template/deployment/create',
);

export const TemplateValidationStatusRequest = new RequestType<Identifiable, TemplateStatusResult, void>(
    'aws/cfn/template/validation/status',
);

export const TemplateDeploymentStatusRequest = new RequestType<Identifiable, TemplateStatusResult, void>(
    'aws/cfn/template/deployment/status',
);

export const GetParametersRequest = new RequestType<GetParametersParams, GetParametersResult, void>(
    'aws/cfn/template/parameters',
);
