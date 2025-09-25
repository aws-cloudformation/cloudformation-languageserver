import { Point, SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../../../document/Document';
import { NodeTraversal } from './NodeTraversal';
import { NodeType } from './NodeType';
import { YamlNodeTypes } from './TreeSitterTypes';

export type PairInfo = {
    node: SyntaxNode;
    key: string;
    indentLevel: number;
};

export class NodeStructure {
    /**
     * Find all key-value pairs in the document with their indentation levels
     * This creates a structural map of the document for context analysis
     */
    public static findAllPairs(rootNode: SyntaxNode, documentType: DocumentType, maxDepth: number = 50): PairInfo[] {
        const allPairs: PairInfo[] = [];
        const seenKeys = new Set<string>(); // Prevent duplicate pairs at same position

        const predicate = (node: SyntaxNode): boolean => {
            // Handle standard pair nodes (e.g., "key: value")
            if (NodeType.isPairNode(node, documentType)) {
                return this.processPairNode(node, documentType, seenKeys, allPairs);
            }

            // Handle YAML-specific implicit pairs that may not be properly parsed
            if (documentType === DocumentType.YAML) {
                return this.processYamlImplicitPair(node, seenKeys, allPairs);
            }

            return false;
        };

        // Traverse the tree including error nodes (required for malformed documents)
        NodeTraversal.traverse(rootNode, predicate, { maxDepth, includeErrorNodes: true });
        return allPairs;
    }

    /**
     * Find the hierarchical context for a specific position in the document
     * Uses indentation and position to determine which pairs are ancestors
     * This is required for malformed documents where tree structure is broken
     */
    public static findContextPairsForPosition(
        rootNode: SyntaxNode,
        position: Point,
        documentType: DocumentType,
        maxDepth: number = 10,
    ): SyntaxNode[] {
        // Get all pairs in the document
        const allPairs = NodeStructure.findAllPairs(rootNode, documentType, maxDepth);
        const contextPairs: SyntaxNode[] = [];

        // Sort pairs by document position (top to bottom, left to right)
        this.sortPairsByPosition(allPairs);

        // Build ancestor chain based on indentation hierarchy
        for (const pair of allPairs) {
            if (this.isPairBeforePosition(pair, position) && this.isPotentialAncestor(pair, position)) {
                // Remove siblings/children that have same or greater indentation
                this.removeSiblingsAndChildren(contextPairs, allPairs, pair.indentLevel);
                contextPairs.push(pair.node);
            }
        }

        return contextPairs;
    }

    private static processPairNode(
        node: SyntaxNode,
        documentType: DocumentType,
        seenKeys: Set<string>,
        allPairs: PairInfo[],
    ): boolean {
        const key = NodeType.extractKeyFromPair(node, documentType);
        if (!key) return false;

        const uniqueKey = `${key}-${node.startPosition.row}-${node.startPosition.column}`;
        if (seenKeys.has(uniqueKey)) return false;

        seenKeys.add(uniqueKey);
        allPairs.push({
            node,
            key,
            indentLevel: node.startPosition.column,
        });

        return true;
    }

    /**
     * Process YAML implicit pairs that might not be properly parsed
     * These are flow_nodes followed by colons that represent keys
     */
    private static processYamlImplicitPair(node: SyntaxNode, seenKeys: Set<string>, allPairs: PairInfo[]): boolean {
        // Look for valid identifier followed by colon
        if (!NodeType.isNodeType(node, YamlNodeTypes.FLOW_NODE)) return false;

        const text = node.text;
        // Match valid YAML key names: letter followed by letters/numbers/underscores
        if (!NodeType.isYamlKey(node)) return false;

        // Check if next sibling is a colon - indicates this flow_node is a key
        const nextSibling = node.nextSibling;
        if (!nextSibling || nextSibling.type !== ':') return false;

        // Create unique identifier and add if not seen before
        const uniqueKey = `${text}-${node.startPosition.row}-${node.startPosition.column}`;
        if (seenKeys.has(uniqueKey)) return false;

        seenKeys.add(uniqueKey);
        allPairs.push({
            node,
            key: text,
            indentLevel: node.startPosition.column,
        });

        return true;
    }

    /**
     * Sort pairs by their position in the document (row first, then column)
     */
    private static sortPairsByPosition(allPairs: PairInfo[]): void {
        allPairs.sort((a, b) => {
            if (a.node.startPosition.row !== b.node.startPosition.row) {
                return a.node.startPosition.row - b.node.startPosition.row;
            }
            return a.node.startPosition.column - b.node.startPosition.column;
        });
    }

    /**
     * Check if a pair comes before the target position in the document
     */
    private static isPairBeforePosition(pair: PairInfo, position: Point): boolean {
        return (
            pair.node.startPosition.row < position.row ||
            (pair.node.startPosition.row === position.row && pair.node.startPosition.column < position.column)
        );
    }

    /**
     * Check if a pair could be an ancestor based on indentation
     * Ancestors must be indented less than the target position
     */
    private static isPotentialAncestor(pair: PairInfo, position: Point): boolean {
        return pair.indentLevel < position.column;
    }

    /**
     * Remove pairs that are siblings or children (same or greater indentation)
     * This maintains the proper ancestor hierarchy
     */
    private static removeSiblingsAndChildren(
        contextPairs: SyntaxNode[],
        allPairs: PairInfo[],
        currentIndentLevel: number,
    ): void {
        while (contextPairs.length > 0) {
            const lastPair = contextPairs[contextPairs.length - 1];
            const lastPairInfo = allPairs.find((p) => p.node === lastPair);
            const lastIndentLevel = lastPairInfo?.indentLevel ?? -1;

            // If last pair has same or greater indentation, it's a sibling/child - remove it
            if (lastIndentLevel >= currentIndentLevel) {
                contextPairs.pop();
            } else {
                break; // Found a proper ancestor, stop removing
            }
        }
    }
}
