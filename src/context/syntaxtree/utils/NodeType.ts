import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../../../document/Document';
import { removeQuotes } from '../../../utils/String';
import { TopLevelSections } from '../../ContextType';
import { CommonNodeTypes, FieldNames, JSON_NODE_SETS, LARGE_NODE_TYPES, YAML_NODE_SETS } from './TreeSitterTypes';

export class NodeType {
    public static isPairNode(node: SyntaxNode, documentType: DocumentType): boolean {
        const set = documentType === DocumentType.JSON ? JSON_NODE_SETS.pair : YAML_NODE_SETS.pair;
        return set.has(node.type);
    }

    public static isMappingNode(node: SyntaxNode, documentType: DocumentType): boolean {
        const set = documentType === DocumentType.JSON ? JSON_NODE_SETS.object : YAML_NODE_SETS.mapping;
        return set.has(node.type);
    }

    public static extractKeyFromPair(pairNode: SyntaxNode, documentType: DocumentType): string | undefined {
        if (!NodeType.isPairNode(pairNode, documentType)) {
            return undefined;
        }

        const keyNode = pairNode.childForFieldName(FieldNames.KEY);
        if (!keyNode) {
            return undefined;
        }

        // For YAML, scalar keys might not be quoted. For JSON, they always are, removeQuotes handles both cases.
        return removeQuotes(keyNode.text);
    }

    public static isSequenceNode(node: SyntaxNode, documentType: DocumentType): boolean {
        const set = documentType === DocumentType.JSON ? JSON_NODE_SETS.array : YAML_NODE_SETS.sequence;
        return set.has(node.type);
    }

    public static extractValueFromPair(pairNode: SyntaxNode, documentType: DocumentType): SyntaxNode | undefined {
        if (!NodeType.isPairNode(pairNode, documentType)) {
            return undefined;
        }
        return pairNode.childForFieldName(FieldNames.VALUE) ?? undefined;
    }

    public static isNodeType(node: SyntaxNode, ...types: string[]) {
        if (types.length === 1) {
            return node.type === types[0];
        }
        return types.includes(node.type);
    }

    public static isScalarNode(node: SyntaxNode, documentType: DocumentType): boolean {
        const set = documentType === DocumentType.JSON ? JSON_NODE_SETS.scalar : YAML_NODE_SETS.scalar;
        return set.has(node.type);
    }

    public static isNotNodeType(node: SyntaxNode, ...types: string[]) {
        if (types.length === 1) {
            return node.type !== types[0];
        }
        return !types.includes(node.type);
    }

    public static isSequenceItemNode(node: SyntaxNode, documentType: DocumentType): boolean {
        if (documentType === DocumentType.YAML) {
            return YAML_NODE_SETS.sequence_item.has(node.type);
        }
        // JSON does not have a dedicated "item" node type; elements are just standard value nodes.
        return false;
    }

    public static isLargeNode(node: SyntaxNode, byteLimit: number): boolean {
        return LARGE_NODE_TYPES.has(node.type) || node.endIndex - node.startIndex > byteLimit;
    }

    public static isValidNode(node: SyntaxNode): boolean {
        return !node.isError && !node.hasError && !NodeType.containsMultipleSections(node);
    }

    public static containsMultipleSections(node: SyntaxNode): boolean {
        const text = node.text;
        let matchCount = 0;
        for (const section of TopLevelSections) {
            if (text.includes(section)) {
                matchCount++;
                if (matchCount > 1) return true;
            }
        }
        return false;
    }

    public static nodeHasError(node: SyntaxNode) {
        return node.hasError || node.type === (CommonNodeTypes.ERROR as string);
    }

    public static isYamlKey(node: SyntaxNode) {
        return /^[a-zA-Z]\w*$/.test(node.text);
    }

    public static isResourceType(text: string) {
        return /^[A-Za-z0-9]+::[A-Za-z0-9-.]+::[A-Za-z0-9-.]+/.test(text);
    }
}
