import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection } from 'vscode-languageserver/node';
import { LspSchemaHandlers } from '../../../src/protocol/LspSchemaHandlers';
import { GetSchemaReadinessRequestType } from '../../../src/schema/SchemaRequestType';

describe('LspSchemaHandlers', () => {
    let lspSchemaHandlers: LspSchemaHandlers;
    let mockConnection: StubbedInstance<Connection>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockConnection = stubInterface<Connection>();
        lspSchemaHandlers = new LspSchemaHandlers(mockConnection);
    });

    describe('constructor', () => {
        it('should initialize with connection', () => {
            expect(lspSchemaHandlers).toBeDefined();
        });
    });

    describe('handler registration', () => {
        it('should register schema readiness handler', () => {
            const mockHandler = vi.fn();

            lspSchemaHandlers.onGetSchemaReadiness(mockHandler);

            expect(mockConnection.onRequest.calledWith(GetSchemaReadinessRequestType.method)).toBe(true);
        });
    });
});
