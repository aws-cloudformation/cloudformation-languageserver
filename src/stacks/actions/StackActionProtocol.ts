import { RequestType } from 'vscode-languageserver-protocol';
import { Identifiable } from '../../protocol/LspTypes';
import {
    TemplateUri,
    GetParametersResult,
    CreateValidationParams,
    GetStackActionStatusResult,
    GetCapabilitiesResult,
    DescribeValidationStatusResult,
    DescribeDeploymentStatusResult,
    GetTemplateResourcesResult,
    CreateStackActionResult,
    CreateDeploymentParams,
    DeleteChangeSetParams,
    DescribeDeletionStatusResult,
    GetTemplateArtifactsResult,
} from './StackActionRequestType';

export const CreateValidationRequest = new RequestType<CreateValidationParams, CreateStackActionResult, void>(
    'aws/cfn/stack/validation/create',
);

export const CreateDeploymentRequest = new RequestType<CreateDeploymentParams, CreateStackActionResult, void>(
    'aws/cfn/stack/deployment/create',
);

export const GetValidationStatusRequest = new RequestType<Identifiable, GetStackActionStatusResult, void>(
    'aws/cfn/stack/validation/status',
);

export const GetDeploymentStatusRequest = new RequestType<Identifiable, GetStackActionStatusResult, void>(
    'aws/cfn/stack/deployment/status',
);

export const DescribeValidationStatusRequest = new RequestType<Identifiable, DescribeValidationStatusResult, void>(
    'aws/cfn/stack/validation/status/describe',
);

export const DescribeDeploymentStatusRequest = new RequestType<Identifiable, DescribeDeploymentStatusResult, void>(
    'aws/cfn/stack/deployment/status/describe',
);

export const GetParametersRequest = new RequestType<TemplateUri, GetParametersResult, void>('aws/cfn/stack/parameters');

export const GetTemplateArtifactsRequest = new RequestType<TemplateUri, GetTemplateArtifactsResult, void>(
    'aws/cfn/stack/template/artifacts',
);

export const GetCapabilitiesRequest = new RequestType<TemplateUri, GetCapabilitiesResult, void>(
    'aws/cfn/stack/capabilities',
);

export const GetTemplateResourcesRequest = new RequestType<TemplateUri, GetTemplateResourcesResult, void>(
    'aws/cfn/stack/import/resources',
);

export const DeleteChangeSetRequest = new RequestType<DeleteChangeSetParams, CreateStackActionResult, void>(
    'aws/cfn/stack/changeSet/delete',
);

export const GetChangeSetDeletionStatusRequest = new RequestType<Identifiable, GetStackActionStatusResult, void>(
    'aws/cfn/stack/changeSet/deletion/status',
);

export const DescribeChangeSetDeletionStatusRequest = new RequestType<Identifiable, DescribeDeletionStatusResult, void>(
    'aws/cfn/stack/changeSet/deletion/status/describe',
);
