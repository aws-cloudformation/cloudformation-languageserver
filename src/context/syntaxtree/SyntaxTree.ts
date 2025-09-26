import YamlGrammar from '@tree-sitter-grammars/tree-sitter-yaml';
import Parser, { Edit, Point, Query, SyntaxNode, Tree, Language } from 'tree-sitter';
import JsonGrammar from 'tree-sitter-json';
import { Position } from 'vscode-languageserver-textdocument';
import { DocumentType } from '../../document/Document';
import { createEdit } from '../../document/DocumentUtils';
import { TopLevelSection, TopLevelSections, IntrinsicsSet } from '../ContextType';
import { normalizeIntrinsicFunction } from '../semantic/Intrinsics';
import { extractEntityFromNodeTextYaml } from './utils/NodeParse';
import { NodeSearch } from './utils/NodeSearch';
import { NodeStructure } from './utils/NodeStructure';
import { NodeTraversal } from './utils/NodeTraversal';
import { NodeType } from './utils/NodeType';
import { createSyntheticNode } from './utils/SyntheticEntityFactory';
import { CommonNodeTypes, JsonNodeTypes, YamlNodeTypes } from './utils/TreeSitterTypes';

// Optimization to only load the different language grammars once
// Loading native/wasm code is expensive
const JSON_PARSER = new Parser();
JSON_PARSER.setLanguage(JsonGrammar as Language);

const YAML_PARSER = new Parser();
YAML_PARSER.setLanguage(YamlGrammar as Language);

export type PropertyPath = ReadonlyArray<string | number>;
export type PathAndEntity = {
    path: ReadonlyArray<SyntaxNode>; // All nodes from target to root
    propertyPath: PropertyPath; // Path like ["Resources", "MyBucket", "Properties"]
    entityRootNode?: SyntaxNode; // The complete entity definition (e.g., entire resource)
};
const LARGE_NODE_TEXT_LIMIT = 200; // If a node's text is > 200 chars, we are likely not at the most specific node (indicating that it might be invalid)

export abstract class SyntaxTree {
    protected tree: Tree;
    private readonly parser;
    private rawContent: string;
    private _lines: string[] | undefined;

    protected constructor(
        public readonly type: DocumentType,
        content: string,
    ) {
        if (type === DocumentType.YAML) {
            this.parser = YAML_PARSER;
        } else {
            this.parser = JSON_PARSER;
        }
        this.rawContent = content;
        this.tree = this.parser.parse(this.rawContent);
    }

    private get lines(): string[] {
        this._lines ??= this.rawContent.split('\n');
        return this._lines;
    }

    public updateWithEdit(content: string, edit: Edit) {
        this._lines = undefined; // Invalidate cache
        this.rawContent = content; // Update raw content
        this.tree.edit(edit);
        this.tree = this.parser.parse(content, this.tree);
    }

    public update(textToInsert: string, start: Point, end: Point) {
        const { newContent, edit } = createEdit(this.content(), textToInsert, start, end);
        this.updateWithEdit(newContent, edit);
    }

    private query(queryString: string, startPosition?: Point, endPosition?: Point): SyntaxNode[] {
        const query = new Query(this.parser.getLanguage(), queryString);
        const queryResult = query.matches(this.tree.rootNode, {
            startPosition,
            endPosition,
        });

        const resultNodes: SyntaxNode[] = [];
        for (const { captures } of queryResult) {
            for (const capture of captures) {
                resultNodes.push(capture.node);
            }
        }

        return resultNodes;
    }

    public getTextAtPosition(position: Position): string | undefined {
        return this.getNodeAtPosition(position)?.text;
    }

