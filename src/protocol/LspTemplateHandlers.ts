import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    TemplateActionParams,
    TemplateActionResult,
    TemplateValidationCreateRequest,
    TemplateDeploymentCreateRequest,
    TemplateDeploymentStatusRequest,
    TemplateStatusResult,
    TemplateValidationStatusRequest,
    TemplateMetadataParams,
    GetParametersRequest,
    GetParametersResult,
    GetCapabilitiesRequest,
    GetCapabilitiesResult,
} from '../templates/TemplateRequestType';
import { Identifiable } from './LspTypes';

export class LspTemplateHandlers {
    constructor(private readonly connection: Connection) {}

    onTemplateValidationCreate(handler: RequestHandler<TemplateActionParams, TemplateActionResult, void>) {
        this.connection.onRequest(TemplateValidationCreateRequest.method, handler);
    }

    onTemplateDeploymentCreate(handler: RequestHandler<TemplateActionParams, TemplateActionResult, void>) {
        this.connection.onRequest(TemplateDeploymentCreateRequest.method, handler);
    }

    onTemplateValidationStatus(handler: RequestHandler<Identifiable, TemplateStatusResult, void>) {
        this.connection.onRequest(TemplateValidationStatusRequest.method, handler);
    }

    onTemplateDeploymentStatus(handler: RequestHandler<Identifiable, TemplateStatusResult, void>) {
        this.connection.onRequest(TemplateDeploymentStatusRequest.method, handler);
    }

    onGetParameters(handler: RequestHandler<TemplateMetadataParams, GetParametersResult, void>) {
        this.connection.onRequest(GetParametersRequest.method, handler);
    }

    onGetCapabilities(handler: RequestHandler<TemplateMetadataParams, GetCapabilitiesResult, void>) {
        this.connection.onRequest(GetCapabilitiesRequest.method, handler);
    }
}
