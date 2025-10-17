import { TextDocument, Position, Range, DocumentUri } from 'vscode-languageserver-textdocument';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { detectCfnFileType } from './CloudFormationDetection';
import { DocumentMetadata } from './DocumentProtocol';
import { detectDocumentType, uriToPath } from './DocumentUtils';

type Indentation = {
    tabSize: number;
    detectedFromContent: boolean;
};

export class Document {
    private readonly log = LoggerFactory.getLogger(Document);
    public readonly extension: Extension;
    public readonly documentType: DocumentType;
    public readonly cfnFileType: CloudFormationFileType;
    public readonly fileName: string;
    private indentation?: Indentation;

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

    public getLines(): string[] {
        return this.getText().split('\n');
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

    public processIndentation<T>(processor: (indentation: number | undefined) => T): T {
        const detectedTabSize = this.getDetectedIndentation();
        return processor(detectedTabSize);
    }

    private getDetectedIndentation(): number | undefined {
        if (this.indentation?.detectedFromContent) {
            return this.indentation.tabSize;
        }

        const detected = this.detectIndentationFromContent();
        if (detected !== undefined) {
            this.indentation = {
                tabSize: detected,
                detectedFromContent: true,
            };
            return detected;
        }

        return undefined;
    }

    public clearIndentation(): void {
        this.indentation = undefined;
    }

    private detectIndentationFromContent(): number | undefined {
        const content = this.contents();
        const lines = content.split('\n');

        const maxLinesToAnalyze = Math.min(lines.length, 30);

        for (let i = 0; i < maxLinesToAnalyze; i++) {
            const line = lines[i];

            if (line.trim().length === 0) {
                continue;
            }

            const leadingSpaces = line.match(/^( *)/)?.[1]?.length ?? 0;

            if (leadingSpaces > 0) {
                return leadingSpaces;
            }
        }

        return undefined; // No indentation detected
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
