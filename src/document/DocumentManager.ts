import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ServerComponents } from '../server/ServerComponents';
import { ClientMessage } from '../telemetry/ClientMessage';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Delayer } from '../utils/Delayer';
import { Document } from './Document';
import { DocumentMetadata } from './DocumentProtocol';

export class DocumentManager {
    private readonly log = LoggerFactory.getLogger(DocumentManager);
    private readonly delayer = new Delayer(5 * 1000);

    constructor(
        private readonly documents: TextDocuments<TextDocument>,
        private readonly sendDocuments: (docs: DocumentMetadata[]) => Promise<void> = () => {
            return Promise.resolve();
        },
        private readonly clientMessage?: ClientMessage,
    ) {}

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
