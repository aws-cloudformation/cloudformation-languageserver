import { Edit, Point } from 'tree-sitter';
import { CloudFormationFileType, DocumentType } from '../../document/Document';
import { detectDocumentType } from '../../document/DocumentUtils';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { Measure } from '../../telemetry/TelemetryDecorator';
import { extractErrorMessage } from '../../utils/Errors';
import { JsonSyntaxTree } from './JsonSyntaxTree';
import { SyntaxTree } from './SyntaxTree';
import { YamlSyntaxTree } from './YamlSyntaxTree';

const logger = LoggerFactory.getLogger('SyntaxTreeManager');

export class SyntaxTreeManager {
    private readonly log = LoggerFactory.getLogger(SyntaxTreeManager);
    private readonly syntaxTrees: Map<string, SyntaxTree>;

    constructor() {
        this.syntaxTrees = new Map<string, SyntaxTree>();
    }

    public add(uri: string, content: string) {
        const { type } = detectDocumentType(uri, content);
        this.addWithTypes(uri, content, type, CloudFormationFileType.Template);
    }

    public addWithTypes(uri: string, content: string, type: DocumentType, cfnFileType: CloudFormationFileType) {
        if (cfnFileType !== CloudFormationFileType.Template) {
            return;
        }

        try {
            this.createTree(uri, content, type, cfnFileType);
        } catch (error) {
            logger.error(`Failed to create tree ${uri} ${type} ${cfnFileType}: ${extractErrorMessage(error)}`);
        }
    }

    @Measure({ name: 'createTree' })
    private createTree(uri: string, content: string, type: DocumentType, cfnFileType: CloudFormationFileType) {
        if (cfnFileType !== CloudFormationFileType.Template) {
            throw new Error('Syntax tree can only be created for CloudFormation templates');
        }

        if (type === DocumentType.YAML) {
            this.createYamlSyntaxTree(uri, content);
        } else {
            this.createJsonSyntaxTree(uri, content);
        }

        this.log.info({ type, cfnFileType }, `Created tree ${uri}`);
    }

    private createJsonSyntaxTree(uri: string, content: string) {
        this.syntaxTrees.set(uri, new JsonSyntaxTree(content));
    }

    private createYamlSyntaxTree(uri: string, content: string) {
        this.syntaxTrees.set(uri, new YamlSyntaxTree(content));
    }

    public getSyntaxTree(uri: string): SyntaxTree | undefined {
        return this.syntaxTrees.get(uri);
    }

    public deleteSyntaxTree(uri: string): boolean {
        this.syntaxTrees.get(uri)?.cleanup();
        return this.syntaxTrees.delete(uri);
    }

    public updateSyntaxTree(uri: string, text: string, startPoint: Point, endPoint: Point): void {
        try {
            this.getSyntaxTree(uri)?.update(text, startPoint, endPoint);
        } catch (error) {
            this.log.error({ error: extractErrorMessage(error), uri }, 'Failed to update tree');
        }
    }

    public updateWithEdit(uri: string, content: string, edit: Edit): void {
        try {
            this.getSyntaxTree(uri)?.updateWithEdit(content, edit);
        } catch (error) {
            this.log.error({ error: extractErrorMessage(error), uri }, 'Failed to update tree');
        }
    }

    public deleteAllTrees() {
        for (const tree of this.syntaxTrees.values()) {
            tree.cleanup();
        }
        this.syntaxTrees.clear();
    }
}
