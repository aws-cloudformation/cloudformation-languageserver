import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection, RequestHandler } from 'vscode-languageserver/node';
import { LspStackHandlers } from '../../../src/protocol/LspStackHandlers';
import { Identifiable } from '../../../src/protocol/LspTypes';
import {
    GetCapabilitiesRequest,
    GetParametersRequest,
    CreateValidationRequest,
    CreateDeploymentRequest,
    GetValidationStatusRequest,
    GetDeploymentStatusRequest,
} from '../../../src/stacks/actions/StackActionProtocol';
import {
    GetCapabilitiesResult,
    TemplateUri,
    GetParametersResult,
    CreateStackActionParams,
    CreateStackActionResult,
    GetStackActionStatusResult,
} from '../../../src/stacks/actions/StackActionRequestType';

describe('LspTemplateHandlers', () => {
    let connection: StubbedInstance<Connection>;
    let stackActionHandlers: LspStackHandlers;

    beforeEach(() => {
        connection = stubInterface<Connection>();
        stackActionHandlers = new LspStackHandlers(connection);
    });

    it('should register onGetParameters handler', () => {
        const mockHandler: RequestHandler<TemplateUri, GetParametersResult, never> = vi.fn();

        stackActionHandlers.onGetParameters(mockHandler);

        expect(connection.onRequest.calledWith(GetParametersRequest.method)).toBe(true);
    });

    it('should register onGetCapabilities handler', () => {
        const mockHandler: RequestHandler<TemplateUri, GetCapabilitiesResult, never> = vi.fn();

        stackActionHandlers.onGetCapabilities(mockHandler);

        expect(connection.onRequest.calledWith(GetCapabilitiesRequest.method)).toBe(true);
    });

    it('should register onTemplateValidate handler', () => {
        const mockHandler: RequestHandler<CreateStackActionParams, CreateStackActionResult, void> = vi.fn();

        stackActionHandlers.onCreateValidation(mockHandler);

        expect(connection.onRequest.calledWith(CreateValidationRequest.method)).toBe(true);
    });

    it('should register onTemplateDeploy handler', () => {
        const mockHandler: RequestHandler<CreateStackActionParams, CreateStackActionResult, void> = vi.fn();

        stackActionHandlers.onCreateDeployment(mockHandler);

        expect(connection.onRequest.calledWith(CreateDeploymentRequest.method)).toBe(true);
    });

    it('should register onTemplateValidatePoll handler', () => {
        const mockHandler: RequestHandler<Identifiable, GetStackActionStatusResult, void> = vi.fn();

        stackActionHandlers.onGetValidationStatus(mockHandler);

        expect(connection.onRequest.calledWith(GetValidationStatusRequest.method)).toBe(true);
    });

    it('should register onTemplateDeployPoll handler', () => {
        const mockHandler: RequestHandler<Identifiable, GetStackActionStatusResult, void> = vi.fn();

        stackActionHandlers.onGetDeploymentStatus(mockHandler);

        expect(connection.onRequest.calledWith(GetDeploymentStatusRequest.method)).toBe(true);
    });
});
