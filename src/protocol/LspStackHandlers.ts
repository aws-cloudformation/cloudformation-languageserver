import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    StackActionValidationCreateRequest,
    StackActionDeploymentCreateRequest,
    StackActionDeploymentStatusRequest,
    StackActionValidationStatusRequest,
    StackActionCapabilitiesRequest,
    StackActionParametersRequest,
} from '../stacks/actions/StackActionProtocol';
import {
    StackActionMetadataParams,
    StackActionParams,
    StackActionResult,
    StackActionStatusResult,
    GetParametersResult,
    GetCapabilitiesResult,
} from '../stacks/actions/StackActionRequestType';
import { ListStacksParams, ListStacksRequest, ListStacksResult } from '../stacks/StackRequestType';
import { Identifiable } from './LspTypes';

export class LspStackHandlers {
    constructor(private readonly connection: Connection) {}

    onTemplateValidationCreate(handler: RequestHandler<StackActionParams, StackActionResult, void>) {
        this.connection.onRequest(StackActionValidationCreateRequest.method, handler);
    }

    onTemplateDeploymentCreate(handler: RequestHandler<StackActionParams, StackActionResult, void>) {
        this.connection.onRequest(StackActionDeploymentCreateRequest.method, handler);
    }

    onTemplateValidationStatus(handler: RequestHandler<Identifiable, StackActionStatusResult, void>) {
        this.connection.onRequest(StackActionValidationStatusRequest.method, handler);
    }

    onTemplateDeploymentStatus(handler: RequestHandler<Identifiable, StackActionStatusResult, void>) {
        this.connection.onRequest(StackActionDeploymentStatusRequest.method, handler);
    }

    onGetParameters(handler: RequestHandler<StackActionMetadataParams, GetParametersResult, void>) {
        this.connection.onRequest(StackActionParametersRequest.method, handler);
    }

    onGetCapabilities(handler: RequestHandler<StackActionMetadataParams, GetCapabilitiesResult, void>) {
        this.connection.onRequest(StackActionCapabilitiesRequest.method, handler);
    }

    onListStacks(handler: RequestHandler<ListStacksParams, ListStacksResult, void>) {
        this.connection.onRequest(ListStacksRequest.method, handler);
    }
}
