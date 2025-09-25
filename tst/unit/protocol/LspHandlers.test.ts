import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection } from 'vscode-languageserver/node';
import { LspHandlers } from '../../../src/protocol/LspHandlers';

describe('LspHandlers', () => {
    let lspHandlers: LspHandlers;
    let mockConnection: StubbedInstance<Connection>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockConnection = stubInterface<Connection>();
        lspHandlers = new LspHandlers(mockConnection);
    });

    describe('constructor', () => {
        it('should initialize with connection', () => {
            expect(lspHandlers).toBeDefined();
        });
    });

    describe('handler registration', () => {
        it('should register completion handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onCompletion(mockHandler);

            expect(mockConnection.onCompletion.calledWith(mockHandler)).toBe(true);
        });

        it('should register completion resolve handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onCompletionResolve(mockHandler);

            expect(mockConnection.onCompletionResolve.calledWith(mockHandler)).toBe(true);
        });

        it('should register hover handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onHover(mockHandler);

            expect(mockConnection.onHover.calledWith(mockHandler)).toBe(true);
        });

        it('should register definition handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onDefinition(mockHandler);

            expect(mockConnection.onDefinition.calledWith(mockHandler)).toBe(true);
        });

        it('should register signature help handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onSignatureHelp(mockHandler);

            expect(mockConnection.onSignatureHelp.calledWith(mockHandler)).toBe(true);
        });

        it('should register document symbol handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onDocumentSymbol(mockHandler);

            expect(mockConnection.onDocumentSymbol.calledWith(mockHandler)).toBe(true);
        });

        it('should register workspace symbol handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onWorkspaceSymbol(mockHandler);

            expect(mockConnection.onWorkspaceSymbol.calledWith(mockHandler)).toBe(true);
        });

        it('should register references handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onReferences(mockHandler);

            expect(mockConnection.onReferences.calledWith(mockHandler)).toBe(true);
        });

        it('should register rename handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onRenameRequest(mockHandler);

            expect(mockConnection.onRenameRequest.calledWith(mockHandler)).toBe(true);
        });

        it('should register execute command handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onExecuteCommand(mockHandler);

            expect(mockConnection.onExecuteCommand.calledWith(mockHandler)).toBe(true);
        });

        it('should register code action handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onCodeAction(mockHandler);

            expect(mockConnection.onCodeAction.calledWith(mockHandler)).toBe(true);
        });

        it('should register configuration change handler', () => {
            const mockHandler = vi.fn();

            lspHandlers.onDidChangeConfiguration(mockHandler);

            expect(mockConnection.onDidChangeConfiguration.calledWith(mockHandler)).toBe(true);
        });
    });
});
