import { Edit, Point } from 'tree-sitter';
import { DidChangeTextDocumentParams } from 'vscode-languageserver';
import { TextDocumentChangeEvent } from 'vscode-languageserver/lib/common/textDocuments';
import { NotificationHandler } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { CloudFormationFileType, Document } from '../document/Document';
import { createEdit } from '../document/DocumentUtils';
import { LspDocuments } from '../protocol/LspDocuments';
import { ServerComponents } from '../server/ServerComponents';
import { LintTrigger } from '../services/cfnLint/CfnLintService';
import { ValidationTrigger } from '../services/guard/GuardService';
import { publishValidationDiagnostics } from '../stacks/actions/StackActionOperations';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { CancellationError } from '../utils/Delayer';

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
                log.error(error, `Error creating tree ${uri}`);
            }
        }

        components.cfnLintService.lintDelayed(content, uri, LintTrigger.OnOpen).catch((reason) => {
            // Handle cancellation gracefully - user might have closed/changed the document
            if (reason instanceof CancellationError) {
                // Do nothing - cancellation is expected behavior
            } else {
                log.error(reason, `Linting error for ${uri}`);
            }
        });

        // Trigger Guard validation
        components.guardService.validateDelayed(content, uri, ValidationTrigger.OnOpen).catch((reason) => {
            // Handle cancellation gracefully - user might have closed/changed the document
            if (reason instanceof Error && reason.message.includes('Request cancelled')) {
                // Do nothing
            } else {
                log.error(reason, `Guard validation error for ${uri}`);
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
            let hasFullDocumentChange = false;
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
                } else {
                    hasFullDocumentChange = true;
                }
            }

            if (hasFullDocumentChange) {
                components.syntaxTreeManager.add(documentUri, content);
            }
        } catch (error) {
            log.error(error, `Error updating tree ${documentUri}`);
            // Create a new tree if partial updates fail
            components.syntaxTreeManager.add(documentUri, content);
        }

        // Trigger cfn-lint validation
        components.cfnLintService.lintDelayed(content, documentUri, LintTrigger.OnChange, true).catch((reason) => {
            // Handle both getTextDocument and linting errors
            if (reason instanceof CancellationError) {
                // Do nothing - cancellation is expected behavior
            } else {
                log.error(reason, `Error in didChange processing for ${documentUri}`);
            }
        });

        // Trigger Guard validation
        components.guardService
            .validateDelayed(content, documentUri, ValidationTrigger.OnChange, true)
            .catch((reason) => {
                // Handle both getTextDocument and validation errors
                if (reason instanceof Error && reason.message.includes('Request cancelled')) {
                    // Do nothing
                } else {
                    log.error(reason, `Error in Guard didChange processing for ${documentUri}`);
                }
            });

        // Republish validation diagnostics if available
        const validationDetails = components.validationManager
            .getLastValidationByUri(documentUri)
            ?.getValidationDetails();
        if (validationDetails) {
            void publishValidationDiagnostics(
                documentUri,
                validationDetails,
                components.syntaxTreeManager,
                components.diagnosticCoordinator,
            );
        }

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
            log.error(reason, `Error clearing diagnostics for ${documentUri}`);
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
            if (reason instanceof CancellationError) {
                // Do nothing - cancellation is expected behavior
            } else {
                log.error(reason, `Linting error for ${documentUri}`);
            }
        });

        // Trigger Guard validation
        components.guardService
            .validateDelayed(documentContent, documentUri, ValidationTrigger.OnSave)
            .catch((reason) => {
                if (reason instanceof Error && reason.message.includes('Request cancelled')) {
                    // Do nothing
                } else {
                    log.error(reason, `Guard validation error for ${documentUri}`);
                }
            });

        components.documentManager.sendDocumentMetadata(0);
    };
}

function updateSyntaxTree(syntaxTreeManager: SyntaxTreeManager, textDocument: TextDocument, edit: Edit) {
    const uri = textDocument.uri;
    const document = new Document(textDocument);
    if (syntaxTreeManager.getSyntaxTree(uri)) {
        if (document.cfnFileType === CloudFormationFileType.Other) {
            syntaxTreeManager.deleteSyntaxTree(uri);
        } else {
            syntaxTreeManager.updateWithEdit(uri, document.contents(), edit);
        }
    } else {
        syntaxTreeManager.addWithTypes(uri, document.contents(), document.documentType, document.cfnFileType);
    }
}
