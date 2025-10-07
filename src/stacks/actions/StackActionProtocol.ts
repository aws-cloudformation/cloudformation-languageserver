import { RequestType } from 'vscode-languageserver-protocol';
import { Identifiable } from '../../protocol/LspTypes';
import {
    TemplateUri,
    GetParametersResult,
    CreateStackActionParams,
    CreateStackActionResult,
    GetStackActionStatusResult,
    GetCapabilitiesResult,
} from './StackActionRequestType';

export const CreateValidationRequest = new RequestType<CreateStackActionParams, CreateStackActionResult, void>(
    'aws/cfn/stack/validation/create',
);

export const CreateDeploymentRequest = new RequestType<CreateStackActionParams, CreateStackActionResult, void>(
    'aws/cfn/stack/deployment/create',
);

export const GetValidationStatusRequest = new RequestType<Identifiable, GetStackActionStatusResult, void>(
    'aws/cfn/stack/validation/status',
);

export const GetDeploymentStatusRequest = new RequestType<Identifiable, GetStackActionStatusResult, void>(
    'aws/cfn/stack/deployment/status',
);

export const GetParametersRequest = new RequestType<TemplateUri, GetParametersResult, void>(
    'aws/cfn/stack/parameters',
);

export const GetCapabilitiesRequest = new RequestType<TemplateUri, GetCapabilitiesResult, void>(
    'aws/cfn/stack/capabilities',
);
