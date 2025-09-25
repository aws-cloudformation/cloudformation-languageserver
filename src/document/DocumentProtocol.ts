import { MessageDirection, ProtocolNotificationType } from 'vscode-languageserver';
import { CloudFormationFileType, DocumentType, Extension } from './Document';

export type DocumentMetadata = {
    uri: string;
    fileName: string;
    ext: Extension;
    type: DocumentType;
    cfnType: CloudFormationFileType;
    languageId: string;
    version: number;
    lineCount: number;
};

export type DocumentPreview = {
    content: string;
    language: string;
    viewColumn?: number;
    preserveFocus?: boolean;
};

export const SendDocumentsMetadata = Object.freeze({
    method: 'aws/documents/metadata' as const,
    messageDirection: MessageDirection.serverToClient,
    type: new ProtocolNotificationType<DocumentMetadata[], void>('aws/documents/metadata'),
} as const);

export const SendDocumentPreview = Object.freeze({
    method: 'aws/document/preview' as const,
    messageDirection: MessageDirection.serverToClient,
    type: new ProtocolNotificationType<DocumentPreview, void>('aws/document/preview'),
} as const);
