import { TextDocument, Position, Range, DocumentUri } from 'vscode-languageserver-textdocument';
import { TopLevelSection } from '../context/CloudFormationEnums';
import { DefaultSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { DocumentMetadata } from './DocumentProtocol';
import { detectDocumentType, uriToPath } from './DocumentUtils';
import { parseValidYaml } from './YamlParser';

export class Document {
    private readonly log = LoggerFactory.getLogger(Document);
    public readonly extension: string;
    public readonly documentType: DocumentType;
    private _cfnFileType: CloudFormationFileType;
    public readonly fileName: string;
    private tabSize: number;
    private indentationDetected: boolean = false;
    private cachedParsedContent: unknown;

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
        this._cfnFileType = CloudFormationFileType.Unknown;

        this.updateCfnFileType();
        this.tabSize = fallbackTabSize;
        this.processIndentation(detectIndentation, fallbackTabSize);
    }

    public get cfnFileType(): CloudFormationFileType {
        return this._cfnFileType;
    }

    public updateCfnFileType(): void {
        const content = this.textDocument.getText();
        if (!content.trim()) {
            this._cfnFileType = CloudFormationFileType.Empty;
            this.cachedParsedContent = undefined;
            return;
        }

        try {
            this.cachedParsedContent = this.parseContent();
            this._cfnFileType = this.detectCfnFileType();
        } catch {
            // If parsing fails, leave cfnFileType unchanged and clear cache
            this.cachedParsedContent = undefined;
            this.log.debug(
                `Failed to parse document ${this.textDocument.uri}, keeping cfnFileType as ${this._cfnFileType}`,
            );
        }
    }

    private parseContent(): unknown {
        const content = this.textDocument.getText();
        if (this.documentType === DocumentType.JSON) {
            return JSON.parse(content);
        }
        return parseValidYaml(content);
    }

    private detectCfnFileType(): CloudFormationFileType {
        // If languageId is cloudformation, treat as template
        if (this.languageId === 'cloudformation') {
            return CloudFormationFileType.Template;
        }

        if (typeof this.cachedParsedContent === 'string' && this.documentType === DocumentType.YAML) {
            return CloudFormationFileType.Empty;
        }

        if (!this.cachedParsedContent || typeof this.cachedParsedContent !== 'object') {
            return CloudFormationFileType.Other;
        }

        const parsed = this.cachedParsedContent as Record<string, unknown>;

        // Check for GitSync deployment file
        const gitSyncKeys = ['template-file-path', 'templateFilePath', 'templatePath'];
        if (gitSyncKeys.some((key) => Object.prototype.hasOwnProperty.call(parsed, key))) {
            return CloudFormationFileType.GitSyncDeployment;
        }

        // Check for CloudFormation template
        const templateKeys = [
            TopLevelSection.AWSTemplateFormatVersion,
            TopLevelSection.Resources,
            TopLevelSection.Transform,
        ];
        if (templateKeys.some((key) => Object.prototype.hasOwnProperty.call(parsed, key))) {
            return CloudFormationFileType.Template;
        }

        return CloudFormationFileType.Other;
    }

    public getParsedDocumentContent(): unknown {
        if (this.cachedParsedContent !== undefined) {
            return this.cachedParsedContent;
        }

        // Fallback to parsing if cache is empty
        try {
            return this.parseContent();
        } catch {
            return undefined;
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

    public getTabSize(detectIndentation: boolean = true) {
        if (detectIndentation) {
            this.refreshIndentationIfNeeded();
        }
        return this.tabSize;
    }

    private refreshIndentationIfNeeded(): void {
        if (this.indentationDetected) {
            return;
        }

        const detected = this.detectIndentationFromContent();
        if (detected !== undefined) {
            this.tabSize = detected;
            this.indentationDetected = true;
        }
    }

    public processIndentation(detectIndentation: boolean, fallbackTabSize: number) {
        if (!detectIndentation) {
            this.tabSize = fallbackTabSize;
            return;
        }

        const detected = this.detectIndentationFromContent();
        this.tabSize = detected ?? fallbackTabSize;
        this.indentationDetected = detected !== undefined;
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
    Unknown = 'unknown', // Unanalyzed files
    Other = 'other', // For files we know aren't CloudFormation
    Empty = 'empty', // For nearly empty files that we can't determine yet
}
