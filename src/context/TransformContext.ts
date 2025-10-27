import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../document/Document';
import { removeQuotes } from '../utils/String';
import { NodeType } from './syntaxtree/utils/NodeType';
import { FieldNames, YAML_NODE_SETS, JSON_NODE_SETS } from './syntaxtree/utils/TreeSitterTypes';

export class TransformContext {
    private static readonly SAM_TRANSFORM = 'AWS::Serverless-2016-10-31';
    private _hasSamTransform?: boolean;

    constructor(
        private readonly pathToRoot: ReadonlyArray<SyntaxNode>,
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
        // Find the document-level mapping that has both Transform and Resources
        for (let j = 0; j < this.pathToRoot.length; j++) {
            const node = this.pathToRoot[j];

            if (YAML_NODE_SETS.mapping.has(node.type) || JSON_NODE_SETS.object.has(node.type)) {
                // Check if this mapping has both Transform and Resources
                let hasTransform = false;
                let hasResources = false;
                const keys: string[] = [];

                for (let i = 0; i < node.childCount; i++) {
                    const child = node.child(i);
                    if (!child || !NodeType.isPairNode(child, this.documentType)) continue;

                    const keyNode = child.childForFieldName(FieldNames.KEY);
                    if (!keyNode) continue;

                    const keyText = removeQuotes(keyNode.text).trim();
                    keys.push(keyText);
                    if (keyText === 'Transform') hasTransform = true;
                    if (keyText === 'Resources') hasResources = true;
                }

                if (hasTransform && hasResources) {
                    // Check Transform value
                    for (let i = 0; i < node.childCount; i++) {
                        const child = node.child(i);
                        if (!child || !NodeType.isPairNode(child, this.documentType)) continue;

                        const keyNode = child.childForFieldName(FieldNames.KEY);
                        if (!keyNode) continue;

                        const keyText = removeQuotes(keyNode.text).trim();
                        if (keyText === 'Transform') {
                            const transformValue = this.getTransformValue(child);

                            if (
                                transformValue === TransformContext.SAM_TRANSFORM ||
                                (Array.isArray(transformValue) &&
                                    transformValue.includes(TransformContext.SAM_TRANSFORM))
                            ) {
                                return true;
                            }
                        }
                    }
                    break;
                }
            }
        }

        return false;
    }

    private findTopLevelMapping(node: SyntaxNode): SyntaxNode | undefined {
        // For JSON: look for object node
        if (this.documentType === DocumentType.JSON && JSON_NODE_SETS.object.has(node.type)) {
            return node;
        }

        // For YAML: traverse down to find the mapping node
        let current = node;
        while (current && current.childCount > 0) {
            const child = current.child(0);
            if (!child) break;

            if (YAML_NODE_SETS.mapping.has(child.type) || JSON_NODE_SETS.object.has(child.type)) {
                return child;
            }
            current = child;
        }

        return undefined;
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