    public getNodeAtPosition(position: Position): SyntaxNode {
        const point: Point = {
            row: position.line,
            column: position.character,
        };

        // Handle positions beyond line content (YAML only)
        if (this.type === DocumentType.YAML) {
            const beyondLineNode = this.handleBeyondLinePosition(point);
            if (beyondLineNode !== undefined) {
                return beyondLineNode;
            }
        }

        // 1. Start with the most specific named node at the position. This is fast.
        let initialNode = this.tree.rootNode.namedDescendantForPosition(point);

        // 2. For YAML documents, check for errors early and try incremental parsing immediately
        // This is more efficient than searching through a broken tree
        const isYAML = this.type === DocumentType.YAML;
        let hasError = this.hasErrorInParentChain(initialNode);

        if (hasError) {
            if (isYAML) {
                const incrementalNode = this.tryIncrementalYamlParsing(position);
                if (incrementalNode) {
                    initialNode = incrementalNode;
                    hasError = this.hasErrorInParentChain(initialNode); // Recalculate after incremental parsing
                }
            } else {
                const incrementalNode = this.tryIncrementalJsonParsing(position);
                if (incrementalNode) {
                    initialNode = incrementalNode;
                    hasError = this.hasErrorInParentChain(initialNode); // Recalculate after incremental parsing
                }
            }
        }

        // 3. validate we're actually at colon/separator position
        // prevents : triggering which has a bad parent path and results in false positive autocompletion
        if (this.type === DocumentType.YAML && NodeType.isPairNode(initialNode, this.type)) {
            const key = initialNode.childForFieldName('key');
            const value = initialNode.childForFieldName('value');
            if (
                key &&
                point.column > key.endPosition.column && // After key - check if we're before value or at colon
                (!value || point.column < value.startPosition.column)
            ) {
                return initialNode;
            }
        }

        // 4. if we are in JSON even if this is YAML we probably have the right node already
        // For scalar types, return immediately as they're already the most specific node
        if (NodeType.isScalarNode(initialNode, this.type) && !hasError) {
            return initialNode;
        }

        // 5. Special handling for YAML: check for whitespace-only lines first
        if (this.type === DocumentType.YAML && !hasError) {
            const currentLine = this.lines[point.row];
            const trimmedLine = currentLine?.trim() || '';

            if (trimmedLine.length === 0) {
                const betterNode = this.findNodeForIndentedPosition(initialNode, point);
                if (betterNode) {
                    return betterNode;
                }
            }
        }

        // 6. Try to find the ideal node immediately: the most specific, valid, small node.
        // This is the best-case scenario and allows for a very fast exit.
        const specificNode = NodeSearch.findMostSpecificNode(
            initialNode,
            point,
            (n) => NodeType.isValidNode(n) && !NodeType.isLargeNode(n, LARGE_NODE_TEXT_LIMIT),
        );
        if (specificNode) {
            return specificNode;
        }

        // 7. If no ideal node was found, the initialNode might be large or invalid.
        // Now, we search for a "better" alternative nearby.
        const betterNode = NodeSearch.findNearbyNode(
            this.tree.rootNode,
            point,
            initialNode,
            // The criteria for a "better" node: valid, small, and an actual improvement.
            (candidate) =>
                NodeType.isValidNode(candidate) &&
                !NodeType.isLargeNode(candidate, LARGE_NODE_TEXT_LIMIT) &&
                candidate.endIndex - candidate.startIndex < initialNode.endIndex - initialNode.startIndex,
        );

        if (betterNode) {
            return betterNode;
        }

        // 8. Fallback: If no better alternative is found, return the original node
        // ONLY if it's valid. A large but valid node is better than nothing.
        if (NodeType.isValidNode(initialNode)) {
            return initialNode;
        }

        // 9. Last Resort: The initial node was invalid, and we found no good alternative.
        // Find any smaller node nearby, even if it's not perfectly valid, as it's
        // better than returning a large, broken node.
        const anySmallerNode = NodeSearch.findNearbyNode(
            this.tree.rootNode,
            point,
            initialNode,
            (candidate) => candidate.endIndex - candidate.startIndex < initialNode.endIndex - initialNode.startIndex,
        );

        return anySmallerNode ?? initialNode; // Return the smaller node, or the original invalid one if all else fails.
    }

