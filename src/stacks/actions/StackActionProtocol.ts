import { RequestType } from 'vscode-languageserver-protocol';
import { Identifiable } from '../../protocol/LspTypes';
import {
    StackActionMetadataParams,
    GetParametersResult,
    StackActionParams,
    StackActionResult,
    StackActionStatusResult,
    GetCapabilitiesResult,
} from './StackActionRequestType';

export const StackActionValidationCreateRequest = new RequestType<StackActionParams, StackActionResult, void>(
    'aws/cfn/stacks/actions/validation/create',
);

export const StackActionDeploymentCreateRequest = new RequestType<StackActionParams, StackActionResult, void>(
    'aws/cfn/stacks/actions/deployment/create',
);

export const StackActionValidationStatusRequest = new RequestType<Identifiable, StackActionStatusResult, void>(
    'aws/cfn/stacks/actions/validation/status',
);

export const StackActionDeploymentStatusRequest = new RequestType<Identifiable, StackActionStatusResult, void>(
    'aws/cfn/stacks/actions/deployment/status',
);

export const StackActionParametersRequest = new RequestType<StackActionMetadataParams, GetParametersResult, void>(
    'aws/cfn/stacks/actions/parameters',
);

export const StackActionCapabilitiesRequest = new RequestType<StackActionMetadataParams, GetCapabilitiesResult, void>(
    'aws/cfn/stacks/actions/capabilities',
);
