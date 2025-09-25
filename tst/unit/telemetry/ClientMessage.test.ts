import { Logger } from 'pino';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageType, RemoteConsole, ShowMessageRequestParams } from 'vscode-languageserver';
import { LspCommunication } from '../../../src/protocol/LspCommunication';
import { DefaultSettings, Settings } from '../../../src/settings/Settings';
import { ClientMessage } from '../../../src/telemetry/ClientMessage';
import { createMockLspCommunication } from '../../utils/MockServerComponents';

// Mock the LoggerFactory with inline stub creation
vi.mock('../../../src/telemetry/LoggerFactory', () => ({
    LoggerFactory: {
        getLogger: vi.fn(() => ({
            error: { called: false, calledWith: () => false },
            warn: { called: false, calledWith: () => false },
            info: { called: false, calledWith: () => false },
            debug: { called: false, calledWith: () => false },
        })),
    },
    LogLevel: {
        silent: 0,
        fatal: 1,
        error: 2,
        warn: 3,
        info: 4,
        debug: 5,
        trace: 6,
    },
    DefaultLogLevel: 'info',
    StdOutLogger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('ClientMessage', () => {
    let mockCommunication: StubbedInstance<LspCommunication>;
    let mockConsole: StubbedInstance<RemoteConsole>;
    let mockLoggerInstance: StubbedInstance<Logger>;
    let clientMessage: ClientMessage;
    let settings: Settings;

    beforeEach(async () => {
        // Get the mocked modules
        const { LoggerFactory } = await import('../../../src/telemetry/LoggerFactory');

        mockLoggerInstance = stubInterface<Logger>();
        vi.mocked(LoggerFactory.getLogger).mockReturnValue(mockLoggerInstance);

        mockCommunication = createMockLspCommunication();
        mockConsole = mockCommunication.console as StubbedInstance<RemoteConsole>;

        settings = {
            ...DefaultSettings,
            telemetry: {
                enabled: DefaultSettings.telemetry.enabled,
                logLevel: 'debug',
            },
        };

        clientMessage = new ClientMessage(mockCommunication);

        // Mock SettingsManager for configuration
        const mockSettingsManager = {
            getCurrentSettings: vi.fn(() => settings),
            subscribe: vi.fn(() => ({
                unsubscribe: vi.fn(),
                isActive: vi.fn(() => true),
            })),
        };

        clientMessage.configure(mockSettingsManager as any);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('basic functionality', () => {
        it('should create ClientMessage instance', () => {
            expect(clientMessage).toBeDefined();
        });

        it('should call console methods', () => {
            clientMessage.error('test error');
            clientMessage.warn('test warn');
            clientMessage.info('test info');
            clientMessage.debug('test debug');
            clientMessage.log('test log');

            expect(mockConsole.error.calledWith('test error')).toBe(true);
            expect(mockConsole.warn.calledWith('test warn')).toBe(true);
            expect(mockConsole.info.calledWith('test info')).toBe(true);
            expect(mockConsole.debug.calledWith('test debug')).toBe(true);
            expect(mockConsole.log.calledWith('test log')).toBe(true);
        });
    });

    describe('message notifications', () => {
        it('should send message notifications', async () => {
            mockCommunication.showMessage.returns(Promise.resolve());

            await clientMessage.showMessageNotification(MessageType.Info, 'test notification');

            expect(
                mockCommunication.showMessage.calledWith({
                    type: MessageType.Info,
                    message: 'test notification',
                }),
            ).toBe(true);
        });

        it('should send message requests', async () => {
            const params: ShowMessageRequestParams = {
                type: MessageType.Warning,
                message: 'test request',
            };

            await clientMessage.showMessageRequest(params);

            expect(mockCommunication.showMessageRequest.calledWith(params)).toBe(true);
        });

        it('should send log message notifications', async () => {
            await clientMessage.logMessageNotification(MessageType.Error, 'test log notification');

            expect(
                mockCommunication.logMessage.calledWith({
                    type: MessageType.Error,
                    message: 'test log notification',
                }),
            ).toBe(true);
        });
    });
});
