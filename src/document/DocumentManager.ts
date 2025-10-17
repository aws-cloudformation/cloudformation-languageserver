import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings, EditorSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { Delayer } from '../utils/Delayer';
import { CloudFormationFileType, Document, DocumentType, Extension } from './Document';
import { DocumentMetadata } from './DocumentProtocol';

export class DocumentManager implements SettingsConfigurable {
    private readonly log = LoggerFactory.getLogger(DocumentManager);

    @Telemetry() private readonly telemetry!: ScopedTelemetry;
    private readonly delayer = new Delayer(5 * 1000);

    private editorSettings: EditorSettings = DefaultSettings.editor;
    private readonly documentMap = new Map<string, Document>();

    private settingsSubscription?: SettingsSubscription;

    constructor(
        private readonly documents: TextDocuments<TextDocument>,
        private readonly sendDocuments: (docs: DocumentMetadata[]) => Promise<void> = () => {
            return Promise.resolve();
        },
    ) {
        this.registerDocumentGauges();
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
        if (!document || !this.editorSettings.detectIndentation) {
            return this.editorSettings;
        }

        return document.processIndentation((detectedTabSize) => {
            return {
                ...this.editorSettings,
                tabSize: detectedTabSize ?? this.editorSettings.tabSize,
            };
        });
    }

    removeDocument(uri: string): void {
        this.documentMap.delete(uri);
    }

    clearAllStoredIndentation(): void {
        for (const document of this.documentMap.values()) {
            document.clearIndentation();
        }
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

    private registerDocumentGauges(): void {
        this.telemetry.registerGaugeProvider('documents.open.total', () => this.documentMap.size, {
            unit: '1',
        });

        for (const type of Object.values(CloudFormationFileType)) {
            this.telemetry.registerGaugeProvider(
                `documents.open.cfn.type.${type}`,
                () => this.countDocumentsByCfnType(type),
                {
                    unit: '1',
                },
            );
        }

        for (const type of Object.values(DocumentType)) {
            this.telemetry.registerGaugeProvider(
                `documents.open.doc.type.${type}`,
                () => this.countDocumentsByDocType(type),
                {
                    unit: '1',
                },
            );
        }

        for (const type of Object.values(Extension)) {
            this.telemetry.registerGaugeProvider(
                `documents.open.extension.type.${type}`,
                () => this.countDocumentsByExtension(type),
                {
                    unit: '1',
                },
            );
        }
    }

    private countDocumentsByCfnType(cfnType: CloudFormationFileType): number {
        return [...this.documentMap.values()].filter((doc) => doc.cfnFileType === cfnType).length;
    }

    private countDocumentsByDocType(docType: DocumentType): number {
        return [...this.documentMap.values()].filter((doc) => doc.documentType === docType).length;
    }

    private countDocumentsByExtension(extension: Extension): number {
        return [...this.documentMap.values()].filter((doc) => doc.extension === extension).length;
    }
}
