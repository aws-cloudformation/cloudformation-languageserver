import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InitializeParams, InitializeResult } from 'vscode-languageserver/node';
import { InitializedParams } from 'vscode-languageserver-protocol';
import { LspConnection } from '../../../src/protocol/LspConnection';

vi.mock('vscode-languageserver/node', async () => {
    const actual = await vi.importActual('vscode-languageserver/node');
    return {
        ...actual,
        createConnection: vi.fn(() => mockConnection),
        ProposedFeatures: { all: {} },
        TextDocuments: vi.fn(() => ({ listen: vi.fn(), get: vi.fn(), all: vi.fn() })),
    };
});

const mockConnection = {
    onInitialize: vi.fn(),
    onInitialized: vi.fn(),
    onShutdown: vi.fn(),
    onExit: vi.fn(),
    listen: vi.fn(),
    client: { register: vi.fn().mockResolvedValue(undefined) },
    console: { info: vi.fn(), error: vi.fn() },
    workspace: { onDidChangeWorkspaceFolders: vi.fn(), getConfiguration: vi.fn() },
} as any;

describe('LspConnection', () => {
    let mockHandlers: any;
    let lspConnection: LspConnection;

    beforeEach(() => {
        vi.clearAllMocks();
        mockHandlers = {
            onInitialize: vi.fn(),
            onInitialized: vi.fn(),
            onShutdown: vi.fn(),
            onExit: vi.fn(),
        };
        lspConnection = new LspConnection(mockConnection, mockHandlers);
    });

    describe('initialization flow', () => {
        it('should call custom onInitialize handler and return result', () => {
            const mockParams: InitializeParams = { capabilities: {}, workspaceFolders: [] } as any;
            const expectedResult: InitializeResult = { capabilities: {} };
            mockHandlers.onInitialize.mockReturnValue(expectedResult);

            const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
            const result = initializeHandler(mockParams);

            expect(mockHandlers.onInitialize).toHaveBeenCalledWith(mockParams);
            expect(result).toBe(expectedResult);
        });

        it('should call onInitialized handler', () => {
            const mockParams: InitializedParams = {};
            const initializedHandler = mockConnection.onInitialized.mock.calls[0][0];

            initializedHandler(mockParams);

            expect(mockHandlers.onInitialized).toHaveBeenCalledWith(mockParams);
        });
    });

    describe('shutdown and exit', () => {
        it('should call custom shutdown handler', () => {
            const shutdownHandler = mockConnection.onShutdown.mock.calls[0][0];
            shutdownHandler();
            expect(mockHandlers.onShutdown).toHaveBeenCalled();
        });

        it('should call custom exit handler', () => {
            const exitHandler = mockConnection.onExit.mock.calls[0][0];
            exitHandler();
            expect(mockHandlers.onExit).toHaveBeenCalled();
        });
    });

    describe('listen', () => {
        it('should start listening on connection', () => {
            lspConnection.listen();
            expect(mockConnection.listen).toHaveBeenCalled();
        });
    });
});
