import { RequestType } from 'vscode-languageserver-protocol';
import { Identifiable } from '../protocol/LspTypes';
import {
    GetParametersParams,
    GetParametersResult,
    StackActionParams,
    StackActionResult,
    StackActionStatusResult,
} from './StackActionRequestType';

export const TemplateValidationCreateRequest = new RequestType<StackActionParams, StackActionResult, void>(
    'aws/cfn/template/validation/create',
);

export const TemplateDeploymentCreateRequest = new RequestType<StackActionParams, StackActionResult, void>(
    'aws/cfn/template/deployment/create',
);

export const TemplateValidationStatusRequest = new RequestType<Identifiable, StackActionStatusResult, void>(
    'aws/cfn/template/validation/status',
);

export const TemplateDeploymentStatusRequest = new RequestType<Identifiable, StackActionStatusResult, void>(
    'aws/cfn/template/deployment/status',
);

export const GetParametersRequest = new RequestType<GetParametersParams, GetParametersResult, void>(
    'aws/cfn/template/parameters',
);
