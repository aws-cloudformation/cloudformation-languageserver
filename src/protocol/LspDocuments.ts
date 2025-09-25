import { TextDocumentChangeEvent } from 'vscode-languageserver/lib/common/textDocuments';
import { TextDocuments, Connection } from 'vscode-languageserver/node';
import { DidChangeTextDocumentParams, NotificationHandler } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    DocumentMetadata,
    DocumentPreview,
    SendDocumentPreview,
    SendDocumentsMetadata,
} from '../document/DocumentProtocol';
import { ProxyConnection } from './ProxyConnection';

export class LspDocuments {
    private listening: boolean = false;
    readonly documents: TextDocuments<TextDocument>;
    private readonly proxy: ProxyConnection;

    constructor(private readonly connection: Connection) {
        this.proxy = new ProxyConnection(connection);
        this.documents = new TextDocuments(TextDocument);
    }

    listen() {
        if (!this.listening) {
            this.documents.listen(this.proxy.connection);
            this.listening = true;
        }
    }

    onDidOpen(handler: (event: TextDocumentChangeEvent<TextDocument>) => void) {
        this.documents.onDidOpen(handler);
    }

    /**
     * TODO: This is using the Connection API instead of TextDocuments because, TextDocuments API does NOT return incremental changes.
     * It returns the full document on every change
     * The TextDocumentSyncKind option tells TextDocuments HOW to update the document, it will internally process incremental/full changes
     * But, our SyntaxTree requires partial changes so the update operations only modify a portions of the tree (for speed)
     * @param handler
     */
    onDidChangeContent(handler: NotificationHandler<DidChangeTextDocumentParams>) {
        this.proxy.addHandler('onDidChangeTextDocument', handler);
    }

    onDidClose(handler: (event: TextDocumentChangeEvent<TextDocument>) => void) {
        this.documents.onDidClose(handler);
    }

    onDidSave(handler: (event: TextDocumentChangeEvent<TextDocument>) => void) {
        this.documents.onDidSave(handler);
    }

    sendDocumentsMetadata(docs: DocumentMetadata[]) {
        return this.connection.sendNotification(SendDocumentsMetadata.type, docs);
    }

    sendDocumentPreview(document: DocumentPreview) {
        return this.connection.sendNotification(SendDocumentPreview.type, document);
    }
}
