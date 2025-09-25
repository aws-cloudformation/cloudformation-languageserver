import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection, ServerRequestHandler } from 'vscode-languageserver/node';
import { LspTemplateHandlers } from '../../../src/protocol/LspTemplateHandlers';
import { Identifiable } from '../../../src/protocol/LspTypes';
import {
    GetParametersParams,
    GetParametersResult,
    GetParametersRequest,
    TemplateActionParams,
    TemplateActionResult,
    TemplateValidationCreateRequest,
    TemplateDeploymentCreateRequest,
    TemplateValidationStatusRequest,
    TemplateDeploymentStatusRequest,
    TemplateStatusResult,
} from '../../../src/templates/TemplateRequestType';

describe('LspTemplateHandlers', () => {
    let connection: StubbedInstance<Connection>;
    let templateHandlers: LspTemplateHandlers;

    beforeEach(() => {
        connection = stubInterface<Connection>();
        templateHandlers = new LspTemplateHandlers(connection);
    });

    it('should register onGetParameters handler', () => {
        const mockHandler: ServerRequestHandler<GetParametersParams, GetParametersResult, never, void> = vi.fn();

        templateHandlers.onGetParameters(mockHandler);

        expect(connection.onRequest.calledWith(GetParametersRequest.method)).toBe(true);
    });

    it('should register onTemplateValidate handler', () => {
        const mockHandler: ServerRequestHandler<TemplateActionParams, TemplateActionResult, never, void> = vi.fn();

        templateHandlers.onTemplateValidationCreate(mockHandler);

        expect(connection.onRequest.calledWith(TemplateValidationCreateRequest.method)).toBe(true);
    });

    it('should register onTemplateDeploy handler', () => {
        const mockHandler: ServerRequestHandler<TemplateActionParams, TemplateActionResult, never, void> = vi.fn();

        templateHandlers.onTemplateDeploymentCreate(mockHandler);

        expect(connection.onRequest.calledWith(TemplateDeploymentCreateRequest.method)).toBe(true);
    });

    it('should register onTemplateValidatePoll handler', () => {
        const mockHandler: ServerRequestHandler<Identifiable, TemplateStatusResult, never, void> = vi.fn();

        templateHandlers.onTemplateValidationStatus(mockHandler);

        expect(connection.onRequest.calledWith(TemplateValidationStatusRequest.method)).toBe(true);
    });

    it('should register onTemplateDeployPoll handler', () => {
        const mockHandler: ServerRequestHandler<Identifiable, TemplateStatusResult, never, void> = vi.fn();

        templateHandlers.onTemplateDeploymentStatus(mockHandler);

        expect(connection.onRequest.calledWith(TemplateDeploymentStatusRequest.method)).toBe(true);
    });
});
