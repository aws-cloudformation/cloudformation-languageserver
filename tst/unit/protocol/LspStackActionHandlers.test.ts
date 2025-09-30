import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection, ServerRequestHandler } from 'vscode-languageserver/node';
import { LspStackActionHandlers } from '../../../src/protocol/LspStackActionHandlers';
import { Identifiable } from '../../../src/protocol/LspTypes';
import {
    GetParametersRequest,
    TemplateValidationCreateRequest,
    TemplateDeploymentCreateRequest,
    TemplateValidationStatusRequest,
    TemplateDeploymentStatusRequest,
} from '../../../src/stackActions/StackActionProtocol';
import {
    GetParametersParams,
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
        const mockHandler: ServerRequestHandler<GetParametersParams, GetParametersResult, never, void> = vi.fn();

        stackActionHandlers.onGetParameters(mockHandler);

        expect(connection.onRequest.calledWith(GetParametersRequest.method)).toBe(true);
    });

    it('should register onTemplateValidate handler', () => {
        const mockHandler: ServerRequestHandler<StackActionParams, StackActionResult, never, void> = vi.fn();

        stackActionHandlers.onTemplateValidationCreate(mockHandler);

        expect(connection.onRequest.calledWith(TemplateValidationCreateRequest.method)).toBe(true);
    });

    it('should register onTemplateDeploy handler', () => {
        const mockHandler: ServerRequestHandler<StackActionParams, StackActionResult, never, void> = vi.fn();

        stackActionHandlers.onTemplateDeploymentCreate(mockHandler);

        expect(connection.onRequest.calledWith(TemplateDeploymentCreateRequest.method)).toBe(true);
    });

    it('should register onTemplateValidatePoll handler', () => {
        const mockHandler: ServerRequestHandler<Identifiable, StackActionStatusResult, never, void> = vi.fn();

        stackActionHandlers.onTemplateValidationStatus(mockHandler);

        expect(connection.onRequest.calledWith(TemplateValidationStatusRequest.method)).toBe(true);
    });

    it('should register onTemplateDeployPoll handler', () => {
        const mockHandler: ServerRequestHandler<Identifiable, StackActionStatusResult, never, void> = vi.fn();

        stackActionHandlers.onTemplateDeploymentStatus(mockHandler);

        expect(connection.onRequest.calledWith(TemplateDeploymentStatusRequest.method)).toBe(true);
    });
});
