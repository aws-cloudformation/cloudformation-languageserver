import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection, RequestHandler } from 'vscode-languageserver/node';
import { LspRelatedResourcesHandlers } from '../../../src/protocol/LspRelatedResourcesHandlers';
import {
    GetAuthoredResourceTypesRequest,
    GetRelatedResourceTypesParams,
    GetRelatedResourceTypesRequest,
    InsertRelatedResourcesParams,
    InsertRelatedResourcesRequest,
    RelatedResourcesCodeAction,
    TemplateUri,
} from '../../../src/protocol/RelatedResourcesProtocol';

describe('LspRelatedResourcesHandlers', () => {
    let connection: StubbedInstance<Connection>;
    let relatedResourcesHandlers: LspRelatedResourcesHandlers;

    beforeEach(() => {
        connection = stubInterface<Connection>();
        relatedResourcesHandlers = new LspRelatedResourcesHandlers(connection);
    });

    it('should register onGetAuthoredResourceTypes handler', () => {
        const mockHandler: RequestHandler<TemplateUri, string[], void> = vi.fn();

        relatedResourcesHandlers.onGetAuthoredResourceTypes(mockHandler);

        expect(connection.onRequest.calledWith(GetAuthoredResourceTypesRequest.method)).toBe(true);
    });

    it('should register onGetRelatedResourceTypes handler', () => {
        const mockHandler: RequestHandler<GetRelatedResourceTypesParams, string[], void> = vi.fn();

        relatedResourcesHandlers.onGetRelatedResourceTypes(mockHandler);

        expect(connection.onRequest.calledWith(GetRelatedResourceTypesRequest.method)).toBe(true);
    });

    it('should register onInsertRelatedResources handler', () => {
        const mockHandler: RequestHandler<InsertRelatedResourcesParams, RelatedResourcesCodeAction, void> = vi.fn();

        relatedResourcesHandlers.onInsertRelatedResources(mockHandler);

        expect(connection.onRequest.calledWith(InsertRelatedResourcesRequest.method)).toBe(true);
    });
});
