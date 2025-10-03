import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    TemplateValidationCreateRequest,
    TemplateDeploymentCreateRequest,
    TemplateDeploymentStatusRequest,
    TemplateValidationStatusRequest,
    GetCapabilitiesRequest,
    GetParametersRequest,
} from '../stackActions/StackActionProtocol';
import {
    TemplateMetadataParams,
    StackActionParams,
    StackActionResult,
    StackActionStatusResult,
    GetParametersResult,
    GetCapabilitiesResult,
} from '../stackActions/StackActionRequestType';
import { Identifiable } from './LspTypes';

export class LspStackActionHandlers {
    constructor(private readonly connection: Connection) {}

    onTemplateValidationCreate(handler: RequestHandler<StackActionParams, StackActionResult, void>) {
        this.connection.onRequest(TemplateValidationCreateRequest.method, handler);
    }

    onTemplateDeploymentCreate(handler: RequestHandler<StackActionParams, StackActionResult, void>) {
        this.connection.onRequest(TemplateDeploymentCreateRequest.method, handler);
    }

    onTemplateValidationStatus(handler: RequestHandler<Identifiable, StackActionStatusResult, void>) {
        this.connection.onRequest(TemplateValidationStatusRequest.method, handler);
    }

    onTemplateDeploymentStatus(handler: RequestHandler<Identifiable, StackActionStatusResult, void>) {
        this.connection.onRequest(TemplateDeploymentStatusRequest.method, handler);
    }

    onGetParameters(handler: RequestHandler<TemplateMetadataParams, GetParametersResult, void>) {
        this.connection.onRequest(GetParametersRequest.method, handler);
    }

    onGetCapabilities(handler: RequestHandler<TemplateMetadataParams, GetCapabilitiesResult, void>) {
        this.connection.onRequest(GetCapabilitiesRequest.method, handler);
    }
}
