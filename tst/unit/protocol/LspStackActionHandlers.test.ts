import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection, RequestHandler } from 'vscode-languageserver/node';
import { LspStackHandlers } from '../../../src/protocol/LspStackHandlers';
import { Identifiable } from '../../../src/protocol/LspTypes';
import {
    StackActionCapabilitiesRequest,
    StackActionParametersRequest,
    StackActionValidationCreateRequest,
    StackActionDeploymentCreateRequest,
    StackActionValidationStatusRequest,
    StackActionDeploymentStatusRequest,
} from '../../../src/stacks/actions/StackActionProtocol';
import {
    GetCapabilitiesResult,
    StackActionMetadataParams,
    GetParametersResult,
    StackActionParams,
    StackActionResult,
    StackActionStatusResult,
} from '../../../src/stacks/actions/StackActionRequestType';

describe('LspTemplateHandlers', () => {
    let connection: StubbedInstance<Connection>;
    let stackActionHandlers: LspStackHandlers;

    beforeEach(() => {
        connection = stubInterface<Connection>();
        stackActionHandlers = new LspStackHandlers(connection);
    });

    it('should register onGetParameters handler', () => {
        const mockHandler: RequestHandler<StackActionMetadataParams, GetParametersResult, never> = vi.fn();

        stackActionHandlers.onGetParameters(mockHandler);

        expect(connection.onRequest.calledWith(StackActionParametersRequest.method)).toBe(true);
    });

    it('should register onGetCapabilities handler', () => {
        const mockHandler: RequestHandler<StackActionMetadataParams, GetCapabilitiesResult, never> = vi.fn();

        stackActionHandlers.onGetCapabilities(mockHandler);

        expect(connection.onRequest.calledWith(StackActionCapabilitiesRequest.method)).toBe(true);
    });

    it('should register onTemplateValidate handler', () => {
        const mockHandler: RequestHandler<StackActionParams, StackActionResult, void> = vi.fn();

        stackActionHandlers.onTemplateValidationCreate(mockHandler);

        expect(connection.onRequest.calledWith(StackActionValidationCreateRequest.method)).toBe(true);
    });

    it('should register onTemplateDeploy handler', () => {
        const mockHandler: RequestHandler<StackActionParams, StackActionResult, void> = vi.fn();

        stackActionHandlers.onTemplateDeploymentCreate(mockHandler);

        expect(connection.onRequest.calledWith(StackActionDeploymentCreateRequest.method)).toBe(true);
    });

    it('should register onTemplateValidatePoll handler', () => {
        const mockHandler: RequestHandler<Identifiable, StackActionStatusResult, void> = vi.fn();

        stackActionHandlers.onTemplateValidationStatus(mockHandler);

        expect(connection.onRequest.calledWith(StackActionValidationStatusRequest.method)).toBe(true);
    });

    it('should register onTemplateDeployPoll handler', () => {
        const mockHandler: RequestHandler<Identifiable, StackActionStatusResult, void> = vi.fn();

        stackActionHandlers.onTemplateDeploymentStatus(mockHandler);

        expect(connection.onRequest.calledWith(StackActionDeploymentStatusRequest.method)).toBe(true);
    });
});
