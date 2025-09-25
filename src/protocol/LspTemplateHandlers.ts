import { Connection, ServerRequestHandler } from 'vscode-languageserver';
import {
    TemplateActionParams,
    TemplateActionResult,
    TemplateValidationCreateRequest,
    TemplateDeploymentCreateRequest,
    TemplateDeploymentStatusRequest,
    TemplateStatusResult,
    TemplateValidationStatusRequest,
    GetParametersParams,
    GetParametersRequest,
    GetParametersResult,
} from '../templates/TemplateRequestType';
import { Identifiable } from './LspTypes';

export class LspTemplateHandlers {
    constructor(private readonly connection: Connection) {}

    onTemplateValidationCreate(handler: ServerRequestHandler<TemplateActionParams, TemplateActionResult, never, void>) {
        this.connection.onRequest(TemplateValidationCreateRequest.method, handler);
    }

    onTemplateDeploymentCreate(handler: ServerRequestHandler<TemplateActionParams, TemplateActionResult, never, void>) {
        this.connection.onRequest(TemplateDeploymentCreateRequest.method, handler);
    }

    onTemplateValidationStatus(handler: ServerRequestHandler<Identifiable, TemplateStatusResult, never, void>) {
        this.connection.onRequest(TemplateValidationStatusRequest.method, handler);
    }

    onTemplateDeploymentStatus(handler: ServerRequestHandler<Identifiable, TemplateStatusResult, never, void>) {
        this.connection.onRequest(TemplateDeploymentStatusRequest.method, handler);
    }

    onGetParameters(handler: ServerRequestHandler<GetParametersParams, GetParametersResult, never, void>) {
        this.connection.onRequest(GetParametersRequest.method, handler);
    }
}