    private findNodeForIndentedPosition(node: SyntaxNode, point: Point): SyntaxNode | undefined {
        const findClosestKey = (): SyntaxNode | undefined => {
            // Start from cursor row and work backwards to find first non-whitespace content
            for (let row = point.row; row >= 0; row--) {
                const line = this.lines[row];
                if (line) {
                    // Skip comments - find content before #
                    const commentIndex = line.indexOf('#');
                    const contentLine = commentIndex === -1 ? line : line.slice(0, Math.max(0, commentIndex));
                    const trimmedContent = contentLine.trimEnd();

                    if (trimmedContent.length > 0) {
                        // Found non-empty content
                        const colonIndex = trimmedContent.lastIndexOf(':');
                        const dashIndex = trimmedContent.lastIndexOf('-');

                        // Check if we're after a colon (value position)
                        if (colonIndex !== -1 && colonIndex === trimmedContent.length - 1) {
                            if (row === point.row && point.column > colonIndex) {
                                // Same line after colon - value position, no key needed
                                return undefined;
                            } else if (row < point.row) {
                                // Next line - find the key and check if cursor is indented under it
                                const pairNode = this.tree.rootNode.namedDescendantForPosition({
                                    row,
                                    column: colonIndex,
                                });
                                if (pairNode && NodeType.isNodeType(pairNode, YamlNodeTypes.BLOCK_MAPPING_PAIR)) {
                                    const key = pairNode.childForFieldName('key');
                                    if (key && point.column > key.startPosition.column) {
                                        return key;
                                    }
                                }
                            }
                        }

                        // Check if we're after a dash (array item position)
                        if (dashIndex !== -1 && point.column > dashIndex) {
                            // After dash - array item context, return the dash node so we can create synthetic_key_or_value
                            const dashNode = this.tree.rootNode.namedDescendantForPosition({
                                row,
                                column: dashIndex,
                            });
                            return dashNode;
                        }
                    }
                }
            }

            return undefined;
        };

        if (NodeType.isNodeType(node, YamlNodeTypes.FLOW_MAPPING)) {
            const syntheticKey = createSyntheticNode('', point, point, node);
            syntheticKey.type = CommonNodeTypes.SYNTHETIC_KEY;
            syntheticKey.grammarType = CommonNodeTypes.SYNTHETIC_KEY;
            return syntheticKey;
        }

        let closestKey = findClosestKey();

        if (closestKey) {
            // Check if this is the first indented position under the key (could be key or value)
            // vs a sibling key position
            const isFirstUnderKey = point.column > closestKey.startPosition.column;

            if (isFirstUnderKey) {
                // Make sure we attach synthetic Key if we know the parent value is a
                // BLOCK_NODE
                if (NodeType.isSequenceItemNode(closestKey, this.type)) {
                    const child = closestKey.child(1);
                    if (child) {
                        closestKey = child;
                    }
                } else {
                    const parent = closestKey.parent;
                    if (parent && NodeType.isPairNode(parent, this.type)) {
                        const value = closestKey.parent?.childForFieldName('value');
                        if (value) {
                            closestKey = value;
                        }
                    }
                }
                if (NodeType.isNodeType(closestKey, YamlNodeTypes.BLOCK_NODE)) {
                    // Key already has a block mapping - this is definitely a new key
                    const syntheticKey = createSyntheticNode('', point, point, closestKey.child(0));
                    syntheticKey.type = CommonNodeTypes.SYNTHETIC_KEY;
                    syntheticKey.grammarType = CommonNodeTypes.SYNTHETIC_KEY;
                    return syntheticKey;
                }

                // First position under a key - could be either key or value
                const syntheticKeyOrValue = createSyntheticNode('', point, point, closestKey);
                syntheticKeyOrValue.type = CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE;
                syntheticKeyOrValue.grammarType = CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE;
                return syntheticKeyOrValue;
            }
        }

        // If no closest key found, check if we're at sibling indentation level
        const siblingBlockMapping = this.findBlockMappingForSiblingPosition(point);
        if (siblingBlockMapping) {
            const syntheticKey = createSyntheticNode('', point, point, siblingBlockMapping);
            syntheticKey.type = CommonNodeTypes.SYNTHETIC_KEY;
            syntheticKey.grammarType = CommonNodeTypes.SYNTHETIC_KEY;
            return syntheticKey;
        }

        return undefined;
    }

