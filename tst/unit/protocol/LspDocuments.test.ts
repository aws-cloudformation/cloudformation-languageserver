import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection, TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LspDocuments } from '../../../src/protocol/LspDocuments';
import { ProxyConnection } from '../../../src/protocol/ProxyConnection';

vi.mock('../../../src/protocol/ProxyConnection');

vi.mock('vscode-languageserver/node', async () => {
    const actual = await vi.importActual('vscode-languageserver/node');
    return {
        ...actual,
        TextDocuments: vi.fn(() => ({
            listen: vi.fn(),
            get: vi.fn(),
            all: vi.fn(),
        })),
    };
});

describe('LspDocuments', () => {
    let lspDocuments: LspDocuments;
    let mockConnection: StubbedInstance<Connection>;
    let mockTextDocuments: any;
    let mockProxyConnection: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockConnection = stubInterface<Connection>();

        mockTextDocuments = {
            listen: vi.fn(),
            get: vi.fn(),
            all: vi.fn(),
            onDidOpen: vi.fn(),
            onDidClose: vi.fn(),
            onDidSave: vi.fn(),
        };

        mockProxyConnection = {
            connection: mockConnection,
            addHandler: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        };

        (TextDocuments as any).mockImplementation(() => mockTextDocuments);
        (ProxyConnection as any).mockImplementation(() => mockProxyConnection);

        lspDocuments = new LspDocuments(mockConnection);
    });

    describe('constructor', () => {
        it('should initialize with connection', () => {
            expect(lspDocuments).toBeDefined();
        });

        it('should create TextDocuments instance', () => {
            expect(TextDocuments).toHaveBeenCalledWith(TextDocument);
        });
    });

    describe('listen', () => {
        it('should start listening when not already listening', () => {
            lspDocuments.listen();

            expect(mockTextDocuments.listen).toHaveBeenCalledTimes(1);
        });

        it('should not start listening again if already listening', () => {
            lspDocuments.listen();
            lspDocuments.listen();

            expect(mockTextDocuments.listen).toHaveBeenCalledTimes(1);
        });
    });

    describe('event handlers', () => {
        it('should register onDidOpen handler', () => {
            const mockHandler = vi.fn();

            lspDocuments.onDidOpen(mockHandler);

            expect(mockTextDocuments.onDidOpen).toHaveBeenCalledWith(mockHandler);
        });

        it('should register onDidChangeContent handler', () => {
            const mockHandler = vi.fn();

            lspDocuments.onDidChangeContent(mockHandler);

            expect(mockProxyConnection.addHandler).toHaveBeenCalledWith('onDidChangeTextDocument', mockHandler);
        });

        it('should register onDidClose handler', () => {
            const mockHandler = vi.fn();

            lspDocuments.onDidClose(mockHandler);

            expect(mockTextDocuments.onDidClose).toHaveBeenCalledWith(mockHandler);
        });

        it('should register onDidSave handler', () => {
            const mockHandler = vi.fn();

            lspDocuments.onDidSave(mockHandler);

            expect(mockTextDocuments.onDidSave).toHaveBeenCalledWith(mockHandler);
        });
    });

    describe('listening state', () => {
        it('should track listening state correctly', () => {
            // Initially not listening
            expect((lspDocuments as any).listening).toBe(false);

            // After calling listen
            lspDocuments.listen();
            expect((lspDocuments as any).listening).toBe(true);

            // Calling listen again should not change state
            lspDocuments.listen();
            expect((lspDocuments as any).listening).toBe(true);
        });
    });
});
