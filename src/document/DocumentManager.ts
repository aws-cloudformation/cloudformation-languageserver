import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Configurable, ServerComponents } from '../server/ServerComponents';
import { DefaultSettings, EditorSettings, ISettingsSubscriber, SettingsSubscription } from '../settings/Settings';
import { ClientMessage } from '../telemetry/ClientMessage';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Delayer } from '../utils/Delayer';
import { Document } from './Document';
import { DocumentMetadata } from './DocumentProtocol';

export class DocumentManager implements Configurable {
    private readonly log = LoggerFactory.getLogger(DocumentManager);
    private readonly delayer = new Delayer(5 * 1000);
    private editorSettings: EditorSettings = DefaultSettings.editor;
    private settingsSubscription?: SettingsSubscription;
    private readonly documentMap = new Map<string, Document>();

    constructor(
        private readonly documents: TextDocuments<TextDocument>,
        private readonly sendDocuments: (docs: DocumentMetadata[]) => Promise<void> = () => {
            return Promise.resolve();
        },
        private readonly clientMessage?: ClientMessage,
    ) {}

    configure(settingsManager: ISettingsSubscriber): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        this.settingsSubscription = settingsManager.subscribe('editor', (newEditorSettings) => {
            this.onEditorSettingsChanged(newEditorSettings);
        });
    }

    get(uri: string) {
        let document = this.documentMap.get(uri);
        if (document) {
            return document;
        }

        const textDocument = this.documents.get(uri);
        if (!textDocument) {
            return;
        }

        document = new Document(textDocument);
        this.documentMap.set(uri, document);
        return document;
    }

    getByName(name: string) {
        return this.allDocuments().find((doc) => {
            return doc.fileName === name;
        });
    }

    allDocuments() {
        const allDocs: Document[] = [];

        for (const textDoc of this.documents.all()) {
            let document = this.documentMap.get(textDoc.uri);
            if (!document) {
                document = new Document(textDoc);
                this.documentMap.set(textDoc.uri, document);
            }
            allDocs.push(document);
        }

        return allDocs;
    }

    isTemplate(uri: string) {
        return this.get(uri)?.isTemplate() === true;
    }

    getLine(uri: string, lineNumber: number): string | undefined {
        return this.get(uri)?.getLine(lineNumber);
    }

    sendDocumentMetadata(delay?: number) {
        void this.delayer
            .delay(
                'SendDocuments',
                () => {
                    const docs = this.allDocuments().map((doc) => {
                        return doc.metadata();
                    });
                    return this.sendDocuments(docs);
                },
                delay,
            )
            .catch((error) => {
                this.log.debug(error);
            });
    }

    getEditorSettingsForDocument(uri: string): EditorSettings {
        const document = this.get(uri);
        if (!document) {
            return this.editorSettings;
        }

        return document.getEditorSettings(this.editorSettings);
    }

    clearIndentationForDocument(uri: string): void {
        const document = this.documentMap.get(uri);
        if (document) {
            document.clearIndentation();
            this.documentMap.delete(uri);
        }
    }

    clearAllStoredIndentation(): void {
        for (const document of this.documentMap.values()) {
            document.clearIndentation();
        }
        this.documentMap.clear();
    }

    private onEditorSettingsChanged(newEditorSettings: EditorSettings): void {
        const oldSettings = this.editorSettings;
        this.editorSettings = newEditorSettings;

        // Clear cache if detectIndentation setting changed
        const detectIndentationChanged = oldSettings.detectIndentation !== newEditorSettings.detectIndentation;

        if (detectIndentationChanged) {
            this.clearAllStoredIndentation();
        }
    }

    static create(components: ServerComponents) {
        return new DocumentManager(
            components.documents.documents,
            (docs: DocumentMetadata[]) => {
                return components.documents.sendDocumentsMetadata(docs);
            },
            components.clientMessage,
        );
    }
}
