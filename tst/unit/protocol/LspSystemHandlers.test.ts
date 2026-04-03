import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection } from 'vscode-languageserver/node';
import { GetSystemStatusRequestType, LspSystemHandlers } from '../../../src/protocol/LspSystemHandlers';

describe('LspSystemHandlers', () => {
    let lspSystemHandlers: LspSystemHandlers;
    let mockConnection: StubbedInstance<Connection>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockConnection = stubInterface<Connection>();
        lspSystemHandlers = new LspSystemHandlers(mockConnection);
    });

    describe('constructor', () => {
        it('should initialize with connection', () => {
            expect(lspSystemHandlers).toBeDefined();
        });
    });

    describe('handler registration', () => {
        it('should register system status handler', () => {
            const mockHandler = vi.fn();

            lspSystemHandlers.onGetSystemStatus(mockHandler);

            expect(mockConnection.onRequest.calledWith(GetSystemStatusRequestType.method)).toBe(true);
        });
    });
});
