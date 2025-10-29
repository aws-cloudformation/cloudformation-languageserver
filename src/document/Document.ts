import { TextDocument, Position, Range, DocumentUri } from 'vscode-languageserver-textdocument';
import { DefaultSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { detectCfnFileType } from './CloudFormationDetection';
import { DocumentMetadata } from './DocumentProtocol';
import { detectDocumentType, uriToPath } from './DocumentUtils';

export class Document {
    private readonly log = LoggerFactory.getLogger(Document);
    public readonly extension: string;
    public readonly documentType: DocumentType;
    public readonly cfnFileType: CloudFormationFileType;
    public readonly fileName: string;
    private tabSize: number;

    constructor(
        private readonly textDocument: TextDocument,
        detectIndentation: boolean = true,
        fallbackTabSize: number = DefaultSettings.editor.tabSize,
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
            this.log.error(error, `Failed to detect CloudFormation file type ${this.textDocument.uri}`);
        }
        this.tabSize = fallbackTabSize;
        this.processIndentation(detectIndentation, fallbackTabSize);
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

    public getTabSize() {
        return this.tabSize;
    }

    public processIndentation(detectIndentation: boolean, fallbackTabSize: number) {
        if (!detectIndentation) {
            this.tabSize = fallbackTabSize;
            return;
        }

        const detected = this.detectIndentationFromContent();
        this.tabSize = detected ?? fallbackTabSize;
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

export enum CloudFormationFileType {
    Template = 'template',
    GitSyncDeployment = 'gitsync-deployment',
    Unknown = 'unknown',
}
