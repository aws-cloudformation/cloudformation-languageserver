import { SyntaxNode } from 'tree-sitter';
import { Diagnostic, Position, Range, TextEdit } from 'vscode-languageserver';
import { ResourceAttribute, TopLevelSection } from '../context/CloudFormationEnums';
import { ContextManager } from '../context/ContextManager';
import { SyntaxTree } from '../context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { NodeSearch } from '../context/syntaxtree/utils/NodeSearch';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { Document, DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { METADATA_CONTEXT_KEY } from '../schema/MetadataContextSchema';
import { pointToPosition } from '../utils/TypeConverters';

export const MISSING_METADATA_CONTEXT_DIAGNOSTIC_SOURCE = 'cloudformation-metadata-context';
export const MISSING_METADATA_CONTEXT_DIAGNOSTIC_CODE = 'MISSING_METADATA_CONTEXT';

const missingContextDiagnosticCodes = new Set([
    MISSING_METADATA_CONTEXT_DIAGNOSTIC_CODE,
    'MISSING_CONTEXT',
    'METADATA_CONTEXT_MISSING',
]);

const templateContextSkeleton = {
    arch: '',
};

const resourceContextSkeleton = {
    why: '',
    must: [] as string[],
    mutable: 'review-required',
};

type MetadataContextTarget =
    | { scope: 'template' }
    | {
          scope: 'resource';
          logicalId: string;
      };

export class MetadataContextQuickFix {
    constructor(
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly documentManager: DocumentManager,
        private readonly contextManager: ContextManager,
    ) {}

    static isMissingContextDiagnostic(diagnostic: Diagnostic): boolean {
        const normalizedCode = String(diagnostic.code ?? '')
            .trim()
            .toUpperCase()
            .replaceAll(/[-.\s]+/g, '_');
        if (missingContextDiagnosticCodes.has(normalizedCode)) {
            return true;
        }

        return /(?:missing|required).*(?:com\.aws\.cloudformation\.Context|Metadata[.\s]Context)|(?:com\.aws\.cloudformation\.Context|Metadata[.\s]Context).*(?:missing|required)/i.test(
            diagnostic.message,
        );
    }

    createTextEdit(uri: string, diagnostic: Diagnostic): TextEdit | undefined {
        const document = this.documentManager.get(uri);
        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(uri);
        if (!document || !syntaxTree) {
            return undefined;
        }

        const target = this.resolveTarget(uri, diagnostic);
        if (!target) {
            return undefined;
        }

        const targetPath =
            target.scope === 'resource' ? [TopLevelSection.Resources, target.logicalId] : ([] as ReadonlyArray<string>);
        const metadataPath = [...targetPath, ResourceAttribute.Metadata];
        const contextPath = [...metadataPath, METADATA_CONTEXT_KEY];
        const existingContext = syntaxTree.getNodeByPath(contextPath);
        if (existingContext.fullyResolved) {
            return undefined;
        }

        const skeleton = target.scope === 'resource' ? resourceContextSkeleton : templateContextSkeleton;
        const metadataResult = syntaxTree.getNodeByPath(metadataPath);
        if (metadataResult.fullyResolved && metadataResult.node) {
            return this.insertIntoPairValue(metadataResult.node, METADATA_CONTEXT_KEY, skeleton, document);
        }

        const targetMapping = this.getTargetMapping(syntaxTree, targetPath, document.documentType);
        if (!targetMapping) {
            return undefined;
        }

        return this.insertIntoMapping(
            targetMapping,
            ResourceAttribute.Metadata,
            { [METADATA_CONTEXT_KEY]: skeleton },
            document,
        );
    }

