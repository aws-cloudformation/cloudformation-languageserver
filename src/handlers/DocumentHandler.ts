import { Point } from 'tree-sitter';
import { DidChangeTextDocumentParams } from 'vscode-languageserver';
import { TextDocumentChangeEvent } from 'vscode-languageserver/lib/common/textDocuments';
import { NotificationHandler } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
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

        if (document.isTemplate() || document.cfnFileType === CloudFormationFileType.Empty) {
            try {
                components.syntaxTreeManager.addWithTypes(uri, content, document.documentType, document.cfnFileType);
            } catch (error) {
                log.error(error, `Error creating tree ${uri}`);
            }
        }

        triggerValidation(components, content, uri, LintTrigger.OnOpen, ValidationTrigger.OnOpen);

        components.documentManager.sendDocumentMetadata();
    };
}

export function didChangeHandler(
    documents: LspDocuments,
    components: ServerComponents,
): NotificationHandler<DidChangeTextDocumentParams> {
    return (params) => {
        const documentUri = params.textDocument.uri;
        const version = params.textDocument.version;
        const textDocument = documents.documents.get(documentUri);

        if (!textDocument) {
            log.error(`No document found for file with changes ${documentUri}`);
            return;
        }

        // This is the document AFTER changes
        const document = new Document(textDocument.uri, () => textDocument);
        const finalContent = document.getText();

        const tree = components.syntaxTreeManager.getSyntaxTree(documentUri);

        // Short-circuit if this is not a template (anymore)
        if (document.cfnFileType === CloudFormationFileType.Other) {
            if (tree) {
                // Clean-up if was but no longer is a template
                components.syntaxTreeManager.deleteSyntaxTree(documentUri);
            }
            components.documentManager.sendDocumentMetadata();
            return;
        }

        if (tree) {
            // This starts as the text BEFORE changes
            let currentContent = tree.content();
            try {
                const changes = params.contentChanges;
                for (const change of changes) {
                    if ('range' in change) {
                        // Incremental change
                        const start: Point = {
                            row: change.range.start.line,
                            column: change.range.start.character,
                        };
                        const end: Point = {
                            row: change.range.end.line,
                            column: change.range.end.character,
                        };
                        const { edit, newContent } = createEdit(currentContent, change.text, start, end);
                        components.syntaxTreeManager.updateWithEdit(documentUri, newContent, edit);
                        currentContent = newContent;
                    } else {
                        // Full document change
                        components.syntaxTreeManager.add(documentUri, change.text);
                        currentContent = change.text;
                    }
                }
            } catch (error) {
                log.error({ error, uri: documentUri, version }, 'Error updating tree - recreating');
                components.syntaxTreeManager.add(documentUri, finalContent);
            }
        } else {
            // If we don't have a tree yet, just parse the final document
            components.syntaxTreeManager.add(documentUri, finalContent);
        }

        triggerValidation(
            components,
            finalContent,
            documentUri,
            LintTrigger.OnChange,
            ValidationTrigger.OnChange,
            true,
        );

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

        triggerValidation(components, documentContent, documentUri, LintTrigger.OnSave, ValidationTrigger.OnSave);

        components.documentManager.sendDocumentMetadata(0);
    };
}

function triggerValidation(
    components: ServerComponents,
    content: string,
    uri: string,
    lintTrigger: LintTrigger,
    validationTrigger: ValidationTrigger,
    debounce?: boolean,
): void {
    components.cfnLintService.lintDelayed(content, uri, lintTrigger, debounce).catch((reason) => {
        if (reason instanceof CancellationError) {
            // Do nothing - cancellation is expected behavior
        } else {
            log.error(reason, `Linting error for ${uri}`);
        }
    });

    components.guardService.validateDelayed(content, uri, validationTrigger, debounce).catch((reason) => {
        if (reason instanceof Error && reason.message.includes('Request cancelled')) {
            // Do nothing
        } else {
            log.error(reason, `Guard validation error for ${uri}`);
        }
    });
}
