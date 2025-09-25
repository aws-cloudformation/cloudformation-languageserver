import { SyntaxNode } from 'tree-sitter';
import { NodeType } from './NodeType';

export type TraversalOptions = {
    maxDepth?: number;
    includeErrorNodes?: boolean;
    stopOnFirstMatch?: boolean;
    shouldContinue?: () => boolean;
};

export type NodePredicate = {
    (node: SyntaxNode): boolean;
};

const MaxDepthDefault = 50;
const IncludeErrorNodesDefault = false;
const StopOnFirstMatchDefault = false;
const ShouldContinueDefault = () => true;

export type ContextBuilder<T> = {
    (node: SyntaxNode, parentContext: T): T;
};

export type ContextualCallback<T> = {
    (node: SyntaxNode, context: T): boolean;
};

export class NodeTraversal {
    public static traverse(
        rootNode: SyntaxNode,
        predicate: NodePredicate,
        options: TraversalOptions = {},
    ): SyntaxNode[] {
        const {
            maxDepth = MaxDepthDefault,
            includeErrorNodes = IncludeErrorNodesDefault,
            stopOnFirstMatch = StopOnFirstMatchDefault,
            shouldContinue = ShouldContinueDefault,
        } = options;
        const results: SyntaxNode[] = [];

        const traverseRecursive = (node: SyntaxNode, depth: number) => {
            if (depth > maxDepth) {
                return;
            }

            if (!shouldContinue()) {
                return;
            }

            if (stopOnFirstMatch && results.length > 0) {
                return;
            }

            // Skip error nodes unless explicitly included
            if (!includeErrorNodes && NodeType.nodeHasError(node)) {
                return;
            }

            if (predicate(node)) {
                results.push(node);
            }

            // Continue traversing children
            for (const child of node.children) {
                traverseRecursive(child, depth + 1);
            }
        };

        traverseRecursive(rootNode, 0);
        return results;
    }

    /**
     * Traverse nodes while building and maintaining context during traversal.
     * This is useful for tracking paths, depths, or other accumulated state.
     *
     * @param rootNode Starting node for traversal
     * @param initialContext Initial context value
     * @param contextBuilder Function that builds child context from parent context
     * @param callback Function called for each node with its context
     * @param options Traversal options
     */
    public static traverseWithContext<T>(
        rootNode: SyntaxNode,
        initialContext: T,
        contextBuilder: ContextBuilder<T>,
        callback: ContextualCallback<T>,
        options: TraversalOptions = {},
    ): void {
        const {
            maxDepth = MaxDepthDefault,
            includeErrorNodes = IncludeErrorNodesDefault,
            shouldContinue = ShouldContinueDefault,
        } = options;

        const traverseRecursive = (node: SyntaxNode, context: T, depth: number): boolean => {
            if (depth > maxDepth) {
                return true;
            }

            if (!shouldContinue()) {
                return false;
            }

            // Skip error nodes unless explicitly included
            if (!includeErrorNodes && NodeType.nodeHasError(node)) {
                return true;
            }

            // Process current node with its context
            if (!callback(node, context)) {
                return false; // Early termination requested
            }

            // Traverse children with their computed contexts
            for (const child of node.namedChildren) {
                const childContext = contextBuilder(child, context);
                if (!traverseRecursive(child, childContext, depth + 1)) {
                    return false; // Early termination from child
                }
            }

            return true; // Continue traversal
        };

        traverseRecursive(rootNode, initialContext, 0);
    }
}
