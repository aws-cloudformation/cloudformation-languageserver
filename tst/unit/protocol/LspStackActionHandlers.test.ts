import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection, RequestHandler } from 'vscode-languageserver/node';
import { LspStackActionHandlers } from '../../../src/protocol/LspStackActionHandlers';
import { Identifiable } from '../../../src/protocol/LspTypes';
import {
    GetCapabilitiesRequest,
    GetParametersRequest,
    TemplateValidationCreateRequest,
    TemplateDeploymentCreateRequest,
    TemplateValidationStatusRequest,
    TemplateDeploymentStatusRequest,
} from '../../../src/stackActions/StackActionProtocol';
import {
    GetCapabilitiesResult,
    TemplateMetadataParams,
    GetParametersResult,
    StackActionParams,
    StackActionResult,
    StackActionStatusResult,
} from '../../../src/stackActions/StackActionRequestType';

describe('LspTemplateHandlers', () => {
    let connection: StubbedInstance<Connection>;
    let stackActionHandlers: LspStackActionHandlers;

    beforeEach(() => {
        connection = stubInterface<Connection>();
        stackActionHandlers = new LspStackActionHandlers(connection);
    });

    it('should register onGetParameters handler', () => {
        const mockHandler: RequestHandler<TemplateMetadataParams, GetParametersResult, never> = vi.fn();

        stackActionHandlers.onGetParameters(mockHandler);

        expect(connection.onRequest.calledWith(GetParametersRequest.method)).toBe(true);
    });

    it('should register onGetCapabilities handler', () => {
        const mockHandler: RequestHandler<TemplateMetadataParams, GetCapabilitiesResult, never> = vi.fn();

        stackActionHandlers.onGetCapabilities(mockHandler);

        expect(connection.onRequest.calledWith(GetCapabilitiesRequest.method)).toBe(true);
    });

    it('should register onTemplateValidate handler', () => {
        const mockHandler: RequestHandler<StackActionParams, StackActionResult, void> = vi.fn();

        stackActionHandlers.onTemplateValidationCreate(mockHandler);

        expect(connection.onRequest.calledWith(TemplateValidationCreateRequest.method)).toBe(true);
    });

    it('should register onTemplateDeploy handler', () => {
        const mockHandler: RequestHandler<StackActionParams, StackActionResult, void> = vi.fn();

        stackActionHandlers.onTemplateDeploymentCreate(mockHandler);

        expect(connection.onRequest.calledWith(TemplateDeploymentCreateRequest.method)).toBe(true);
    });

    it('should register onTemplateValidatePoll handler', () => {
        const mockHandler: RequestHandler<Identifiable, StackActionStatusResult, void> = vi.fn();

        stackActionHandlers.onTemplateValidationStatus(mockHandler);

        expect(connection.onRequest.calledWith(TemplateValidationStatusRequest.method)).toBe(true);
    });

    it('should register onTemplateDeployPoll handler', () => {
        const mockHandler: RequestHandler<Identifiable, StackActionStatusResult, void> = vi.fn();

        stackActionHandlers.onTemplateDeploymentStatus(mockHandler);

        expect(connection.onRequest.calledWith(TemplateDeploymentStatusRequest.method)).toBe(true);
    });
});
