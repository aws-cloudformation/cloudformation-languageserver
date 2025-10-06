import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Configurable, ServerComponents } from '../server/ServerComponents';
import { DefaultSettings, EditorSettings, ISettingsSubscriber, SettingsSubscription } from '../settings/Settings';
import { ClientMessage } from '../telemetry/ClientMessage';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Delayer } from '../utils/Delayer';
import { Document } from './Document';
import { DocumentMetadata } from './DocumentProtocol';

export type DetectedIndentation = {
    tabSize: number;
    detectedFromContent: boolean;
};

export class DocumentManager implements Configurable {
    private readonly log = LoggerFactory.getLogger(DocumentManager);
    private readonly delayer = new Delayer(5 * 1000);
    private editorSettings: EditorSettings = DefaultSettings.editor;
    private settingsSubscription?: SettingsSubscription;
    private readonly documentIndentation = new Map<string, DetectedIndentation>();

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
        const textDocument = this.documents.get(uri);
        if (!textDocument) {
            return;
        }
        return new Document(textDocument);
    }

    getByName(name: string) {
        return this.allDocuments().find((doc) => {
            return doc.fileName === name;
        });
    }

    allDocuments() {
        return this.documents.all().map((doc) => {
            return new Document(doc);
        });
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

    /**
     * Get document-specific editor settings with indentation detection
     * @param uri Document URI
     * @returns Editor settings with detected indentation if enabled
     */
    getEditorSettingsForDocument(uri: string): EditorSettings {
        const baseSettings = this.editorSettings;

        if (!baseSettings.detectIndentation) {
            return baseSettings;
        }

        const document = this.get(uri);
        const detectedIndentation = this.getIndentationForDocument(uri, document?.contents() ?? '', baseSettings);

        return {
            ...baseSettings,
            tabSize: detectedIndentation.tabSize,
        };
    }

    /**
     * Clear stored indentation for a document (called when document is closed)
     * @param uri Document URI
     */
    clearIndentationForDocument(uri: string): void {
        this.documentIndentation.delete(uri);
    }

    /**
     * Clear all stored indentation data
     */
    clearAllStoredIndentation(): void {
        this.documentIndentation.clear();
    }

    private onEditorSettingsChanged(newEditorSettings: EditorSettings): void {
        const oldSettings = this.editorSettings;
        this.editorSettings = newEditorSettings;

        // Clear cache if detectIndentation setting changed
        const detectIndentationChanged = oldSettings.detectIndentation !== newEditorSettings.detectIndentation;

        if (detectIndentationChanged) {
            this.clearAllStoredIndentation();

            if (newEditorSettings.detectIndentation) {
                const openDocuments = this.allDocuments();

                for (const document of openDocuments) {
                    this.getIndentationForDocument(document.uri, document.contents(), newEditorSettings);
                }
            }
        }
    }

    /**
     * Get effective indentation for a document
     * @param uri Document URI
     * @param content Document content
     * @param editorSettings Current editor settings
     * @returns Effective indentation settings for the document
     */
    private getIndentationForDocument(
        uri: string,
        content: string,
        editorSettings: EditorSettings,
    ): DetectedIndentation {
        // If detectIndentation is false, use configured settings
        if (!editorSettings.detectIndentation) {
            return {
                tabSize: editorSettings.tabSize,
                detectedFromContent: false,
            };
        }

        const stored = this.documentIndentation.get(uri);
        if (stored) {
            return stored;
        }

        const detected = this.detectIndentationFromContent(content, editorSettings);

        this.documentIndentation.set(uri, detected);

        return detected;
    }

    /**
     * Detect indentation from document content by finding the first indented line
     * @param content Document content to analyze
     * @param fallbackSettings Fallback settings to use if detection fails
     * @returns Detected indentation settings
     */
    private detectIndentationFromContent(content: string, fallbackSettings: EditorSettings): DetectedIndentation {
        const lines = content.split('\n');

        const maxLinesToAnalyze = Math.min(lines.length, 30);

        for (let i = 0; i < maxLinesToAnalyze; i++) {
            const line = lines[i];

            if (line.trim().length === 0) {
                continue;
            }

            const leadingSpaces = line.match(/^( *)/)?.[1]?.length ?? 0;

            if (leadingSpaces > 0) {
                const result: DetectedIndentation = {
                    tabSize: leadingSpaces,
                    detectedFromContent: true,
                };

                return result;
            }
        }

        // If no indented lines found, use fallback settings
        return {
            tabSize: fallbackSettings.tabSize,
            detectedFromContent: false,
        };
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
