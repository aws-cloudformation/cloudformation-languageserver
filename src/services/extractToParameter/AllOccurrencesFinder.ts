import { SyntaxNode } from 'tree-sitter';
import { Range } from 'vscode-languageserver';
import { TopLevelSection } from '../../context/ContextType';
import { SyntaxTreeManager } from '../../context/syntaxtree/SyntaxTreeManager';
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
    private readonly syntaxTreeManager: SyntaxTreeManager;

    constructor(syntaxTreeManager: SyntaxTreeManager) {
        this.literalDetector = new LiteralValueDetector();
        this.syntaxTreeManager = syntaxTreeManager;
    }

    /**
     * Finds all occurrences of the same literal value in the template.
     * Returns ranges for all matching literals that can be safely replaced.
     * Only searches within Resources and Outputs sections as only they
     * can reference parameters.
     */
    findAllOccurrences(
        documentUri: string,
        targetValue: string | number | boolean | unknown[],
        targetType: LiteralValueType,
    ): Range[] {
        const occurrences: Range[] = [];

        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(documentUri);
        if (!syntaxTree) {
            return occurrences;
        }

        const sections = syntaxTree.findTopLevelSections([TopLevelSection.Resources, TopLevelSection.Outputs]);

        for (const sectionNode of sections.values()) {
            this.traverseForMatches(sectionNode, targetValue, targetType, occurrences);
        }

        return occurrences;
    }

    private traverseForMatches(
        node: SyntaxNode,
        targetValue: string | number | boolean | unknown[],
        targetType: LiteralValueType,
        occurrences: Range[],
    ): void {
        const literalInfo = this.literalDetector.detectLiteralValue(node);

        if (literalInfo && this.isMatchingLiteral(literalInfo, targetValue, targetType) && !literalInfo.isReference) {
            occurrences.push(literalInfo.range);
            return; // Don't traverse children to avoid duplicates
        }

        for (const child of node.children) {
            this.traverseForMatches(child, targetValue, targetType, occurrences);
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
}
