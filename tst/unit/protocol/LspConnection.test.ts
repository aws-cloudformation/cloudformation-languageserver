import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InitializeParams, InitializeResult } from 'vscode-languageserver';
import { InitializedParams } from 'vscode-languageserver-protocol';
import { LspConnection } from '../../../src/protocol/LspConnection';

vi.mock('../../../src/protocol/LspDocuments', () => ({
    LspDocuments: vi.fn(function () {
        return {
            listen: vi.fn(),
            get: vi.fn(),
            all: vi.fn(),
        };
    }),
}));

vi.mock('vscode-languageserver', async () => {
    const actual = await vi.importActual('vscode-languageserver');
    return {
        ...actual,
        createConnection: vi.fn(() => mockConnection),
        ProposedFeatures: { all: {} },
        TextDocuments: vi.fn(function () {}),
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
        it('should return custom shutdown handler result', () => {
            const expectedResult = Promise.resolve();
            mockHandlers.onShutdown.mockReturnValue(expectedResult);
            const shutdownHandler = mockConnection.onShutdown.mock.calls[0][0];

            const result = shutdownHandler();

            expect(mockHandlers.onShutdown).toHaveBeenCalled();
            expect(result).toBe(expectedResult);
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