    private resolveTarget(uri: string, diagnostic: Diagnostic): MetadataContextTarget | undefined {
        const diagnosticData = this.getDiagnosticData(diagnostic);
        if (diagnosticData?.scope === 'template') {
            return { scope: 'template' };
        }
        if (diagnosticData?.scope === 'resource' && diagnosticData.logicalId) {
            return { scope: 'resource', logicalId: diagnosticData.logicalId };
        }
        if (diagnosticData?.logicalId) {
            return { scope: 'resource', logicalId: diagnosticData.logicalId };
        }

        const context = this.contextManager.getContext({
            textDocument: { uri },
            position: diagnostic.range.start,
        });
        if (context?.section === TopLevelSection.Resources && context.logicalId) {
            return { scope: 'resource', logicalId: context.logicalId };
        }

        return { scope: 'template' };
    }

    private getDiagnosticData(
        diagnostic: Diagnostic,
    ): { scope?: 'template' | 'resource'; logicalId?: string } | undefined {
        if (!diagnostic.data || typeof diagnostic.data !== 'object' || Array.isArray(diagnostic.data)) {
            return undefined;
        }

        const data = diagnostic.data as Record<string, unknown>;
        const scope = data.scope === 'template' || data.scope === 'resource' ? data.scope : undefined;
        const logicalId = typeof data.logicalId === 'string' ? data.logicalId : undefined;
        return { scope, logicalId };
    }

    private getTargetMapping(
        syntaxTree: SyntaxTree,
        targetPath: ReadonlyArray<string>,
        documentType: DocumentType,
    ): SyntaxNode | undefined {
        if (targetPath.length === 0) {
            return NodeSearch.findMainMapping(syntaxTree.getRootNode(), documentType);
        }

        const targetResult = syntaxTree.getNodeByPath(targetPath);
        if (!targetResult.fullyResolved || !targetResult.node) {
            return undefined;
        }

        return this.getPairMappingValue(targetResult.node, documentType);
    }

    private insertIntoPairValue(
        pairNode: SyntaxNode,
        propertyName: string,
        propertyValue: unknown,
        document: Document,
    ): TextEdit | undefined {
        if (!NodeType.isPairNode(pairNode, document.documentType)) {
            return undefined;
        }

        const mappingNode = this.getPairMappingValue(pairNode, document.documentType);
        if (mappingNode) {
            return this.insertIntoMapping(mappingNode, propertyName, propertyValue, document);
        }

        if (document.documentType !== DocumentType.YAML) {
            return undefined;
        }

        const indentation = ' '.repeat(pairNode.startPosition.column + document.getTabSize());
        const newText = `\n${this.formatYamlProperty(propertyName, propertyValue, indentation, document.getTabSize())}`;
        const position = pointToPosition(pairNode.endPosition);
        return TextEdit.insert(position, newText);
    }

    private getPairMappingValue(pairNode: SyntaxNode, documentType: DocumentType): SyntaxNode | undefined {
        if (!NodeType.isPairNode(pairNode, documentType)) {
            return undefined;
        }

        const valueNode = NodeType.extractValueFromPair(pairNode, documentType);
        if (!valueNode) {
            return undefined;
        }
        if (NodeType.isMappingNode(valueNode, documentType)) {
            return valueNode;
        }

        return valueNode.descendantsOfType(
            documentType === DocumentType.JSON ? ['object'] : ['block_mapping', 'flow_mapping'],
        )[0];
    }

    private insertIntoMapping(
        mappingNode: SyntaxNode,
        propertyName: string,
        propertyValue: unknown,
        document: Document,
    ): TextEdit | undefined {
        if (!NodeType.isMappingNode(mappingNode, document.documentType)) {
            return undefined;
        }

        const isYamlBlockMapping = document.documentType === DocumentType.YAML && mappingNode.type === 'block_mapping';
        if (isYamlBlockMapping) {
            return this.insertIntoYamlBlockMapping(mappingNode, propertyName, propertyValue, document);
        }

        return this.insertIntoBraceMapping(mappingNode, propertyName, propertyValue, document);
    }