    private hasErrorInParentChain(node: SyntaxNode): boolean {
        let current: SyntaxNode | null = node;
        while (current) {
            if (NodeType.nodeHasError(current)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    private tryIncrementalYamlParsing(position: Position): SyntaxNode | undefined {
        const currentLine = this.lines[position.line] ?? '';
        const textBeforeCursor = currentLine.slice(0, Math.max(0, position.character));
        const textAfterCursor = currentLine.slice(Math.max(0, position.character));

        // Strategy 1: If typing a key, add colon and space
        if (!textBeforeCursor.includes(':') && textBeforeCursor.trim() && !textAfterCursor.trim()) {
            // Insert colon and space at cursor position
            const modifiedLines = [...this.lines];
            modifiedLines[position.line] = textBeforeCursor + ': ' + textAfterCursor;
            const completedContent = modifiedLines.join('\n');
            const result = this.testIncrementalParsing(completedContent, position);
            if (result) return result;
        }

        return undefined;
    }

    private tryIncrementalJsonParsing(position: Position): SyntaxNode | undefined {
        const currentLine = this.lines[position.line] ?? '';
        const textBeforeCursor = currentLine.slice(0, Math.max(0, position.character));
        const textAfterCursor = currentLine.slice(Math.max(0, position.character));

        // Strategy 1: If typing a key, add colon and space
        if (textBeforeCursor.endsWith(':') && textBeforeCursor.trim() && !textAfterCursor.trim()) {
            // Insert colon and space at cursor position
            const modifiedLines = [...this.lines];
            modifiedLines[position.line] = textBeforeCursor + ' null';
            const completedContent = modifiedLines.join('\n');
            const result = this.testIncrementalParsing(completedContent, position);
            if (result) return result;
        } else if (currentLine.includes('"')) {
            // Strategy 2: Handle any quoted string as potential incomplete key
            // Look for patterns like "text" and convert to "text": null
            const modifiedLines = [...this.lines];
            // Replace quoted strings that aren't followed by : with complete key-value pairs
            modifiedLines[position.line] = currentLine.replace(/"([^"]*)"\s*(?!:)/g, '"$1": null');
            const completedContent = modifiedLines.join('\n');
            const result = this.testIncrementalParsing(completedContent, position);
            if (result) return result;
        }

        return undefined;
    }

    private testIncrementalParsing(completedContent: string, position: Position): SyntaxNode | undefined {
        try {
            // Parse the completed content to create a temporary tree
            const tempTree = this.parser.parse(completedContent);
            const tempNode = tempTree.rootNode.namedDescendantForPosition({
                row: position.line,
                column: position.character,
            });

            // Check if incremental parsing actually fixed the parsing errors
            if (!this.hasErrorInParentChain(tempNode)) {
                return tempNode;
            }
        } catch {
            // Ignore parsing errors and fall back to original approach
        }

        return undefined;
    }

    private handleBeyondLinePosition(point: Point): SyntaxNode | undefined {
        const currentLine = this.lines[point.row];

        if (!currentLine) {
            return undefined; // No line, continue normal processing
        }

        const trimmedLine = currentLine.trimEnd();
        if (trimmedLine.length === 0) {
            return undefined; // Empty line, continue normal processing
        }

        // Check if we're beyond the trimmed content OR exactly at the end
        if (point.column < trimmedLine.length) {
            return undefined; // Not at/beyond trimmed content, continue normal processing
        }

        // Find last non-whitespace character
        const lastCharIndex = trimmedLine.length - 1;
        const lastCharNode = this.tree.rootNode.namedDescendantForPosition({ row: point.row, column: lastCharIndex });

        if (NodeType.isNodeType(lastCharNode, YamlNodeTypes.BLOCK_MAPPING_PAIR)) {
            const syntheticValue = createSyntheticNode('', point, point, lastCharNode);
            syntheticValue.type = CommonNodeTypes.SYNTHETIC_VALUE;
            syntheticValue.grammarType = CommonNodeTypes.SYNTHETIC_VALUE;
            return syntheticValue;
        } else if (NodeType.isNodeType(lastCharNode, YamlNodeTypes.BLOCK_SEQUENCE_ITEM)) {
            const syntheticKeyOrValue = createSyntheticNode('', point, point, lastCharNode);
            syntheticKeyOrValue.type = CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE;
            syntheticKeyOrValue.grammarType = CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE;
            return syntheticKeyOrValue;
        }

        return undefined; // No completions for other node types
    }

    /**
     * Analyzes a node to determine its semantic path within the document.
     * It walks up the tree from the given node, building a property path and identifying the entity root.
     */
    public getPathAndEntityInfo(node: SyntaxNode): PathAndEntity {
        if (!node) {
            return {
                path: [],
                propertyPath: [],
                entityRootNode: undefined,
            };
        }

        // First try the normal tree traversal approach
        const result = this.getPathAndEntityInfoNormal(node);

        // If we got a valid result with a non-empty property path, or it is JSON, return it
        if (result.propertyPath.length > 0 || this.type === DocumentType.JSON) {
            return result;
        }

        // If normal traversal failed (likely due to malformed tree), try position-based fallback
        return this.pathAndEntityYamlFallback(node);
    }

    // Normal tree traversal approach for well-formed documents

    private getPathAndEntityInfoNormal(node: SyntaxNode): PathAndEntity {
        // Build paths from the target node up to the root
        const path: SyntaxNode[] = [];
        const entityPath: SyntaxNode[] = [];
        const propertyPath: (string | number)[] = [];
        let current: SyntaxNode = node;

        // Special case: if we start with a synthetic key, include its empty text in the path
        if (NodeType.isNodeType(node, CommonNodeTypes.SYNTHETIC_KEY)) {
            propertyPath.push(node.text); // This will be an empty string
        }

        // Special case: if we start with a block_mapping_pair, include its key in the path
        if (NodeType.isNodeType(node, YamlNodeTypes.BLOCK_MAPPING_PAIR)) {
            const key = NodeType.extractKeyFromPair(node, this.type);
            if (key) {
                propertyPath.push(key);
            }
            entityPath.push(node);
        }

        while (current) {
            path.push(current);
            const parent = current.parent;
            if (!parent) break;

            // Handle key-value pairs (like "Parameters: {...}")
            if (NodeType.isPairNode(parent, this.type)) {
                // This is a key-value pair. Add the key to our semantic path.
                const key = NodeType.extractKeyFromPair(parent, this.type);
                if (key !== undefined) {
                    propertyPath.push(key);
                }
                entityPath.push(parent);
            } else if (NodeType.isSequenceItemNode(current, this.type)) {
                // Handle YAML array items - calculate index by counting siblings
                let index = 0;
                let sibling = current.previousNamedSibling;
                while (sibling) {
                    index++;
                    sibling = sibling.previousNamedSibling;
                }
                propertyPath.push(index);
                entityPath.push(current);
            } else if (
                this.type === DocumentType.YAML &&
                NodeType.isNodeType(current, YamlNodeTypes.BLOCK_NODE) &&
                current.children?.length > 0 &&
                NodeType.isNodeType(current.children[0], YamlNodeTypes.TAG)
            ) {
                // Handle YAML tags like !If, !Ref, etc.
                const tagNode = current.children[0];
                const tagText = tagNode.text;
                if (tagText) {
                    const normalizedTag = normalizeIntrinsicFunction(tagText);
                    if (IntrinsicsSet.has(normalizedTag)) {
                        propertyPath.push(normalizedTag);
                    }
                }
                entityPath.push(current);
            } else if (NodeType.isNodeType(parent, JsonNodeTypes.ARRAY)) {
                // Handle JSON array items - calculate index by counting non-punctuation siblings
                const index = parent.namedChildren.findIndex((child) => child.id === current?.id);
                if (index !== -1) {
                    propertyPath.push(index);
                    entityPath.push(current);
                }
            } else if (
                NodeType.isNodeType(parent, YamlNodeTypes.FLOW_NODE) &&
                NodeType.isNodeType(current, YamlNodeTypes.DOUBLE_QUOTE_SCALAR)
            ) {
                // Could be incomplete key in nested JSON but need to look to grandparent
                const grandparent = parent.parent;
                if (grandparent && NodeType.isNodeType(grandparent, YamlNodeTypes.FLOW_MAPPING)) {
                    // Is incomplete key pair in an object
                    // { "" }
                    propertyPath.push(current.text.replace(/^,?\s*"|"\s*/g, ''));
                    entityPath.push(current);
                }
            }

            current = parent;
        }

        propertyPath.reverse();
        entityPath.reverse();
        // Find the best entity root node (complete definition without siblings)
        let entityRootNode: SyntaxNode | undefined;

        if (entityPath.length > 0) {
            if (entityPath.length === 1) {
                entityRootNode = entityPath[0];
            } else if (propertyPath.filter((path) => typeof path === 'string').length === 1) {
                entityRootNode = entityPath[0];
            } else {
                entityRootNode = entityPath[1];
            }
        }

        return { path, propertyPath, entityRootNode };
    }

    private pathAndEntityYamlFallback(node: SyntaxNode): PathAndEntity {
        const path: SyntaxNode[] = [node];
        const propertyPath: (string | number)[] = [];
        let entityRootNode: SyntaxNode | undefined;

        // For malformed trees, we need to infer context from the document structure
        const nodePosition = node.startPosition;
        const contextPairs = NodeStructure.findContextPairsForPosition(this.tree.rootNode, nodePosition, this.type);

        // Build property path from the context pairs we found
        for (const pair of contextPairs) {
            const key =
                NodeType.extractKeyFromPair(pair, this.type) ??
                (NodeType.isNodeType(pair, YamlNodeTypes.FLOW_NODE) ? pair.text : undefined);
            if (key) {
                propertyPath.push(key);
            }
        }

        // Add the current node to the property path if it represents a key
        // This ensures the property path includes the key we're currently at
        if (NodeType.isNodeType(node, YamlNodeTypes.FLOW_NODE)) {
            propertyPath.push(node.text);
        }

        // The entity root should be the most specific context that represents a complete entity
        if (contextPairs.length >= 2) {
            entityRootNode = contextPairs[1];

            // For malformed trees, try to find a more complete representation by looking at parent nodes
            if (NodeType.isNodeType(entityRootNode, YamlNodeTypes.FLOW_NODE)) {
                const entityKey = entityRootNode.text;

                // Look for a parent node that contains more content
                let current = entityRootNode.parent;
                let bestCandidate = entityRootNode;

                // Walk up the parent hierarchy looking for nodes that contain the entity key
                // and have more content (indicating a more complete definition)
                while (current) {
                    if (
                        current.text.includes(`${entityKey}:`) &&
                        current.text.length > bestCandidate.text.length &&
                        current.text.length < LARGE_NODE_TEXT_LIMIT
                    ) {
                        // Prefer nodes that don't contain multiple sections, but allow them as fallback
                        if (!NodeType.containsMultipleSections(current)) {
                            bestCandidate = current;
                            break; // Found a perfect candidate, stop searching
                        } else if (bestCandidate.text === entityKey) {
                            // If our current best candidate is just the key, use this even if it has multiple sections
                            bestCandidate = current;
                        }
                    }

                    // Stop if we've reached the root node (avoid infinite loop)
                    if (current === this.tree.rootNode) {
                        break;
                    }
                    current = current.parent;
                }

                entityRootNode = bestCandidate;

                // If the best candidate contains multiple sections or is an ERROR node with our entity key,
                // try to extract just the entity part
                if (
                    (NodeType.containsMultipleSections(entityRootNode) ||
                        NodeType.isNodeType(entityRootNode, CommonNodeTypes.ERROR)) &&
                    entityRootNode.text.includes(`${entityKey}:`)
                ) {
                    const extractedEntity = extractEntityFromNodeTextYaml(entityRootNode, entityKey);
                    if (extractedEntity && extractedEntity !== entityRootNode.text) {
                        entityRootNode = createSyntheticNode(
                            extractedEntity,
                            entityRootNode.startPosition,
                            entityRootNode.endPosition,
                        );
                    }
                }
            }
        } else if (contextPairs.length === 1) {
            entityRootNode = contextPairs[0];
        }

        return { path, propertyPath, entityRootNode };
    }

    /**
     * Finds a node by its CloudFormation path
     * @param pathSegments Array like ["Resources", "MyBucket", "Properties", "BucketName"] or ["Resources", "MyBucket", "Properties", 0]
     * @returns Object with the node and whether the full path was resolved
     */
    getNodeByPath(pathSegments: ReadonlyArray<string | number>): {
        node: SyntaxNode | undefined;
        fullyResolved: boolean;
    } {
        let bestMatch: { node: SyntaxNode; matchedSegments: number } | undefined;

        // Use NodeTraversal with path context to avoid expensive getPathAndEntityInfo calls
        NodeTraversal.traverseWithContext(
            this.tree.rootNode,
            [] as ReadonlyArray<string | number>, // Initial empty path
            (child, parentPath) => this.buildChildPath(child, parentPath), // Path builder
            (node, currentPath) => {
                const matchedSegments = this.countMatchingSegments(currentPath, pathSegments);

                if (matchedSegments > 0 && (!bestMatch || matchedSegments > bestMatch.matchedSegments)) {
                    bestMatch = { node, matchedSegments };

                    // Early termination: if we found a perfect match, stop searching
                    if (matchedSegments === pathSegments.length) {
                        return false; // Stop entire traversal
                    }
                }

                // Continue traversing children (path pruning can be added later for further optimization)
                return true;
            },
            {
                includeErrorNodes: true, // Include error nodes for malformed documents
            },
        );

        if (!bestMatch) {
            return { node: undefined, fullyResolved: false };
        }

        const fullyResolved = bestMatch.matchedSegments === pathSegments.length;
        return { node: bestMatch.node, fullyResolved };
    }

    /**
     * Build the path for a child node based on its parent's path and the child's structural role.
     * This encapsulates the CloudFormation/JSON/YAML path semantics.
     */
    private buildChildPath(
        child: SyntaxNode,
        parentPath: ReadonlyArray<string | number>,
    ): ReadonlyArray<string | number> {
        let newSegment: string | number | undefined;

        // Determine what path segment this child represents
        if (NodeType.isPairNode(child, this.type)) {
            // This is a key-value pair: add the key to path
            newSegment = NodeType.extractKeyFromPair(child, this.type);
        } else if (NodeType.isSequenceItemNode(child, this.type)) {
            // This is an array item: add the index to path
            newSegment = this.getChildIndex(child);
        } else if (
            this.type === DocumentType.YAML &&
            NodeType.isNodeType(child, YamlNodeTypes.BLOCK_NODE) &&
            child.children?.length > 0 &&
            NodeType.isNodeType(child.children[0], YamlNodeTypes.TAG)
        ) {
            // Handle YAML tags like !If, !Ref, etc.
            const tagNode = child.children[0];
            const tagText = tagNode.text;
            if (tagText) {
                const normalizedTag = normalizeIntrinsicFunction(tagText);
                if (IntrinsicsSet.has(normalizedTag)) {
                    newSegment = normalizedTag;
                }
            }
        } else if (
            this.type === DocumentType.JSON &&
            child.parent &&
            NodeType.isNodeType(child.parent, JsonNodeTypes.ARRAY)
        ) {
            // Handle JSON array items - calculate index by counting non-punctuation siblings
            const index = child.parent.namedChildren.findIndex((sibling) => sibling.id === child.id);
            newSegment = Math.max(index, 0);
        }

        // Return extended path or original path
        return newSegment === undefined ? parentPath : [...parentPath, newSegment];
    }

    /**
     * Get the index of a child node within its parent's named children
     */
    private getChildIndex(node: SyntaxNode): number {
        if (!node.parent) return 0;

        let index = 0;
        let sibling = node.previousNamedSibling;
        while (sibling) {
            index++;
            sibling = sibling.previousNamedSibling;
        }
        return index;
    }

    private countMatchingSegments(
        propertyPath: ReadonlyArray<string | number>,
        targetPath: ReadonlyArray<string | number>,
    ): number {
        let matches = 0;
        const minLength = Math.min(propertyPath.length, targetPath.length);

        for (let i = 0; i < minLength; i++) {
            if (propertyPath[i] === targetPath[i]) {
                matches++;
            } else {
                break;
            }
        }

        return matches;
    }

    // Finds CloudFormation sections (Parameters, Resources, etc.)
    abstract findTopLevelSections(sectionsToFind: TopLevelSection[]): Map<TopLevelSection, SyntaxNode>;

    topLevelSections() {
        return [...this.findTopLevelSections(TopLevelSections as TopLevelSection[]).keys()];
    }

    public content() {
        return this.tree.rootNode.text;
    }

    /**
     * Find block_mapping that contains keys at the same indentation level as the cursor
     * Used for creating sibling synthetic keys
     */
    private findBlockMappingForSiblingPosition(point: Point): SyntaxNode | undefined {
        const searchNode = (node: SyntaxNode): SyntaxNode | undefined => {
            if (NodeType.isNodeType(node, YamlNodeTypes.BLOCK_MAPPING)) {
                // Check if this block_mapping has keys at cursor's column
                for (let i = 0; i < node.childCount; i++) {
                    const child = node.child(i);
                    if (child && NodeType.isNodeType(child, YamlNodeTypes.BLOCK_MAPPING_PAIR)) {
                        const key = child.childForFieldName('key');
                        if (key && key.startPosition.column === point.column) {
                            return node;
                        }
                    }
                }
            }
            // Recursively search children
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) {
                    const result = searchNode(child);
                    if (result) return result;
                }
            }
            return undefined;
        };
        return searchNode(this.tree.rootNode);
    }

    public cleanup() {
        // An optimization to clean up unused memory as soon as possible
        // The trees and parsers use up most of the memory in our system
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.tree = undefined;
    }
}
