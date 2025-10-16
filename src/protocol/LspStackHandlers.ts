import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    CreateValidationRequest,
    CreateDeploymentRequest,
    GetDeploymentStatusRequest,
    GetValidationStatusRequest,
    GetCapabilitiesRequest,
    GetParametersRequest,
    DescribeValidationStatusRequest,
    DescribeDeploymentStatusRequest,
    GetTemplateResourcesRequest,
} from '../stacks/actions/StackActionProtocol';
import {
    TemplateUri,
    CreateStackActionParams,
    CreateStackActionResult,
    GetStackActionStatusResult,
    GetParametersResult,
    GetCapabilitiesResult,
    DescribeValidationStatusResult,
    DescribeDeploymentStatusResult,
    GetTemplateResourcesResult,
} from '../stacks/actions/StackActionRequestType';
import {
    ListStacksParams,
    ListStacksResult,
    ListStacksRequest,
    GetStackTemplateParams,
    GetStackTemplateResult,
    GetStackTemplateRequest,
} from '../stacks/StackRequestType';
import { Identifiable } from './LspTypes';

export class LspStackHandlers {
    constructor(private readonly connection: Connection) {}

    onCreateValidation(handler: RequestHandler<CreateStackActionParams, CreateStackActionResult, void>) {
        this.connection.onRequest(CreateValidationRequest.method, handler);
    }

    onCreateDeployment(handler: RequestHandler<CreateStackActionParams, CreateStackActionResult, void>) {
        this.connection.onRequest(CreateDeploymentRequest.method, handler);
    }

    onGetValidationStatus(handler: RequestHandler<Identifiable, GetStackActionStatusResult, void>) {
        this.connection.onRequest(GetValidationStatusRequest.method, handler);
    }

    onGetDeploymentStatus(handler: RequestHandler<Identifiable, GetStackActionStatusResult, void>) {
        this.connection.onRequest(GetDeploymentStatusRequest.method, handler);
    }

    onDescribeValidationStatus(handler: RequestHandler<Identifiable, DescribeValidationStatusResult, void>) {
        this.connection.onRequest(DescribeValidationStatusRequest.method, handler);
    }

    onDescribeDeploymentStatus(handler: RequestHandler<Identifiable, DescribeDeploymentStatusResult, void>) {
        this.connection.onRequest(DescribeDeploymentStatusRequest.method, handler);
    }

    onGetParameters(handler: RequestHandler<TemplateUri, GetParametersResult, void>) {
        this.connection.onRequest(GetParametersRequest.method, handler);
    }

    onGetCapabilities(handler: RequestHandler<TemplateUri, GetCapabilitiesResult, void>) {
        this.connection.onRequest(GetCapabilitiesRequest.method, handler);
    }

    onGetTemplateResources(handler: RequestHandler<TemplateUri, GetTemplateResourcesResult, void>) {
        this.connection.onRequest(GetTemplateResourcesRequest.method, handler);
    }

    onListStacks(handler: RequestHandler<ListStacksParams, ListStacksResult, void>) {
        this.connection.onRequest(ListStacksRequest.method, handler);
    }

    onGetStackTemplate(handler: RequestHandler<GetStackTemplateParams, GetStackTemplateResult | undefined, void>) {
        this.connection.onRequest(GetStackTemplateRequest.method, handler);
    }
}
