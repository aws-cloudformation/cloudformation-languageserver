import { SyntaxNode } from 'tree-sitter';
import { Range } from 'vscode-languageserver';
import { IntrinsicFunction } from '../../context/ContextType';
import { LiteralValueInfo, LiteralValueType } from './ExtractToParameterTypes';

/**
 * Analyzes CloudFormation template syntax nodes to identify extractable literal values.
 * This enables the extract-to-parameter refactoring by distinguishing between
 * actual literals and existing references/intrinsic functions.
 */
export class LiteralValueDetector {
    public detectLiteralValue(node: SyntaxNode): LiteralValueInfo | undefined {
        if (!node || node.type === 'ERROR') {
            return undefined;
        }

        let nodeForRange = node;
        if (node.type === 'string_content' && node.parent?.type === 'string') {
            nodeForRange = node.parent;
        }

        const isReference = this.isIntrinsicFunctionOrReference(nodeForRange);
        const literalInfo = this.extractLiteralInfo(node);

        if (literalInfo?.value === undefined) {
            return undefined;
        }

        return {
            value: literalInfo.value,
            type: literalInfo.type,
            range: this.nodeToRange(nodeForRange),
            isReference,
        };
    }

    private isIntrinsicFunctionOrReference(node: SyntaxNode): boolean {
        if (!node) {
            return false;
        }

        if (node.type === 'object' && this.isJsonIntrinsicFunction(node)) {
            return true;
        }

        if (node.type === 'flow_node' && node.children?.length > 0) {
            const firstChild = node.children[0];
            if (firstChild?.type === 'tag' && firstChild.text && this.isYamlIntrinsicTag(firstChild.text)) {
                return true;
            }
        }

        let currentNode: SyntaxNode | null = node.parent;
        while (currentNode) {
            if (currentNode.type === 'object' && this.isJsonReferenceFunction(currentNode)) {
                return true;
            }

            if (currentNode.type === 'flow_node' && currentNode.children?.length > 0) {
                const firstChild = currentNode.children[0];
                if (firstChild?.type === 'tag' && firstChild.text && this.isYamlReferenceTag(firstChild.text)) {
                    return true;
                }
            }

            if (currentNode.type === 'block_mapping_pair') {
                const keyNode = currentNode.children?.find(
                    (child) => child.type === 'flow_node' || child.type === 'plain_scalar',
                );
                if (keyNode?.text) {
                    const keyText = keyNode.text;
                    if (
                        this.isReferenceFunctionName(keyText) ||
                        this.isReferenceFunctionName(keyText.replace('Fn::', ''))
                    ) {
                        return true;
                    }
                }
            }

            currentNode = currentNode.parent;
        }

        return false;
    }

    private isJsonIntrinsicFunction(node: SyntaxNode): boolean {
        if (!node?.children) {
            return false;
        }

        const pairs = node.children.filter((child) => child.type === 'pair');
        if (pairs.length !== 1) {
            return false;
        }

        const pair = pairs[0];
        if (!pair?.children || pair.children.length < 2) {
            return false;
        }

        const keyNode = pair.children[0];
        if (keyNode?.type !== 'string' || !keyNode.text) {
            return false;
        }

        const keyText = this.removeQuotes(keyNode.text);
        return this.isIntrinsicFunctionName(keyText);
    }

    private isJsonReferenceFunction(node: SyntaxNode): boolean {
        if (!node?.children) {
            return false;
        }

        const pairs = node.children.filter((child) => child.type === 'pair');
        if (pairs.length !== 1) {
            return false;
        }

        const pair = pairs[0];
        if (!pair?.children || pair.children.length < 2) {
            return false;
        }

        const keyNode = pair.children[0];
        if (keyNode?.type !== 'string' || !keyNode.text) {
            return false;
        }

        const keyText = this.removeQuotes(keyNode.text);
        return this.isReferenceFunctionName(keyText);
    }

    private isYamlIntrinsicTag(tagText: string): boolean {
        return this.isIntrinsicFunctionName(tagText.replace('!', ''));
    }

    private isYamlReferenceTag(tagText: string): boolean {
        return this.isReferenceFunctionName(tagText.replace('!', ''));
    }

    private isIntrinsicFunctionName(name: string): boolean {
        // Check full function names from enum
        if (Object.values(IntrinsicFunction).includes(name as IntrinsicFunction)) {
            return true;
        }

        // Check short forms (YAML allows forms without Fn:: prefix)
        const shortFormName = `Fn::${name}`;
        if (Object.values(IntrinsicFunction).includes(shortFormName as IntrinsicFunction)) {
            return true;
        }

        // Special case: Condition is also treated as an intrinsic function context
        if (name === 'Condition') {
            return true;
        }

        return false;
    }

