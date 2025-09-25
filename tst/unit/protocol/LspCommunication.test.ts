import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection, RemoteConsole } from 'vscode-languageserver/node';
import {
    ShowMessageParams,
    ShowMessageRequestParams,
    LogMessageParams,
    MessageActionItem,
    MessageType,
} from 'vscode-languageserver-protocol';
import { LspCommunication } from '../../../src/protocol/LspCommunication';

describe('LspCommunication', () => {
    let lspCommunication: LspCommunication;
    let mockConnection: StubbedInstance<Connection>;
    let mockConsole: StubbedInstance<RemoteConsole>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockConsole = stubInterface<RemoteConsole>();
        mockConnection = stubInterface<Connection>();
        mockConnection.console = mockConsole;

        lspCommunication = new LspCommunication(mockConnection);
    });

    describe('constructor', () => {
        it('should initialize with connection and expose console', () => {
            expect(lspCommunication).toBeDefined();
            expect(lspCommunication.console).toBe(mockConsole);
        });
    });

    describe('showMessage', () => {
        it('should send show message notification', async () => {
            const params: ShowMessageParams = {
                type: MessageType.Info,
                message: 'Test message',
            };

            await lspCommunication.showMessage(params);

            expect(mockConnection.sendNotification.calledWith('window/showMessage', params)).toBe(true);
        });

        it('should handle error messages', async () => {
            const params: ShowMessageParams = {
                type: MessageType.Error,
                message: 'Error occurred',
            };

            await lspCommunication.showMessage(params);

            expect(mockConnection.sendNotification.calledWith('window/showMessage', params)).toBe(true);
        });

        it('should handle warning messages', async () => {
            const params: ShowMessageParams = {
                type: MessageType.Warning,
                message: 'Warning message',
            };

            await lspCommunication.showMessage(params);

            expect(mockConnection.sendNotification.calledWith('window/showMessage', params)).toBe(true);
        });
    });

    describe('showMessageRequest', () => {
        it('should send show message request and return response', async () => {
            const params: ShowMessageRequestParams = {
                type: MessageType.Info,
                message: 'Choose an option',
                actions: [{ title: 'Yes' }, { title: 'No' }],
            };

            const mockResponse: MessageActionItem = { title: 'Yes' };
            mockConnection.sendRequest.resolves(mockResponse);

            const result = await lspCommunication.showMessageRequest(params);

            expect(mockConnection.sendRequest.calledWith('window/showMessageRequest', params)).toBe(true);
            expect(result).toEqual(mockResponse);
        });

        it('should handle null response from message request', async () => {
            const params: ShowMessageRequestParams = {
                type: MessageType.Info,
                message: 'Choose an option',
                actions: [{ title: 'OK' }],
            };

            mockConnection.sendRequest.resolves(null);

            const result = await lspCommunication.showMessageRequest(params);

            expect(result).toBeNull();
        });

        it('should handle undefined response from message request', async () => {
            const params: ShowMessageRequestParams = {
                type: MessageType.Info,
                message: 'Choose an option',
                actions: [{ title: 'OK' }],
            };

            mockConnection.sendRequest.resolves(undefined);

            const result = await lspCommunication.showMessageRequest(params);

            expect(result).toBeUndefined();
        });
    });

    describe('logMessage', () => {
        it('should send log message notification', async () => {
            const params: LogMessageParams = {
                type: MessageType.Log,
                message: 'Debug information',
            };

            await lspCommunication.logMessage(params);

            expect(mockConnection.sendNotification.calledWith('window/logMessage', params)).toBe(true);
        });

        it('should handle different log levels', async () => {
            const errorParams: LogMessageParams = {
                type: MessageType.Error,
                message: 'Error log',
            };

            const warningParams: LogMessageParams = {
                type: MessageType.Warning,
                message: 'Warning log',
            };

            const infoParams: LogMessageParams = {
                type: MessageType.Info,
                message: 'Info log',
            };

            await lspCommunication.logMessage(errorParams);
            await lspCommunication.logMessage(warningParams);
            await lspCommunication.logMessage(infoParams);

            expect(mockConnection.sendNotification.calledWith('window/logMessage', errorParams)).toBe(true);
            expect(mockConnection.sendNotification.calledWith('window/logMessage', warningParams)).toBe(true);
            expect(mockConnection.sendNotification.calledWith('window/logMessage', infoParams)).toBe(true);
        });
    });

    describe('console access', () => {
        it('should provide access to remote console', () => {
            expect(lspCommunication.console).toBe(mockConsole);
        });

        it('should allow console operations through exposed console', () => {
            lspCommunication.console.info('Test info');
            lspCommunication.console.error('Test error');
            lspCommunication.console.warn('Test warning');

            expect(mockConsole.info.calledWith('Test info')).toBe(true);
            expect(mockConsole.error.calledWith('Test error')).toBe(true);
            expect(mockConsole.warn.calledWith('Test warning')).toBe(true);
        });
    });
});
