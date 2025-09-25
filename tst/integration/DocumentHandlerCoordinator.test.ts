import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Range } from 'vscode-languageserver';
import { TextDocumentChangeEvent } from 'vscode-languageserver/lib/common/textDocuments';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentUri } from 'vscode-languageserver-textdocument/lib/esm/main';
import { didCloseHandler } from '../../src/handlers/DocumentHandler';
import { DiagnosticCoordinator } from '../../src/services/DiagnosticCoordinator';
import { createMockComponents } from '../utils/MockServerComponents';

function mockDocumentEvent(uri: DocumentUri, content: string): TextDocumentChangeEvent<TextDocument> {
    return {
        document: {
            uri,
            getText: (_range?: Range) => content,
        } as TextDocument,
    };
}

describe('DocumentHandler Integration with DiagnosticCoordinator', () => {
    let mockServices: ReturnType<typeof createMockComponents>;
    let realCoordinator: DiagnosticCoordinator;
    let mockLspDiagnostics: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create a real DiagnosticCoordinator with mocked LspDiagnostics
        mockLspDiagnostics = {
            publishDiagnostics: vi.fn().mockResolvedValue(undefined),
        };
        realCoordinator = new DiagnosticCoordinator(mockLspDiagnostics);

        // Create mock services with the real coordinator
        mockServices = createMockComponents({
            diagnosticCoordinator: realCoordinator,
        });

        // Mock other services
        mockServices.cfnLintService.cancelDelayedLinting.returns();
        mockServices.syntaxTreeManager.deleteSyntaxTree.returns(true);
    });

    describe('didCloseHandler integration', () => {
        it('should clear all diagnostics from all sources when document is closed', async () => {
            const documentUri = 'file:///test.yaml';

            // Simulate diagnostics from multiple sources
            await realCoordinator.publishDiagnostics('cfn-lint', documentUri, [
                {
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                    message: 'CFN Lint error',
                    severity: 1,
                },
            ]);

            await realCoordinator.publishDiagnostics('validation', documentUri, [
                {
                    range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
                    message: 'Validation error',
                    severity: 2,
                },
            ]);

            // Verify diagnostics are present
            const diagnosticsBeforeClose = realCoordinator.getDiagnostics(documentUri);
            expect(diagnosticsBeforeClose).toHaveLength(2);
            expect(realCoordinator.getSources(documentUri)).toEqual(['cfn-lint', 'validation']);

            // Create and execute the close handler
            const handler = didCloseHandler(mockServices);
            const event = mockDocumentEvent(documentUri, '');

            handler(event);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Verify all diagnostics are cleared
            const diagnosticsAfterClose = realCoordinator.getDiagnostics(documentUri);
            expect(diagnosticsAfterClose).toHaveLength(0);
            expect(realCoordinator.getSources(documentUri)).toEqual([]);

            // Verify LSP was called to clear diagnostics
            expect(mockLspDiagnostics.publishDiagnostics).toHaveBeenLastCalledWith({
                uri: documentUri,
                diagnostics: [],
            });
        });

        it('should handle coordinator errors without affecting other cleanup operations', async () => {
            const documentUri = 'file:///test.yaml';

            // Create a coordinator that will fail
            const failingCoordinator = {
                clearDiagnosticsForUri: vi.fn().mockRejectedValue(new Error('Coordinator failure')),
            } as any;

            const servicesWithFailingCoordinator = createMockComponents({
                diagnosticCoordinator: failingCoordinator,
            });
            servicesWithFailingCoordinator.cfnLintService.cancelDelayedLinting.returns();
            servicesWithFailingCoordinator.syntaxTreeManager.deleteSyntaxTree.returns(true);

            const handler = didCloseHandler(servicesWithFailingCoordinator);
            const event = mockDocumentEvent(documentUri, '');

            // Should not throw despite coordinator failure
            expect(() => handler(event)).not.toThrow();

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Verify other cleanup operations still occurred
            expect(servicesWithFailingCoordinator.cfnLintService.cancelDelayedLinting.calledWith(documentUri)).toBe(
                true,
            );
            expect(servicesWithFailingCoordinator.syntaxTreeManager.deleteSyntaxTree.calledWith(documentUri)).toBe(
                true,
            );
            expect(failingCoordinator.clearDiagnosticsForUri).toHaveBeenCalledWith(documentUri);
        });

        it('should only clear diagnostics for the specific document', async () => {
            const documentUri1 = 'file:///test1.yaml';
            const documentUri2 = 'file:///test2.yaml';

            // Add diagnostics for both documents
            await realCoordinator.publishDiagnostics('cfn-lint', documentUri1, [
                {
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                    message: 'Error in doc 1',
                    severity: 1,
                },
            ]);

            await realCoordinator.publishDiagnostics('cfn-lint', documentUri2, [
                {
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                    message: 'Error in doc 2',
                    severity: 1,
                },
            ]);

            // Verify both documents have diagnostics
            expect(realCoordinator.getDiagnostics(documentUri1)).toHaveLength(1);
            expect(realCoordinator.getDiagnostics(documentUri2)).toHaveLength(1);

            // Close only the first document
            const handler = didCloseHandler(mockServices);
            const event = mockDocumentEvent(documentUri1, '');

            handler(event);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Verify only the first document's diagnostics are cleared
            expect(realCoordinator.getDiagnostics(documentUri1)).toHaveLength(0);
            expect(realCoordinator.getDiagnostics(documentUri2)).toHaveLength(1);
        });
    });
});