    private isReferenceFunctionName(name: string): boolean {
        // Only reference-type functions that should block extraction
        // These are functions where the value is already a reference to another resource/parameter
        const referenceFunctions = [
            'Ref',
            'Fn::GetAtt',
            'GetAtt', // YAML allows short forms without Fn:: prefix
            'Condition', // Condition references should also not be extractable
        ];

        return referenceFunctions.includes(name);
    }
    private extractLiteralInfo(
        node: SyntaxNode,
    ): { value: string | number | boolean | unknown[]; type: LiteralValueType } | undefined {
        if (!node?.type || !node.text) {
            return undefined;
        }

        switch (node.type) {
            case 'string': {
                return {
                    value: this.parseStringLiteral(node.text),
                    type: LiteralValueType.STRING,
                };
            }

            case 'string_content': {
                return {
                    value: node.text,
                    type: LiteralValueType.STRING,
                };
            }

            case 'number': {
                const parsed = this.parseNumberLiteral(node.text);
                return Number.isNaN(parsed)
                    ? undefined
                    : {
                          value: parsed,
                          type: LiteralValueType.NUMBER,
                      };
            }

            case 'true': {
                return {
                    value: true,
                    type: LiteralValueType.BOOLEAN,
                };
            }

            case 'false': {
                return {
                    value: false,
                    type: LiteralValueType.BOOLEAN,
                };
            }

            case 'array': {
                return {
                    value: this.parseArrayLiteral(node),
                    type: LiteralValueType.ARRAY,
                };
            }

            case 'block_sequence': {
                return {
                    value: this.parseArrayLiteral(node),
                    type: LiteralValueType.ARRAY,
                };
            }

            case 'plain_scalar': {
                return this.parseYamlScalar(node.text);
            }

            case 'quoted_scalar':
            case 'double_quote_scalar':
            case 'single_quote_scalar': {
                return {
                    value: this.parseStringLiteral(node.text),
                    type: LiteralValueType.STRING,
                };
            }

            case 'flow_sequence': {
                return {
                    value: this.parseArrayLiteral(node),
                    type: LiteralValueType.ARRAY,
                };
            }

            case 'object':
            case 'flow_node':
            case 'string_scalar':
            case 'block_scalar': {
                return {
                    value: node.text,
                    type: LiteralValueType.STRING,
                };
            }

            case 'integer_scalar':
            case 'float_scalar': {
                const parsed = this.parseNumberLiteral(node.text);
                return Number.isNaN(parsed)
                    ? undefined
                    : {
                          value: parsed,
                          type: LiteralValueType.NUMBER,
                      };
            }

            case 'boolean_scalar': {
                return {
                    value: node.text === 'true',
                    type: LiteralValueType.BOOLEAN,
                };
            }

            default: {
                return undefined;
            }
        }
    }

    private parseStringLiteral(text: string): string {
        const unquoted = this.removeQuotes(text);
        return unquoted.replaceAll('\\n', '\n').replaceAll('\\t', '\t').replaceAll('\\"', '"').replaceAll('\\\\', '\\');
    }

    private parseNumberLiteral(text: string): number {
        return Number.parseFloat(text);
    }

    private parseArrayLiteral(node: SyntaxNode): unknown[] {
        if (!node?.children) {
            return [];
        }

        const values: unknown[] = [];

        for (const child of node.children) {
            if (
                child.type === '[' ||
                child.type === ']' ||
                child.type === ',' ||
                child.type === 'flow_sequence_start' ||
                child.type === 'flow_sequence_end' ||
                child.type === 'block_sequence_item'
            ) {
                // For block_sequence_item, extract its value child
                if (child.type === 'block_sequence_item' && child.children) {
                    for (const itemChild of child.children) {
                        if (itemChild.type !== '-') {
                            const childInfo = this.extractLiteralInfo(itemChild);
                            if (childInfo?.value !== null && childInfo?.value !== undefined) {
                                values.push(childInfo.value);
                            }
                        }
                    }
                }
                continue;
            }

            const childInfo = this.extractLiteralInfo(child);
            if (childInfo?.value !== null && childInfo?.value !== undefined) {
                values.push(childInfo.value);
            }
        }

        return values;
    }

    private parseYamlScalar(text: string): { value: string | number | boolean; type: LiteralValueType } | undefined {
        if (!text) {
            return undefined;
        }

        if (
            text === 'true' ||
            text === 'True' ||
            text === 'TRUE' ||
            text === 'yes' ||
            text === 'Yes' ||
            text === 'YES' ||
            text === 'on' ||
            text === 'On' ||
            text === 'ON'
        ) {
            return { value: true, type: LiteralValueType.BOOLEAN };
        }
        if (
            text === 'false' ||
            text === 'False' ||
            text === 'FALSE' ||
            text === 'no' ||
            text === 'No' ||
            text === 'NO' ||
            text === 'off' ||
            text === 'Off' ||
            text === 'OFF'
        ) {
            return { value: false, type: LiteralValueType.BOOLEAN };
        }

        if (/^-?\d+(?:\.\d*)?$/.test(text)) {
            return { value: Number.parseFloat(text), type: LiteralValueType.NUMBER };
        }

        return { value: text, type: LiteralValueType.STRING };
    }

    private removeQuotes(text: string): string {
        if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
            return text.slice(1, -1);
        }
        return text;
    }

    private nodeToRange(node: SyntaxNode): Range {
        return {
            start: {
                line: node.startPosition.row,
                character: node.startPosition.column,
            },
            end: {
                line: node.endPosition.row,
                character: node.endPosition.column,
            },
        };
    }
}