    private insertIntoYamlBlockMapping(
        mappingNode: SyntaxNode,
        propertyName: string,
        propertyValue: unknown,
        document: Document,
    ): TextEdit | undefined {
        const firstPair = mappingNode.namedChildren.find((child) => NodeType.isPairNode(child, document.documentType));
        if (!firstPair) {
            return undefined;
        }

        const indentation = ' '.repeat(firstPair.startPosition.column);
        const newText = `${this.formatYamlProperty(propertyName, propertyValue, indentation, document.getTabSize())}\n`;
        const position = Position.create(firstPair.startPosition.row, 0);
        return TextEdit.insert(position, newText);
    }

    private formatYamlProperty(
        propertyName: string,
        propertyValue: unknown,
        indentation: string,
        tabSize: number,
    ): string {
        const indentUnit = ' '.repeat(tabSize);
        const lines = [`${indentation}${propertyName}:`];
        this.appendYamlValue(lines, propertyValue, indentation + indentUnit, indentUnit);
        return lines.join('\n');
    }

    private appendYamlValue(lines: string[], value: unknown, indentation: string, indentUnit: string): void {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            lines[lines.length - 1] += ` ${this.toYamlScalar(value)}`;
            return;
        }

        for (const [key, nestedValue] of Object.entries(value)) {
            lines.push(`${indentation}${key}:`);
            this.appendYamlValue(lines, nestedValue, indentation + indentUnit, indentUnit);
        }
    }

    private toYamlScalar(value: unknown): string {
        if (value === '') {
            return '""';
        }
        if (Array.isArray(value)) {
            return value.length === 0 ? '[]' : JSON.stringify(value);
        }
        return String(value);
    }

    private insertIntoBraceMapping(
        mappingNode: SyntaxNode,
        propertyName: string,
        propertyValue: unknown,
        document: Document,
    ): TextEdit | undefined {
        const openingBraceIndex = mappingNode.text.indexOf('{');
        if (openingBraceIndex === -1) {
            return undefined;
        }

        const insertionOffset = mappingNode.startIndex + openingBraceIndex + 1;
        const insertionPosition = document.positionAt(insertionOffset);
        const pairs = mappingNode.namedChildren.filter((child) => NodeType.isPairNode(child, document.documentType));
        const hasExistingProperties = pairs.length > 0;
        const parentIndentLength =
            mappingNode.endPosition.row > mappingNode.startPosition.row
                ? Math.max(0, mappingNode.endPosition.column - 1)
                : Math.max(0, mappingNode.startPosition.column);
        const parentIndentation = ' '.repeat(parentIndentLength);
        const childIndentation = hasExistingProperties
            ? ' '.repeat(
                  pairs[0].startPosition.row > mappingNode.startPosition.row
                      ? pairs[0].startPosition.column
                      : parentIndentLength + document.getTabSize(),
              )
            : parentIndentation + ' '.repeat(document.getTabSize());
        const propertyText = this.formatJsonProperty(
            propertyName,
            propertyValue,
            childIndentation,
            document.getTabSize(),
        );
        const nextCharacter = document.contents()[insertionOffset];
        const suffix = hasExistingProperties
            ? nextCharacter === '\n'
                ? ','
                : `,\n${childIndentation}`
            : `\n${parentIndentation}`;
        const newText = `\n${propertyText}${suffix}`;
        const range = Range.create(insertionPosition, insertionPosition);
        return TextEdit.replace(range, newText);
    }

    private formatJsonProperty(
        propertyName: string,
        propertyValue: unknown,
        indentation: string,
        tabSize: number,
    ): string {
        const indentUnit = ' '.repeat(tabSize);
        const serializedLines = JSON.stringify({ [propertyName]: propertyValue }, undefined, tabSize)
            .split('\n')
            .slice(1, -1);

        return serializedLines
            .map((line) => `${indentation}${line.startsWith(indentUnit) ? line.slice(indentUnit.length) : line}`)
            .join('\n');
    }
}
