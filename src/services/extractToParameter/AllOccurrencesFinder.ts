import { SyntaxNode } from 'tree-sitter';
import { Range } from 'vscode-languageserver';
import { DocumentType } from '../../document/Document';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { LiteralValueInfo, LiteralValueType } from './ExtractToParameterTypes';
import { LiteralValueDetector } from './LiteralValueDetector';

/**
 * Finds all occurrences of a literal value within a CloudFormation template.
 * Used for the "Extract All Occurrences to Parameter" refactoring action.
 * Only finds occurrences within Resources and Outputs sections as only they
 * can reference parameters.
 */
export class AllOccurrencesFinder {
    private readonly log = LoggerFactory.getLogger(AllOccurrencesFinder);
    private readonly literalDetector: LiteralValueDetector;

    constructor() {
        this.literalDetector = new LiteralValueDetector();
    }

    /**
     * Finds all occurrences of the same literal value in the template.
     * Returns ranges for all matching literals that can be safely replaced.
     * Only searches within Resources and Outputs sections as only they
     * can reference parameters.
     */
    findAllOccurrences(
        rootNode: SyntaxNode,
        targetValue: string | number | boolean | unknown[],
        targetType: LiteralValueType,
        documentType: DocumentType,
    ): Range[] {
        const occurrences: Range[] = [];

        const resourcesAndOutputsSections = this.findResourcesAndOutputsSections(rootNode, documentType);

        for (const sectionNode of resourcesAndOutputsSections) {
            this.traverseNode(sectionNode, targetValue, targetType, documentType, occurrences);
        }

        return occurrences;
    }

    private traverseNode(
        node: SyntaxNode,
        targetValue: string | number | boolean | unknown[],
        targetType: LiteralValueType,
        documentType: DocumentType,
        occurrences: Range[],
    ): void {
        const literalInfo = this.literalDetector.detectLiteralValue(node);

        if (literalInfo && this.isMatchingLiteral(literalInfo, targetValue, targetType)) {
            if (literalInfo.isReference) {
                // Skip reference literals
            } else {
                occurrences.push(literalInfo.range);
                // If we found a match, don't traverse children to avoid double-counting
                return;
            }
        }

        for (const child of node.children) {
            this.traverseNode(child, targetValue, targetType, documentType, occurrences);
        }
    }

    private isMatchingLiteral(
        literalInfo: LiteralValueInfo,
        targetValue: string | number | boolean | unknown[],
        targetType: LiteralValueType,
    ): boolean {
        if (literalInfo.type !== targetType) {
            return false;
        }

        switch (targetType) {
            case LiteralValueType.STRING: {
                return literalInfo.value === targetValue;
            }

            case LiteralValueType.NUMBER: {
                return literalInfo.value === targetValue;
            }

            case LiteralValueType.BOOLEAN: {
                return literalInfo.value === targetValue;
            }

            case LiteralValueType.ARRAY: {
                return this.arraysEqual(literalInfo.value as unknown[], targetValue as unknown[]);
            }

            default: {
                return false;
            }
        }
    }

    private arraysEqual(arr1: unknown[], arr2: unknown[]): boolean {
        if (arr1.length !== arr2.length) {
            return false;
        }

        for (const [i, element] of arr1.entries()) {
            if (element !== arr2[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Finds the Resources and Outputs section nodes in the template.
     * Returns an array of section nodes to search within.
     */
    private findResourcesAndOutputsSections(rootNode: SyntaxNode, documentType: DocumentType): SyntaxNode[] {
        const sections: SyntaxNode[] = [];

        this.findSectionsRecursive(rootNode, documentType, sections, 0);

        return sections;
    }

    /**
     * Recursively searches for Resources and Outputs sections in the syntax tree.
     * Limits depth to avoid searching too deep into the tree. Worst case the user
     * can't refactor all possible matches at the same time but they can still do
     * them one at a time.
     */
    private findSectionsRecursive(
        node: SyntaxNode,
        documentType: DocumentType,
        sections: SyntaxNode[],
        depth: number,
    ): void {
        // Limit depth to avoid searching too deep (Resources/Outputs should be at top level)
        // YAML has deeper nesting: stream → document → block_node → block_mapping → block_mapping_pair
        // JSON has shallower nesting: document → object → pair
        const maxDepth = documentType === DocumentType.YAML ? 5 : 3;
        if (depth > maxDepth) {
            return;
        }

        if (documentType === DocumentType.JSON) {
            // JSON: look for pair nodes with key "Resources" or "Outputs"
            if (node.type === 'pair') {
                const keyNode = node.childForFieldName('key');
                if (keyNode) {
                    const keyText = keyNode.text.replaceAll(/^"|"$/g, ''); // Remove quotes
                    if (keyText === 'Resources' || keyText === 'Outputs') {
                        const valueNode = node.childForFieldName('value');
                        if (valueNode) {
                            sections.push(valueNode);
                            return; // Don't search deeper once we found a section
                        }
                    }
                }
            }
        } else {
            // YAML: look for block_mapping_pair nodes with key "Resources" or "Outputs"
            if (node.type === 'block_mapping_pair') {
                const keyNode = node.childForFieldName('key');
                if (keyNode) {
                    const keyText = keyNode.text;
                    if (keyText === 'Resources' || keyText === 'Outputs') {
                        const valueNode = node.childForFieldName('value');
                        if (valueNode) {
                            sections.push(valueNode);
                            return; // Don't search deeper once we found a section
                        }
                    }
                }
            }
        }

        // Recursively search children
        for (const child of node.children) {
            this.findSectionsRecursive(child, documentType, sections, depth + 1);
        }
    }
}
