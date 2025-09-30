import { Connection, ServerRequestHandler } from 'vscode-languageserver';
import {
    TemplateValidationCreateRequest,
    TemplateDeploymentCreateRequest,
    TemplateDeploymentStatusRequest,
    TemplateValidationStatusRequest,
    GetParametersRequest,
} from '../stackActions/StackActionProtocol';
import {
    StackActionParams,
    StackActionResult,
    StackActionStatusResult,
    GetParametersParams,
    GetParametersResult,
} from '../stackActions/StackActionRequestType';
import { Identifiable } from './LspTypes';

export class LspStackActionHandlers {
    constructor(private readonly connection: Connection) {}

    onTemplateValidationCreate(handler: ServerRequestHandler<StackActionParams, StackActionResult, never, void>) {
        this.connection.onRequest(TemplateValidationCreateRequest.method, handler);
    }

    onTemplateDeploymentCreate(handler: ServerRequestHandler<StackActionParams, StackActionResult, never, void>) {
        this.connection.onRequest(TemplateDeploymentCreateRequest.method, handler);
    }

    onTemplateValidationStatus(handler: ServerRequestHandler<Identifiable, StackActionStatusResult, never, void>) {
        this.connection.onRequest(TemplateValidationStatusRequest.method, handler);
    }

    onTemplateDeploymentStatus(handler: ServerRequestHandler<Identifiable, StackActionStatusResult, never, void>) {
        this.connection.onRequest(TemplateDeploymentStatusRequest.method, handler);
    }

    onGetParameters(handler: ServerRequestHandler<GetParametersParams, GetParametersResult, never, void>) {
        this.connection.onRequest(GetParametersRequest.method, handler);
    }
}
