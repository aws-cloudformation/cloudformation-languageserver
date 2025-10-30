import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../document/Document';
import { removeQuotes } from '../utils/String';
import { TopLevelSection } from './ContextType';
import { NodeSearch } from './syntaxtree/utils/NodeSearch';
import { FieldNames, YAML_NODE_SETS, JSON_NODE_SETS } from './syntaxtree/utils/TreeSitterTypes';

export class TransformContext {
    private static readonly SAM_TRANSFORM = 'AWS::Serverless-2016-10-31';
    private _hasSamTransform?: boolean;

    constructor(
        private readonly rootNode: SyntaxNode,
        private readonly documentType: DocumentType,
    ) {}

    public hasSamTransform(): boolean {
        if (this._hasSamTransform !== undefined) {
            return this._hasSamTransform;
        }

        this._hasSamTransform = this.detectSamTransform();
        return this._hasSamTransform;
    }

    private detectSamTransform(): boolean {
        const sectionsSet = new Set([TopLevelSection.Transform]);
        const result = new Map<TopLevelSection, SyntaxNode>();

        NodeSearch.findSectionsInAllMappingPairs(this.rootNode, sectionsSet, this.documentType, result);

        const transformNode = result.get(TopLevelSection.Transform);
        if (!transformNode) return false;

        const valueNode = transformNode.childForFieldName('value');
        if (!valueNode) return false;

        // Handle both string and array values
        const transformValue = this.getTransformValue(transformNode);

        if (Array.isArray(transformValue)) {
            return transformValue.includes(TransformContext.SAM_TRANSFORM);
        } else {
            return transformValue === TransformContext.SAM_TRANSFORM;
        }
    }

    private getTransformValue(node: SyntaxNode): string | string[] | undefined {
        const valueNode = node.childForFieldName(FieldNames.VALUE);
        if (!valueNode) return undefined;

        // Handle array/sequence values
        const isSequence =
            this.documentType === DocumentType.YAML
                ? YAML_NODE_SETS.sequence.has(valueNode.type)
                : JSON_NODE_SETS.array.has(valueNode.type);

        if (isSequence) {
            return this.extractSequenceValues(valueNode);
        }

        // Handle scalar values
        return removeQuotes(valueNode.text).trim();
    }

    private extractSequenceValues(sequenceNode: SyntaxNode): string[] {
        const values: string[] = [];

        for (let i = 0; i < sequenceNode.childCount; i++) {
            const child = sequenceNode.child(i);
            if (!child) continue;

            // For YAML, look for sequence items
            if (this.documentType === DocumentType.YAML && YAML_NODE_SETS.sequence_item.has(child.type)) {
                const itemValue = child.firstChild;
                if (itemValue) {
                    values.push(removeQuotes(itemValue.text).trim());
                }
            }
            // For JSON, skip punctuation and get actual values
            else if (this.documentType === DocumentType.JSON && JSON_NODE_SETS.scalar.has(child.type)) {
                values.push(removeQuotes(child.text).trim());
            }
        }

        return values;
    }
}
