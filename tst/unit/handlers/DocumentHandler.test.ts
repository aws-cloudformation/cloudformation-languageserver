import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DidChangeTextDocumentParams, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentUri } from 'vscode-languageserver-textdocument/lib/esm/main';
import { Document, CloudFormationFileType } from '../../../src/document/Document';
import {
    didOpenHandler,
    didChangeHandler,
    didCloseHandler,
    didSaveHandler,
} from '../../../src/handlers/DocumentHandler';
import { LintTrigger } from '../../../src/services/cfnLint/CfnLintService';
import { createMockComponents, MockedServerComponents } from '../../utils/MockServerComponents';
import { flushAllPromises } from '../../utils/Utils';

describe('DocumentHandler', () => {
    let mockServices: MockedServerComponents;
    const testUri: DocumentUri = 'file:///test.yaml';
    const testContent = 'AWSTemplateFormatVersion: "2010-09-09"';

    function createTextDocument() {
        return TextDocument.create(testUri, 'yaml', 1, testContent);
    }

    function createEvent() {
        return { document: createTextDocument() };
    }

    function createMockDocument(cfnFileType = CloudFormationFileType.Template) {
        const doc = new Document(createTextDocument());
        (doc as any)._cfnFileType = cfnFileType;
        return doc;
    }

    function mockDocuments(mock: any) {
        (mockServices.documents as any).documents = mock;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        mockServices = createMockComponents();
    });

    describe('didOpenHandler', () => {
        it('should create syntax tree for CloudFormation templates', () => {
            const mockDocument = createMockDocument();
            mockServices.documentManager.get.returns(mockDocument);

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            expect(
                mockServices.syntaxTreeManager.addWithTypes.calledWith(
                    testUri,
                    testContent,
                    mockDocument.documentType,
                    mockDocument.cfnFileType,
                ),
            ).toBe(true);
        });

        it('should use delayed linting and Guard validation for all files', () => {
            const mockDocument = createMockDocument();
            mockServices.documentManager.get.returns(mockDocument);

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            expect(mockServices.cfnLintService.lintDelayed.calledWith(testContent, testUri, LintTrigger.OnOpen)).toBe(
                true,
            );
            expect(mockServices.guardService.validateDelayed.calledWith(testContent, testUri)).toBe(true);
        });

        it.each([
            CloudFormationFileType.Template,
            CloudFormationFileType.GitSyncDeployment,
            CloudFormationFileType.Unknown,
        ])('should use delayed linting for %s files', (cfnFileType) => {
            mockServices.documentManager.get.returns(createMockDocument(cfnFileType));

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            expect(mockServices.cfnLintService.lintDelayed.calledWith(testContent, testUri, LintTrigger.OnOpen)).toBe(
                true,
            );
        });

        it('should handle errors when adding syntax tree', () => {
            const mockDocument = createMockDocument();
            mockServices.documentManager.get.returns(mockDocument);
            mockServices.syntaxTreeManager.addWithTypes.throws(new Error('Syntax error'));

            const handler = didOpenHandler(mockServices);

            expect(() => handler(createEvent())).not.toThrow();
            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
        });

        it('should handle linting and Guard validation errors gracefully', async () => {
            mockServices.documentManager.get.returns(createMockDocument());
            mockServices.cfnLintService.lintDelayed.rejects(new Error('Linting failed'));
            mockServices.guardService.validateDelayed.rejects(new Error('Guard validation error'));

            const handler = didOpenHandler(mockServices);

            expect(() => handler(createEvent())).not.toThrow();

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
        });
    });

    describe('didChangeHandler', () => {
        function createParams(params: any): DidChangeTextDocumentParams {
            return params;
        }

        it('should handle incremental changes and update syntax tree', () => {
            const textDocument = createTextDocument();
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });

            const handler = didChangeHandler(mockServices.documents, mockServices);

            handler(
                createParams({
                    textDocument: { uri: testUri },
                    contentChanges: [
                        {
                            range: Range.create(0, 0, 0, 5),
                            text: 'Hello',
                        },
                    ],
                }),
            );

            expect(
                mockServices.cfnLintService.lintDelayed.calledWith(testContent, testUri, LintTrigger.OnChange, true),
            ).toBe(true);
        });

        it('should use delayed linting and Guard validation for files', () => {
            const textDocument = createTextDocument();
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });

            const handler = didChangeHandler(mockServices.documents, mockServices);

            handler(
                createParams({
                    textDocument: { uri: testUri },
                    contentChanges: [{ text: 'new content' }],
                }),
            );

            expect(
                mockServices.cfnLintService.lintDelayed.calledWith(testContent, testUri, LintTrigger.OnChange, true),
            ).toBe(true);
            expect(mockServices.guardService.validateDelayed.calledWith(testContent, testUri)).toBe(true);
        });

        it('should create syntax tree when update fails', () => {
            const textDocument = createTextDocument();
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });

            mockServices.syntaxTreeManager.getSyntaxTree.returns({} as any); // Mock existing tree
            mockServices.syntaxTreeManager.updateWithEdit.throws(new Error('Update failed'));

            const handler = didChangeHandler(mockServices.documents, mockServices);
            handler(
                createParams({
                    textDocument: { uri: testUri },
                    contentChanges: [
                        {
                            range: Range.create(0, 0, 0, 5),
                            text: 'Hello',
                        },
                    ],
                }),
            );

            expect(mockServices.syntaxTreeManager.add.calledWith(testUri, testContent)).toBe(true);
        });

        it('should handle linting and Guard validation cancellation gracefully', async () => {
            const textDocument = createTextDocument();
            mockDocuments({ get: vi.fn().mockReturnValue(textDocument) });
            mockServices.cfnLintService.lintDelayed.rejects(new Error('Request cancelled'));
            mockServices.guardService.validateDelayed.rejects(new Error('Request cancelled'));

            const handler = didChangeHandler(mockServices.documents, mockServices);

            expect(() =>
                handler(
                    createParams({
                        textDocument: { uri: testUri },
                        contentChanges: [{ text: 'new content' }],
                    }),
                ),
            ).not.toThrow();

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
        });

        it('should handle missing text document gracefully', () => {
            mockDocuments({ get: vi.fn().mockReturnValue(undefined) });

            const handler = didChangeHandler(mockServices.documents, mockServices);
            expect(() =>
                handler(
                    createParams({
                        textDocument: { uri: testUri },
                        contentChanges: [{ text: 'new content' }],
                    }),
                ),
            ).not.toThrow();
            expect(mockServices.cfnLintService.lintDelayed.called).toBe(false);
            expect(mockServices.guardService.validateDelayed.called).toBe(false);
        });
    });

    describe('didCloseHandler', () => {
        it('should cancel linting and Guard validation, delete syntax tree, and clear diagnostics', async () => {
            const handler = didCloseHandler(mockServices);
            handler(createEvent());

            expect(mockServices.cfnLintService.cancelDelayedLinting.calledWith(testUri)).toBe(true);
            expect(mockServices.guardService.cancelDelayedValidation.calledWith(testUri)).toBe(true);
            expect(mockServices.syntaxTreeManager.deleteSyntaxTree.calledWith(testUri)).toBe(true);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.diagnosticCoordinator.clearDiagnosticsForUri.calledWith(testUri)).toBe(true);
        });

        it('should handle diagnostic coordinator errors gracefully', async () => {
            const handler = didCloseHandler(mockServices);
            mockServices.diagnosticCoordinator.clearDiagnosticsForUri.rejects(new Error('Coordinator error'));

            handler(createEvent());

            await flushAllPromises();

            expect(mockServices.cfnLintService.cancelDelayedLinting.calledWith(testUri)).toBe(true);
            expect(mockServices.guardService.cancelDelayedValidation.calledWith(testUri)).toBe(true);
            expect(mockServices.syntaxTreeManager.deleteSyntaxTree.calledWith(testUri)).toBe(true);
            expect(mockServices.diagnosticCoordinator.clearDiagnosticsForUri.calledWith(testUri)).toBe(true);
        });
    });

    describe('didSaveHandler', () => {
        it('should use delayed linting and Guard validation for files', () => {
            const handler = didSaveHandler(mockServices);
            handler(createEvent());

            expect(mockServices.cfnLintService.lintDelayed.calledWith(testContent, testUri, LintTrigger.OnSave)).toBe(
                true,
            );
            expect(mockServices.guardService.validateDelayed.calledWith(testContent, testUri)).toBe(true);
        });

        it('should handle linting and Guard validation errors gracefully', async () => {
            mockServices.cfnLintService.lintDelayed.rejects(new Error('Linting failed'));
            mockServices.guardService.validateDelayed.rejects(new Error('Guard validation error'));

            const handler = didSaveHandler(mockServices);

            expect(() => handler(createEvent())).not.toThrow();

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
        });
    });

    describe('Guard validation integration', () => {
        it('should handle Guard validation errors independently of cfn-lint', async () => {
            mockServices.documentManager.get.returns(createMockDocument());

            // Only Guard validation fails, cfn-lint succeeds
            mockServices.guardService.validateDelayed.rejects(new Error('Guard validation error'));
            mockServices.cfnLintService.lintDelayed.resolves();

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
            // Both should be called despite Guard validation failing
        });

        it('should handle cfn-lint errors independently of Guard validation', async () => {
            mockServices.documentManager.get.returns(createMockDocument());

            // Only cfn-lint fails, Guard validation succeeds
            mockServices.cfnLintService.lintDelayed.rejects(new Error('Linting error'));
            mockServices.guardService.validateDelayed.resolves();

            const handler = didOpenHandler(mockServices);
            handler(createEvent());

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockServices.cfnLintService.lintDelayed.called).toBe(true);
            expect(mockServices.guardService.validateDelayed.called).toBe(true);
            // Both should be called despite cfn-lint failing
        });
    });
});
