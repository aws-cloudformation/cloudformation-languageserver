import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings, EditorSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { Closeable } from '../utils/Closeable';
import { Delayer } from '../utils/Delayer';
import { byteSize } from '../utils/String';
import { CloudFormationFileType, Document, DocumentType } from './Document';
import { DocumentMetadata } from './DocumentProtocol';

export class DocumentManager implements SettingsConfigurable, Closeable {
    private readonly log = LoggerFactory.getLogger(DocumentManager);

    @Telemetry() private readonly telemetry!: ScopedTelemetry;
    private readonly delayer = new Delayer(5 * 1000);

    private editorSettings: EditorSettings = DefaultSettings.editor;
    private readonly documentMap = new Map<string, Document>();

    private settingsSubscription?: SettingsSubscription;
    private readonly interval: NodeJS.Timeout;

    constructor(
        private readonly documents: TextDocuments<TextDocument>,
        private readonly sendDocuments: (docs: DocumentMetadata[]) => Promise<void> = () => {
            return Promise.resolve();
        },
    ) {
        this.registerDocumentGauges();
        this.interval = setInterval(() => {
            this.emitDocSizeMetrics();
        }, 30 * 1000);
    }

    configure(settingsManager: ISettingsSubscriber): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        this.settingsSubscription = settingsManager.subscribe('editor', (newEditorSettings) => {
            this.onEditorSettingsChanged(newEditorSettings);
        });
    }

    get(uri: string) {
        const textDocument = this.documents.get(uri);
        if (!textDocument) {
            return;
        }

        let document = this.documentMap.get(uri);
        if (document) {
            return document;
        }

        document = new Document(
            uri,
            (u) => this.documents.get(u),
            this.editorSettings.detectIndentation,
            this.editorSettings.tabSize,
        );
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
                document = new Document(
                    textDoc.uri,
                    (u) => this.documents.get(u),
                    this.editorSettings.detectIndentation,
                    this.editorSettings.tabSize,
                );
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
                if (error instanceof Error && error.message.includes('Request cancelled')) {
                    return;
                }
                this.log.error(error, 'Failed to send document metadata');
            });
    }

    getEditorSettingsForDocument(uri: string): EditorSettings {
        const document = this.get(uri);
        if (!document) {
            return this.editorSettings;
        }

        return {
            ...this.editorSettings,
            tabSize: document.getTabSize(this.editorSettings.detectIndentation),
        };
    }

    removeDocument(uri: string): void {
        this.documentMap.delete(uri);
    }

    private onEditorSettingsChanged(newEditorSettings: EditorSettings): void {
        const oldSettings = this.editorSettings;
        this.editorSettings = newEditorSettings;

        // Update indentation for all tracked documents when settings change
        const detectIndentationChanged = oldSettings.detectIndentation !== newEditorSettings.detectIndentation;
        const tabSizeChanged = oldSettings.tabSize !== newEditorSettings.tabSize;

        if (detectIndentationChanged || tabSizeChanged) {
            for (const document of this.documentMap.values()) {
                document.processIndentation(newEditorSettings.detectIndentation, newEditorSettings.tabSize);
            }
        }
    }

    private registerDocumentGauges(): void {
        this.telemetry.registerGaugeProvider('documents.open.total', () => this.documentMap.size);

        for (const type of Object.values(CloudFormationFileType)) {
            this.telemetry.registerGaugeProvider(`documents.open.cfn.type.${type}`, () =>
                this.countDocumentsByCfnType(type),
            );
        }

        for (const type of Object.values(DocumentType)) {
            this.telemetry.registerGaugeProvider(`documents.open.doc.type.${type}`, () =>
                this.countDocumentsByDocType(type),
            );
        }

        for (const ext of ['yaml', 'yml', 'json', 'template', 'cfn', 'txt', '']) {
            this.telemetry.registerGaugeProvider(`documents.open.extension.type.${ext}`, () =>
                this.countDocumentsByExtension(ext),
            );
        }
    }

    private emitDocSizeMetrics() {
        for (const doc of this.documentMap.values()) {
            if (doc.isTemplate()) {
                const content = doc.contents();
                if (content) {
                    this.telemetry.histogram('documents.template.size.bytes', byteSize(content), { unit: 'By' });
                }
            }
        }
    }

    private countDocumentsByCfnType(cfnType: CloudFormationFileType): number {
        return [...this.documentMap.values()].filter((doc) => doc.cfnFileType === cfnType).length;
    }

    private countDocumentsByDocType(docType: DocumentType): number {
        return [...this.documentMap.values()].filter((doc) => doc.documentType === docType).length;
    }

    private countDocumentsByExtension(extension: string): number {
        return [...this.documentMap.values()].filter((doc) => doc.isTemplate() && doc.extension === extension).length;
    }

    clear() {
        this.documentMap.clear();
    }

    close() {
        clearInterval(this.interval);
    }
}
