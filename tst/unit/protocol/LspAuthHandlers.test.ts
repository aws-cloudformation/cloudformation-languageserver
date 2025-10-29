import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection } from 'vscode-languageserver/node';
import { IamCredentialsUpdateRequest, IamCredentialsDeleteNotification } from '../../../src/auth/AuthProtocol';
import { LspAuthHandlers } from '../../../src/protocol/LspAuthHandlers';

describe('LspAuthHandlers', () => {
    let lspAwsHandlers: LspAuthHandlers;
    let mockConnection: StubbedInstance<Connection>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockConnection = stubInterface<Connection>();
        lspAwsHandlers = new LspAuthHandlers(mockConnection);
    });

    describe('constructor', () => {
        it('should initialize with connection', () => {
            expect(lspAwsHandlers).toBeDefined();
        });
    });

    describe('credential handlers - receive from client', () => {
        it('should register IAM credentials update handler', () => {
            const mockHandler = vi.fn();

            lspAwsHandlers.onIamCredentialsUpdate(mockHandler);

            expect(mockConnection.onRequest.calledOnce).toBe(true);
            expect(mockConnection.onRequest.firstCall.args[0]).toBe(IamCredentialsUpdateRequest.type);
        });

        it('should register IAM credentials delete handler', () => {
            const mockHandler = vi.fn();

            lspAwsHandlers.onIamCredentialsDelete(mockHandler);

            expect(mockConnection.onNotification.calledOnce).toBe(true);
            expect(mockConnection.onNotification.firstCall.args[0]).toBe(IamCredentialsDeleteNotification.type);
        });
    });
});
