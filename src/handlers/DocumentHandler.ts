import { Edit, Point } from 'tree-sitter';
import { DidChangeTextDocumentParams } from 'vscode-languageserver';
import { TextDocumentChangeEvent } from 'vscode-languageserver/lib/common/textDocuments';
import { NotificationHandler } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { Document } from '../document/Document';
import { createEdit } from '../document/DocumentUtils';
import { LspDocuments } from '../protocol/LspDocuments';
import { ServerComponents } from '../server/ServerComponents';
import { LintTrigger } from '../services/cfnLint/CfnLintService';
import { ValidationTrigger } from '../services/guard/GuardService';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';

const log = LoggerFactory.getLogger('DocumentHandler');

export function didOpenHandler(components: ServerComponents): (event: TextDocumentChangeEvent<TextDocument>) => void {
    return (event: TextDocumentChangeEvent<TextDocument>): void => {
        const uri = event.document.uri;
        const document = components.documentManager.get(uri);
        if (!document) {
            log.error(`No document found ${uri}`);
            return;
        }

        const content = document.contents();

        if (document.isTemplate()) {
            try {
                components.syntaxTreeManager.addWithTypes(uri, content, document.documentType, document.cfnFileType);
            } catch (error) {
                log.error({ error: extractErrorMessage(error), uri }, 'Error creating tree');
            }
        }

        components.cfnLintService.lintDelayed(content, uri, LintTrigger.OnOpen).catch((reason) => {
            // Handle cancellation gracefully - user might have closed/changed the document
            if (reason instanceof Error && reason.message.includes('Request cancelled')) {
                log.debug(`Linting cancelled for ${uri}: ${reason.message}`);
            } else {
                log.error(`Linting error for ${uri}: ${extractErrorMessage(reason)}`);
            }
        });

        // Trigger Guard validation
        components.guardService.validateDelayed(content, uri, ValidationTrigger.OnOpen).catch((reason) => {
            // Handle cancellation gracefully - user might have closed/changed the document
            if (reason instanceof Error && reason.message.includes('Request cancelled')) {
                log.debug(`Guard validation cancelled for ${uri}: ${reason.message}`);
            } else {
                log.error(`Guard validation error for ${uri}: ${extractErrorMessage(reason)}`);
            }
        });

        components.documentManager.sendDocumentMetadata(0);
    };
}

export function didChangeHandler(
    documents: LspDocuments,
    components: ServerComponents,
): NotificationHandler<DidChangeTextDocumentParams> {
    return (params) => {
        const documentUri = params.textDocument.uri;
        const textDocument = documents.documents.get(documentUri);

        if (!textDocument) {
            log.error(`No document found for file with changes ${documentUri}`);
            return;
        }

        const content = textDocument.getText();
        const changes = params.contentChanges;
        try {
            for (const change of changes) {
                if ('range' in change) {
                    // This is an incremental change with a specific range
                    const start: Point = {
                        row: change.range.start.line,
                        column: change.range.start.character,
                    };
                    const end: Point = {
                        row: change.range.end.line,
                        column: change.range.end.character,
                    };

                    const { edit } = createEdit(content, change.text, start, end);
                    updateSyntaxTree(components.syntaxTreeManager, textDocument, edit);
                }
            }
        } catch (error) {
            log.error({ error: extractErrorMessage(error), uri: documentUri }, 'Error updating tree');
            // Create a new tree if partial updates fail
            components.syntaxTreeManager.add(documentUri, content);
        }

        // Trigger cfn-lint validation
        components.cfnLintService.lintDelayed(content, documentUri, LintTrigger.OnChange, true).catch((reason) => {
            // Handle both getTextDocument and linting errors
            if (reason instanceof Error && reason.message.includes('Request cancelled')) {
                log.debug(`Linting cancelled for ${documentUri}: ${reason.message}`);
            } else {
                log.error(`Error in didChange processing for ${documentUri}: ${extractErrorMessage(reason)}`);
            }
        });

        // Trigger Guard validation
        components.guardService
            .validateDelayed(content, documentUri, ValidationTrigger.OnChange, true)
            .catch((reason) => {
                // Handle both getTextDocument and validation errors
                if (reason instanceof Error && reason.message.includes('Request cancelled')) {
                    log.debug(`Guard validation cancelled for ${documentUri}: ${reason.message}`);
                } else {
                    log.error(`Error in Guard didChange processing for ${documentUri}: ${extractErrorMessage(reason)}`);
                }
            });

        components.documentManager.sendDocumentMetadata();
    };
}

export function didCloseHandler(components: ServerComponents): (event: TextDocumentChangeEvent<TextDocument>) => void {
    return (event: TextDocumentChangeEvent<TextDocument>): void => {
        const documentUri = event.document.uri;

        // Cancel any pending delayed linting for this document
        components.cfnLintService.cancelDelayedLinting(documentUri);

        // Cancel any pending delayed Guard validation for this document
        components.guardService.cancelDelayedValidation(documentUri);

        // Remove document from DocumentManager map
        components.documentManager.removeDocument(documentUri);

        components.syntaxTreeManager.deleteSyntaxTree(documentUri);

        // Clear all diagnostics for this document from all sources
        components.diagnosticCoordinator.clearDiagnosticsForUri(documentUri).catch((reason) => {
            log.error(`Error clearing diagnostics for ${documentUri}: ${extractErrorMessage(reason)}`);
        });

        components.documentManager.sendDocumentMetadata(0);
    };
}

export function didSaveHandler(components: ServerComponents): (event: TextDocumentChangeEvent<TextDocument>) => void {
    return (event: TextDocumentChangeEvent<TextDocument>): void => {
        const documentUri = event.document.uri;
        const documentContent = event.document.getText();

        // Trigger cfn-lint validation
        components.cfnLintService.lintDelayed(documentContent, documentUri, LintTrigger.OnSave).catch((reason) => {
            if (reason instanceof Error && reason.message.includes('Request cancelled')) {
                log.debug(`Linting cancelled for ${documentUri}: ${reason.message}`);
            } else {
                log.error(`Linting error for ${documentUri}: ${extractErrorMessage(reason)}`);
            }
        });

        // Trigger Guard validation
        components.guardService
            .validateDelayed(documentContent, documentUri, ValidationTrigger.OnSave)
            .catch((reason) => {
                if (reason instanceof Error && reason.message.includes('Request cancelled')) {
                    log.debug(`Guard validation cancelled for ${documentUri}: ${reason.message}`);
                } else {
                    log.error(`Guard validation error for ${documentUri}: ${extractErrorMessage(reason)}`);
                }
            });

        components.documentManager.sendDocumentMetadata(0);
    };
}

function updateSyntaxTree(syntaxTreeManager: SyntaxTreeManager, textDocument: TextDocument, edit: Edit) {
    const uri = textDocument.uri;
    const document = new Document(textDocument);
    if (syntaxTreeManager.getSyntaxTree(uri)) {
        syntaxTreeManager.updateWithEdit(uri, document.contents(), edit);
    } else {
        syntaxTreeManager.addWithTypes(uri, document.contents(), document.documentType, document.cfnFileType);
    }
}
