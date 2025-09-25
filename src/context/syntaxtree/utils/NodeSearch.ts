import { Point, SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../../../document/Document';
import { NodeType } from './NodeType';
import { CommonNodeTypes, JSON_NODE_SETS, YAML_NODE_SETS } from './TreeSitterTypes';

// Utility class for navigating and searching through syntax trees
// Handles finding specific nodes, traversing trees, and locating elements
export class NodeSearch {
    /**
     * Find an ancestor node by traversing up from the given node until a match is found
     */
    public static findAncestorNode(node: SyntaxNode, predicate: (node: SyntaxNode) => boolean): SyntaxNode | undefined {
        let current: SyntaxNode | null = node;

        while (current) {
            if (predicate(current)) {
                return current;
            }
            current = current.parent;
        }

        return undefined;
    }

    // Finds the main top-level mapping/object in the document, skipping over document-level wrappers like 'stream' or 'document'.
    public static findMainMapping(rootNode: SyntaxNode, documentType: DocumentType): SyntaxNode | undefined {
        if (NodeType.isMappingNode(rootNode, documentType)) {
            return rootNode;
        }

        // Descend into document wrappers to find the first actual mapping.
        const types = documentType === DocumentType.JSON ? JSON_NODE_SETS.object : YAML_NODE_SETS.mapping;
        return rootNode.descendantsOfType([...types])[0];
    }

    // Check if a position falls within a node's boundaries
    public static nodeContainsPoint(node: SyntaxNode, point: Point): boolean {
        const row = point.row;
        const col = point.column;

        // Check if position is within node's start/end boundaries
        return (
            row >= node.startPosition.row &&
            row <= node.endPosition.row &&
            (row !== node.startPosition.row || col >= node.startPosition.column) &&
            (row !== node.endPosition.row || col <= node.endPosition.column)
        );
    }

    // Find the most specific node at a given point that satisfies a condition
    public static findMostSpecificNode(
        node: SyntaxNode,
        point: Point,
        isGoodNode: (node: SyntaxNode) => boolean,
    ): SyntaxNode | undefined {
        if (!NodeSearch.nodeContainsPoint(node, point)) {
            return undefined;
        }

        // Recursively search children first
        for (const child of node.namedChildren) {
            if (NodeSearch.nodeContainsPoint(child, point)) {
                const specificChild = NodeSearch.findMostSpecificNode(child, point, isGoodNode);
                if (specificChild) {
                    return specificChild; // Found a good descendant
                }
            }
        }

        // If no better child is found, check if the current node is "good"
        return isGoodNode(node) ? node : undefined;
    }

    public static findNearbyNode(
        rootNode: SyntaxNode,
        point: Point,
        originalNode: SyntaxNode,
        predicate: (candidate: SyntaxNode) => boolean,
    ): SyntaxNode | undefined {
        // Search backwards first (more likely to be relevant), then forwards.
        const offsets = [-1, -2, -3, 1, 2];

        for (const offset of offsets) {
            const nearbyPoint = {
                row: point.row,
                column: Math.max(0, point.column + offset),
            };

            const nearbyNode = rootNode.namedDescendantForPosition(nearbyPoint);

            if (nearbyNode !== originalNode && predicate(nearbyNode)) {
                return nearbyNode;
            }
        }
        return undefined;
    }

    /**
     * A comprehensive search that examines all mapping pair nodes in the document.
     * This is particularly useful when at the end of the file where the tree structure
     * might not correctly represent the document's logical structure.
     */
    public static findSectionsInAllMappingPairs<T extends string>(
        rootNode: SyntaxNode,
        sectionsSet: ReadonlySet<T>,
        documentType: DocumentType,
        result: Map<T, SyntaxNode>,
    ): void {
        const mainMapping = NodeSearch.findMainMapping(rootNode, documentType);

        const hasErrors = NodeType.nodeHasError(rootNode);

        // Try fast path only if tree is well-formed AND mainMapping has children
        if (!hasErrors && mainMapping) {
            for (const pair of mainMapping.namedChildren) {
                if (NodeType.isPairNode(pair, documentType)) {
                    const key = NodeType.extractKeyFromPair(pair, documentType);
                    if (key && sectionsSet.has(key as T) && !result.has(key as T)) {
                        result.set(key as T, pair);

                        if (result.size >= sectionsSet.size) {
                            break;
                        }
                    }
                }
            }
        } else {
            // Fall back to comprehensive search when tree is incomplete or has errors
            const pairTypes = documentType === DocumentType.JSON ? JSON_NODE_SETS.pair : YAML_NODE_SETS.pair;
            const allPairs = rootNode.descendantsOfType([...pairTypes]);

            for (const pair of allPairs) {
                const key = NodeType.extractKeyFromPair(pair, documentType);
                if (
                    key &&
                    sectionsSet.has(key as T) &&
                    !result.has(key as T) &&
                    !NodeSearch.isNestedInTopLevelSection(pair, mainMapping)
                ) {
                    result.set(key as T, pair);

                    if (result.size >= sectionsSet.size) {
                        break;
                    }
                }
            }
        }
    }

    /**
     * Check if a pair is nested inside a top-level section (like Parameters inside Metadata)
     * Handles ERROR nodes when tree is malformed
     */
    private static isNestedInTopLevelSection(pair: SyntaxNode, mainMapping: SyntaxNode | undefined): boolean {
        if (!mainMapping) {
            return false;
        }

        // When tree is malformed, pairs with ERROR parent are likely top-level
        if (pair.parent && NodeType.isNodeType(pair.parent, CommonNodeTypes.ERROR)) {
            return false;
        }

        return pair.parent !== mainMapping;
    }
}
