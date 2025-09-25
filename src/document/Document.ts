import { TextDocument, Position, Range, DocumentUri } from 'vscode-languageserver-textdocument';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { detectCfnFileType } from './CloudFormationDetection';
import { DocumentMetadata } from './DocumentProtocol';
import { detectDocumentType, uriToPath } from './DocumentUtils';

export class Document {
    private readonly log = LoggerFactory.getLogger(Document);
    public readonly extension: Extension;
    public readonly documentType: DocumentType;
    public readonly cfnFileType: CloudFormationFileType;
    public readonly fileName: string;

    constructor(
        private readonly textDocument: TextDocument,
        public readonly uri: DocumentUri = textDocument.uri,
        public readonly languageId: string = textDocument.languageId,
        public readonly version: number = textDocument.version,
        public readonly lineCount: number = textDocument.lineCount,
    ) {
        const { extension, type } = detectDocumentType(textDocument.uri, textDocument.getText());

        this.extension = extension;
        this.documentType = type;
        this.fileName = uriToPath(uri).base;

        try {
            this.cfnFileType = detectCfnFileType(this.textDocument.getText(), this.documentType);
        } catch (error) {
            this.cfnFileType = CloudFormationFileType.Unknown;
            this.log.error(
                {
                    error: extractErrorMessage(error),
                    uri: this.textDocument.uri,
                },
                'Failed to detect CloudFormation file type',
            );
        }
    }

    public getLine(lineNumber: number): string | undefined {
        return this.getText({
            start: { line: lineNumber, character: 0 },
            end: { line: lineNumber + 1, character: 0 },
        });
    }

    public getText(range?: Range) {
        return this.textDocument.getText(range);
    }

    public positionAt(offset: number) {
        return this.textDocument.positionAt(offset);
    }

    public offsetAt(position: Position) {
        return this.textDocument.offsetAt(position);
    }

    public isTemplate() {
        return this.cfnFileType === CloudFormationFileType.Template;
    }

    public contents() {
        return this.textDocument.getText();
    }

    public metadata(): DocumentMetadata {
        return {
            uri: this.uri,
            fileName: this.fileName,
            ext: this.extension,
            type: this.documentType,
            cfnType: this.cfnFileType,
            languageId: this.languageId,
            version: this.version,
            lineCount: this.lineCount,
        };
    }
}

export enum DocumentType {
    YAML = 'YAML',
    JSON = 'JSON',
}

export enum Extension {
    YAML = 'yaml',
    JSON = 'json',
    YML = 'yml',
    TXT = 'txt',
    CFN = 'cfn',
    TEMPLATE = 'template',
}

export const Extensions = Object.values(Extension);

export enum CloudFormationFileType {
    Template = 'template',
    GitSyncDeployment = 'gitsync-deployment',
    Unknown = 'unknown',
}
