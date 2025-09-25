/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, security/detect-unsafe-regex, unicorn/no-null */
import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../../../document/Document';
import { parseJson } from '../../../document/JsonParser';
import { parseYaml } from '../../../document/YamlParser';
import { removeQuotes } from '../../../utils/String';
import { NodeType } from './NodeType';
import { CommonNodeTypes, FieldNames, YamlNodeTypes } from './TreeSitterTypes';

/**
 * A recursive function that converts a SyntaxNode into a JavaScript object,
 * mirroring the data structure as closely as possible. It is designed to be error-tolerant,
 * silently ignoring syntax errors to produce a clean object of only the valid, parsable data.
 */
export function nodeToObject(node: SyntaxNode | null | undefined, docType: DocumentType): any {
    if (!node) {
        // Base Case: If the node is null or undefined, we've reached the end of a branch
        return undefined;
    }

    // Step 1: Handle YAML-specific structural nodes
    // YAML's grammar has extra wrapper nodes that we need to step through to get to the actual content
    if (docType === DocumentType.YAML) {
        // Un-wrap document/stream nodes to get to the first piece of content.
        if (NodeType.isNodeType(node, CommonNodeTypes.STREAM, CommonNodeTypes.DOCUMENT)) {
            return nodeToObject(node.namedChild(0), docType);
        }

        // Handle tagged nodes (e.g., `!Ref item`) and other wrappers
        if (NodeType.isNodeType(node, YamlNodeTypes.BLOCK_NODE, YamlNodeTypes.FLOW_NODE)) {
            const tagNode = node.namedChildren.find((child) => NodeType.isNodeType(child, YamlNodeTypes.TAG));

            // If a tag is found, process it with its corresponding value
            if (tagNode) {
                const tagName = tagNode.text;

                // The value is the tag's sibling node
                const valueNode = node.namedChildren.find((child) => NodeType.isNotNodeType(child, YamlNodeTypes.TAG));
                const tagValue = valueNode ? nodeToObject(valueNode, docType) : null;
                return { [tagName]: tagValue ?? null };
            }

            // If no tag is found, this is just a wrapper node. Process its content.
            return nodeToObject(node.namedChild(0), docType);
        }

        // Explicitly handle inline objects like `{ key: value }`
        if (NodeType.isNodeType(node, YamlNodeTypes.FLOW_MAPPING)) {
            const obj: Record<string, any> = {};

            for (const pairNode of node.namedChildren) {
                if (NodeType.isNodeType(pairNode, YamlNodeTypes.FLOW_PAIR)) {
                    const keyNode = pairNode.childForFieldName(FieldNames.KEY);
                    const valueNode = pairNode.childForFieldName(FieldNames.VALUE);

                    if (keyNode) {
                        obj[removeQuotes(keyNode.text)] = nodeToObject(valueNode, docType);
                    }
                }
            }
            return obj;
        }

        // Un-wrap sequence items (e.g., the node for `- item`) to get the item itself
        if (NodeType.isNodeType(node, YamlNodeTypes.BLOCK_SEQUENCE_ITEM)) {
            return nodeToObject(node.namedChild(0), docType);
        }
    }

    // --- Step 2: Handle generic composite types (Objects and Arrays) ---
    // Handles JSON objects and standard YAML block-style mappings
    if (NodeType.isMappingNode(node, docType)) {
        const obj: Record<string, any> = {};
        // Iterate over named children, which are guaranteed to be pairs in a valid mapping.
        // This inherently skips syntax noise and most structural errors.
        for (const pairNode of node.namedChildren) {
            if (NodeType.isPairNode(pairNode, docType)) {
                const key = NodeType.extractKeyFromPair(pairNode, docType);
                const valueNode = NodeType.extractValueFromPair(pairNode, docType);

                // Add to object only if the key is valid.
                if (key) {
                    obj[key] = nodeToObject(valueNode, docType);
                }
            }
        }
        return obj;
    }

    // Handles JSON arrays and YAML sequences
    if (NodeType.isSequenceNode(node, docType)) {
        const arr: any[] = [];
        // Iterate named children to get semantic items, ignoring syntax like brackets and commas.
        for (const itemNode of node.namedChildren) {
            const item = nodeToObject(itemNode, docType);
            // Preserve array structure by including null for undefined items
            arr.push(item === undefined ? null : item);
        }
        return arr;
    }

    // --- Step 3: Handle leaf nodes (primitive values) ---
    // If it's not a structure, it must be a scalar like a string, number, boolean, or null.
    return parseValue(node.text, docType);
}

function parseValue(value: any, docType: DocumentType): boolean | number | string | null | undefined {
    const text = removeQuotes(`${value}`);

    // Check for booleans, nulls, undefined
    if (text === 'true') return true;
    if (text === 'false') return false;
    // YAML supports multiple null syntaxes
    if (text === 'null' || (docType === DocumentType.YAML && (text === '~' || text === ''))) return null;
    if (text === 'undefined') return undefined;

    const trimmed = text.trim();
    // Check if it's a valid number.
    if (trimmed && /^-?\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }

    // Default to returning the text content.
    return text;
}

export function parseObject(data: unknown, docType: DocumentType): unknown {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === 'string') {
        return parseValue(data, docType);
    }

    if (Array.isArray(data)) {
        return data.map((item) => parseObject(item, docType));
    }

    if (typeof data === 'object') {
        const normalized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            normalized[key] = parseObject(value, docType);
        }
        return normalized;
    }

    return data;
}

export function parseSyntheticNode(node: SyntaxNode, docType: DocumentType): any {
    if (docType === DocumentType.YAML) {
        return parseYaml(node.text);
    }

    return parseJson(node.text);
}

/**
 * Extract entity definition from YAML text based on indentation structure.
 * This is used as a fallback when the tree structure is malformed.
 */
export function extractEntityFromNodeTextYaml(node: SyntaxNode, entityKey: string): string | undefined {
    const text = node.text;
    const lines = text.split('\n');

    // Find the line that contains the entity key with colon
    let entityStartLine = -1;
    let entityIndent = -1;

    for (const [i, line] of lines.entries()) {
        if (line.trim().startsWith(`${entityKey}:`)) {
            entityStartLine = i;
            entityIndent = line.length - line.trimStart().length;
            break;
        }
    }

    if (entityStartLine === -1) {
        return undefined;
    }

    // Find the end of the entity by looking for the next line with same or less indentation
    let entityEndLine = entityStartLine;
    for (let i = entityStartLine + 1; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty lines
        if (trimmed === '') {
            continue;
        }

        const lineIndent = line.length - line.trimStart().length;

        // If we find a line with same or less indentation, we've reached the end
        if (lineIndent <= entityIndent) {
            break;
        }

        entityEndLine = i;
    }

    // Extract the entity definition
    const entityLines = lines.slice(entityStartLine, entityEndLine + 1);
    return entityLines.join('\n');
}
