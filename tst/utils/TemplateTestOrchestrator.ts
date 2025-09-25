/* eslint-disable security/detect-non-literal-regexp, unicorn/prefer-string-slice */
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol/lib/common/protocol';
import { ContextManager } from '../../src/context/ContextManager';
import { TopLevelSections, TopLevelSectionsWithLogicalIds } from '../../src/context/ContextType';
import { Condition, Mapping, Metadata, Transform } from '../../src/context/semantic/Entity';
import { EntityType } from '../../src/context/semantic/SemanticTypes';
import { SyntaxTree } from '../../src/context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../../src/context/syntaxtree/SyntaxTreeManager';
import { parseJson } from '../../src/document/JsonParser';
import { parseYaml } from '../../src/document/YamlParser';
import { removeQuotes } from '../../src/utils/String';
import { createMockClientMessage } from './MockServerComponents';
import { docPosition, Templates } from './TemplateUtils';

export type ContextAnalysisResult = {
    section: string;
    logicalId: string;
    numPositions: number;
    valid: number;
    numVerifiedPositions: number;
    noContext: number;
    topLevelErrors: number;
    logicalIdErrors: number;
    entityMismatchErrors: number;
    failingPositions: [number, number][];
};

export class TemplateTestOrchestrator {
    public readonly logger = createMockClientMessage();
    private readonly syntaxTreeManager = new SyntaxTreeManager(this.logger);
    public readonly contextManager = new ContextManager(this.syntaxTreeManager);

    public fileName: string;
    public contents: string;
    public tree: SyntaxTree;
    public template: any;

    public readonly entityPositions: Map<string, Map<string, TextDocumentPositionParams[]>> = new Map();

    constructor(props: typeof Templates.simple.json) {
        this.fileName = props.fileName;
        this.contents = props.contents;

        this.syntaxTreeManager.add(this.fileName, this.contents);
        this.tree = this.syntaxTreeManager.getSyntaxTree(this.fileName)!;
        this.template = this.fileName.endsWith('json') ? parseJson(this.contents) : parseYaml(this.contents);

        this.generateAllEntityPositions();
    }

    public getEntityPositions(section: string, logicalId: string): TextDocumentPositionParams[] {
        return this.entityPositions.get(section)?.get(logicalId) ?? [];
    }

    public testEntityContextResolution(section: string, logicalId: string): ContextAnalysisResult {
        const positions = this.getEntityPositions(section, logicalId);

        if (positions.length === 0) {
            throw new Error(`No positions found for entity ${logicalId} in ${section} section`);
        }

        const expectedEntity = this.template[section]?.[logicalId];
        if (!expectedEntity) {
            throw new Error(`Entity ${logicalId} not found in template ${section} section`);
        }

        let noContext = 0;
        let topLevelErrors = 0;
        let logicalIdErrors = 0;
        let entityMismatchErrors = 0;
        let numVerifiedPositions = 0;
        let valid = 0;
        const failingPositions = new Set<string>();

        for (const position of positions) {
            numVerifiedPositions++;
            const context = this.contextManager.getContext(position);

            if (!context) {
                noContext++;
                failingPositions.add(tupleString([position.position.line, position.position.character]));
            }

            if (`${context?.section}` !== section) {
                topLevelErrors++;
                failingPositions.add(tupleString([position.position.line, position.position.character]));
            }

            if (context?.logicalId !== logicalId) {
                logicalIdErrors++;
                failingPositions.add(tupleString([position.position.line, position.position.character]));
            }

            if (context?.logicalId === undefined || context.entity.entityType === EntityType.Unknown) {
                entityMismatchErrors++;
                failingPositions.add(tupleString([position.position.line, position.position.character]));
                continue;
            }

            let record;
            if (
                context?.entity instanceof Metadata ||
                context?.entity instanceof Transform ||
                context?.entity instanceof Mapping ||
                context?.entity instanceof Condition
            ) {
                record = context?.entity.value;
            } else {
                record = context?.entity.record();
            }
            // Normalize both entities for comparison
            const normalizedExpected = this.normalizeEntity(expectedEntity);
            const normalizedActual = this.normalizeEntity(record);

            if (this.hasAllExpectedKeys(normalizedExpected, normalizedActual)) {
                valid++;
            } else {
                entityMismatchErrors++;
                failingPositions.add(tupleString([position.position.line, position.position.character]));
            }
        }

        return {
            section,
            logicalId,
            numPositions: positions.length,
            valid,
            numVerifiedPositions,
            noContext,
            topLevelErrors,
            logicalIdErrors,
            entityMismatchErrors,
            failingPositions: positionsToSet(failingPositions),
        };
    }

    public cleanup() {
        this.syntaxTreeManager.deleteAllTrees();
    }

    private findEntityBounds(
        section: string,
        logicalId: string,
        lines: string[],
    ): {
        startLine: number;
        endLine: number;
    } | null {
        if (this.fileName.toLowerCase().includes('.json')) {
            return this.findEntityBoundsJson(section, logicalId, lines);
        } else {
            return this.findEntityBoundsYaml(section, logicalId, lines);
        }
    }

    private findEntityBoundsJson(
        section: string,
        logicalId: string,
        lines: string[],
    ): {
        startLine: number;
        endLine: number;
    } | null {
        const fullText = lines.join('\n');

        // Find the CloudFormation section (e.g., "Resources": {)
        const sectionPattern = new RegExp(`"${section}"\\s*:\\s*{`, 'i');
        const sectionMatch = fullText.match(sectionPattern);
        if (!sectionMatch) {
            return null;
        }

        // Search for the logical ID within the section
        const sectionStartIndex = sectionMatch.index!;
        const logicalIdPattern = new RegExp(`"${logicalId}"\\s*:\\s*{`, 'g');
        logicalIdPattern.lastIndex = sectionStartIndex; // Start search after section

        const match = logicalIdPattern.exec(fullText);
        let entityStartIndex = -1;

        if (match && match.index > sectionStartIndex) {
            entityStartIndex = match.index;
        } else {
            return null;
        }

        // Find matching closing brace by counting nested braces
        let braceCount = 0;
        let entityEndIndex = entityStartIndex;
        let foundOpenBrace = false;

        for (let i = entityStartIndex; i < fullText.length; i++) {
            const char = fullText[i];
            if (char === '{') {
                if (!foundOpenBrace) {
                    foundOpenBrace = true; // Mark first opening brace
                }
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (foundOpenBrace && braceCount === 0) {
                    entityEndIndex = i; // Found matching closing brace
                    break;
                }
            }
        }

        // Convert character indices to line numbers
        const entityStartLine = fullText.substring(0, entityStartIndex).split('\n').length - 1;
        const entityEndLine = fullText.substring(0, entityEndIndex).split('\n').length - 1;

        return { startLine: entityStartLine, endLine: entityEndLine };
    }

    private findEntityBoundsYaml(
        section: string,
        logicalId: string,
        lines: string[],
    ): {
        startLine: number;
        endLine: number;
    } | null {
        let sectionFound = false;
        let entityStartLine = -1;
        let entityEndLine = -1;
        let currentIndentLevel = -1;
        let entityIndentLevel = -1;

        for (const [i, line] of lines.entries()) {
            const trimmedLine = line.trim();

            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }

            const indentLevel = this.getIndentLevel(line);

            // Phase 1: Look for the TOP-LEVEL CloudFormation section
            if (!sectionFound) {
                if (this.isLineMatchingKey(trimmedLine, section) && indentLevel === 0) {
                    // Only match sections at the root level (indent 0)
                    sectionFound = true;
                    currentIndentLevel = indentLevel; // Remember section indent level
                }
                continue;
            }

            // Phase 2: Look for the logical ID within the section
            if (entityStartLine === -1) {
                // Check if we've moved to a different top-level section
                if (indentLevel <= currentIndentLevel && this.isTopLevelSection(trimmedLine)) {
                    break; // Left the section without finding entity
                }

                if (this.isLineMatchingKey(trimmedLine, logicalId)) {
                    entityStartLine = i;
                    entityIndentLevel = indentLevel; // Remember entity indent level
                }
                continue;
            }

            // Phase 3: Find where the entity ends
            // End conditions:
            // 1. Same or lower indent level with a new key (not starting with -)
            // 2. Moving to a different top-level section
            if (indentLevel <= entityIndentLevel && trimmedLine.includes(':') && !trimmedLine.startsWith('-')) {
                entityEndLine = i - 1; // Entity ends before this line
                break;
            }

            // Also check if we've moved to a different top-level section
            if (indentLevel <= currentIndentLevel && this.isTopLevelSection(trimmedLine)) {
                entityEndLine = i - 1; // Entity ends before this line
                break;
            }
        }

        // Handle case where entity goes to end of file
        if (entityStartLine !== -1 && entityEndLine === -1) {
            entityEndLine = lines.length - 1;
        }

        // Trim trailing empty lines and comments
        if (entityStartLine !== -1) {
            while (entityEndLine > entityStartLine) {
                const line = lines[entityEndLine];
                if (!line.trim() || line.trim().startsWith('#')) {
                    entityEndLine--;
                } else {
                    break;
                }
            }
        }

        if (entityStartLine === -1) {
            return null;
        }

        return { startLine: entityStartLine, endLine: entityEndLine };
    }

    private generateLinePositions(line: string, lineIndex: number): TextDocumentPositionParams[] {
        const positionSet = new Set<number>();

        // Add position at start of line (column 0)
        positionSet.add(0);

        // Add position at start of meaningful content (skip leading whitespace)
        const firstNonWhitespace = line.search(/\S/);
        if (firstNonWhitespace !== -1) {
            positionSet.add(firstNonWhitespace);

            // Add positions around the first non-whitespace character
            if (firstNonWhitespace > 0) {
                positionSet.add(firstNonWhitespace - 1); // Just before first content
            }
            if (firstNonWhitespace + 1 < line.length) {
                positionSet.add(firstNonWhitespace + 1); // Just after first content
            }
        }

        // Add positions for key-value separators (colons) with surrounding context
        let colonIndex = line.indexOf(':');
        while (colonIndex !== -1) {
            // Add positions around the colon
            if (colonIndex > 0) {
                positionSet.add(colonIndex - 1); // Before colon
            }
            positionSet.add(colonIndex); // Position of the colon
            if (colonIndex + 1 < line.length) {
                positionSet.add(colonIndex + 1); // After colon
            }
            if (colonIndex + 2 < line.length) {
                positionSet.add(colonIndex + 2); // Two positions after colon
            }

            // Find the next non-whitespace after colon (start of value)
            const valueStart = line.substring(colonIndex + 1).search(/\S/);
            if (valueStart !== -1) {
                const valuePos = colonIndex + 1 + valueStart;
                positionSet.add(valuePos);
                if (valuePos > 0) {
                    positionSet.add(valuePos - 1); // Just before value
                }
                if (valuePos + 1 < line.length) {
                    positionSet.add(valuePos + 1); // Just after value start
                }
            }

            colonIndex = line.indexOf(':', colonIndex + 1); // Find next colon
        }

        // Add positions for YAML array indicators (dashes) with context
        let dashIndex = line.indexOf('-');
        while (dashIndex !== -1) {
            const beforeDash = line.substring(0, dashIndex).trim();
            // Only if dash is at start of meaningful content (YAML array indicator)
            if (!beforeDash) {
                if (dashIndex > 0) {
                    positionSet.add(dashIndex - 1); // Before dash
                }
                positionSet.add(dashIndex); // Position of the dash
                if (dashIndex + 1 < line.length) {
                    positionSet.add(dashIndex + 1); // After dash
                }
                if (dashIndex + 2 < line.length) {
                    positionSet.add(dashIndex + 2); // Two positions after dash
                }

                // Find the next non-whitespace after dash (start of array item)
                const itemStart = line.substring(dashIndex + 1).search(/\S/);
                if (itemStart !== -1) {
                    const itemPos = dashIndex + 1 + itemStart;
                    positionSet.add(itemPos);
                    if (itemPos + 1 < line.length) {
                        positionSet.add(itemPos + 1); // Just after item start
                    }
                }
            }
            dashIndex = line.indexOf('-', dashIndex + 1); // Find next dash
        }

        // Add positions for quotes with surrounding context
        this.addQuotePositionsWithContext(line, positionSet, '"'); // Double quotes
        this.addQuotePositionsWithContext(line, positionSet, "'"); // Single quotes

        // Add positions for brackets/braces with surrounding context
        this.addBracketPositionsWithContext(line, positionSet, '[', ']'); // Square brackets
        this.addBracketPositionsWithContext(line, positionSet, '{', '}'); // Curly braces
        this.addBracketPositionsWithContext(line, positionSet, '(', ')'); // Parentheses

        // Add positions for commas (separators in JSON/YAML)
        let commaIndex = line.indexOf(',');
        while (commaIndex !== -1) {
            if (commaIndex > 0) {
                positionSet.add(commaIndex - 1); // Before comma
            }
            positionSet.add(commaIndex); // Position of comma
            if (commaIndex + 1 < line.length) {
                positionSet.add(commaIndex + 1); // After comma
            }

            // Find next non-whitespace after comma
            const nextItemStart = line.substring(commaIndex + 1).search(/\S/);
            if (nextItemStart !== -1) {
                const nextItemPos = commaIndex + 1 + nextItemStart;
                positionSet.add(nextItemPos);
            }

            commaIndex = line.indexOf(',', commaIndex + 1);
        }

        // Add positions for equals signs (in some YAML contexts)
        let equalsIndex = line.indexOf('=');
        while (equalsIndex !== -1) {
            if (equalsIndex > 0) {
                positionSet.add(equalsIndex - 1); // Before equals
            }
            positionSet.add(equalsIndex); // Position of equals
            if (equalsIndex + 1 < line.length) {
                positionSet.add(equalsIndex + 1); // After equals
            }
            equalsIndex = line.indexOf('=', equalsIndex + 1);
        }

        // Add positions for pipe symbols (YAML multiline strings)
        let pipeIndex = line.indexOf('|');
        while (pipeIndex !== -1) {
            if (pipeIndex > 0) {
                positionSet.add(pipeIndex - 1); // Before pipe
            }
            positionSet.add(pipeIndex); // Position of pipe
            if (pipeIndex + 1 < line.length) {
                positionSet.add(pipeIndex + 1); // After pipe
            }
            pipeIndex = line.indexOf('|', pipeIndex + 1);
        }

        // Add positions for greater-than symbols (YAML folded strings)
        let gtIndex = line.indexOf('>');
        while (gtIndex !== -1) {
            if (gtIndex > 0) {
                positionSet.add(gtIndex - 1); // Before >
            }
            positionSet.add(gtIndex); // Position of >
            if (gtIndex + 1 < line.length) {
                positionSet.add(gtIndex + 1); // After >
            }
            gtIndex = line.indexOf('>', gtIndex + 1);
        }

        // Add positions for exclamation marks (YAML tags like !Ref, !Sub)
        let exclamationIndex = line.indexOf('!');
        while (exclamationIndex !== -1) {
            if (exclamationIndex > 0) {
                positionSet.add(exclamationIndex - 1); // Before !
            }
            positionSet.add(exclamationIndex); // Position of !
            if (exclamationIndex + 1 < line.length) {
                positionSet.add(exclamationIndex + 1); // After !
            }

            // Find the end of the tag name (space, colon, or bracket)
            const tagEnd = line.substring(exclamationIndex + 1).search(/[\s:[\]{}]/);
            if (tagEnd !== -1) {
                const tagEndPos = exclamationIndex + 1 + tagEnd;
                positionSet.add(tagEndPos);
                if (tagEndPos + 1 < line.length) {
                    positionSet.add(tagEndPos + 1); // After tag name
                }
            }

            exclamationIndex = line.indexOf('!', exclamationIndex + 1);
        }

        // Add positions at word boundaries (for better context detection)
        const words = line.match(/\b\w+\b/g);
        if (words) {
            let searchStart = 0;
            for (const word of words) {
                const wordIndex = line.indexOf(word, searchStart);
                if (wordIndex !== -1) {
                    // Add positions around word boundaries
                    if (wordIndex > 0) {
                        positionSet.add(wordIndex - 1); // Before word
                    }
                    positionSet.add(wordIndex); // Start of word
                    positionSet.add(wordIndex + word.length - 1); // End of word
                    if (wordIndex + word.length < line.length) {
                        positionSet.add(wordIndex + word.length); // After word
                    }
                    searchStart = wordIndex + word.length;
                }
            }
        }

        // Add positions at regular intervals for dense coverage
        const lineLength = line.length;
        if (lineLength > 10) {
            // Add positions every 3-5 characters for comprehensive coverage
            for (let i = 2; i < lineLength; i += 3) {
                positionSet.add(i);
            }
            for (let i = 4; i < lineLength; i += 5) {
                positionSet.add(i);
            }
        }

        // Add position at end of meaningful content
        const lastNonWhitespace = line.search(/\s*$/);
        if (lastNonWhitespace > 0) {
            positionSet.add(lastNonWhitespace);
            if (lastNonWhitespace > 1) {
                positionSet.add(lastNonWhitespace - 1); // Before end of content
            }
        }

        // Add position past the end of the line (for boundary testing)
        positionSet.add(line.length);
        if (line.length > 0) {
            positionSet.add(line.length - 1); // Last character position
        }

        // Convert set to sorted array and create TextDocumentPositionParams
        const sortedPositions = [...positionSet].sort((a, b) => a - b);
        return sortedPositions.map((pos) => docPosition(this.fileName, lineIndex, pos));
    }

    private addQuotePositionsWithContext(line: string, positionSet: Set<number>, quote: string): void {
        let quoteIndex = line.indexOf(quote);
        while (quoteIndex !== -1) {
            // Add positions around each quote character
            if (quoteIndex > 0) {
                positionSet.add(quoteIndex - 1); // Before quote
            }
            positionSet.add(quoteIndex); // Position of quote
            if (quoteIndex + 1 < line.length) {
                positionSet.add(quoteIndex + 1); // After quote
            }

            // Try to find the matching closing quote
            const nextQuoteIndex = line.indexOf(quote, quoteIndex + 1);
            if (nextQuoteIndex === -1) {
                quoteIndex = line.indexOf(quote, quoteIndex + 1); // Find next quote
            } else {
                // Add positions around the closing quote
                if (nextQuoteIndex > 0) {
                    positionSet.add(nextQuoteIndex - 1); // Before closing quote
                }
                positionSet.add(nextQuoteIndex); // Position of closing quote
                if (nextQuoteIndex + 1 < line.length) {
                    positionSet.add(nextQuoteIndex + 1); // After closing quote
                }
                quoteIndex = nextQuoteIndex + 1; // Continue search after closing quote
            }
        }
    }

    private addBracketPositionsWithContext(line: string, positionSet: Set<number>, open: string, close: string): void {
        // Add positions for opening brackets/braces with context
        let openIndex = line.indexOf(open);
        while (openIndex !== -1) {
            if (openIndex > 0) {
                positionSet.add(openIndex - 1); // Before opening bracket
            }
            positionSet.add(openIndex); // Position of opening bracket
            if (openIndex + 1 < line.length) {
                positionSet.add(openIndex + 1); // After opening bracket
            }

            // Find next non-whitespace after opening bracket
            const contentStart = line.substring(openIndex + 1).search(/\S/);
            if (contentStart !== -1) {
                const contentPos = openIndex + 1 + contentStart;
                positionSet.add(contentPos);
            }

            openIndex = line.indexOf(open, openIndex + 1);
        }

        // Add positions for closing brackets/braces with context
        let closeIndex = line.indexOf(close);
        while (closeIndex !== -1) {
            if (closeIndex > 0) {
                positionSet.add(closeIndex - 1); // Before closing bracket
            }
            positionSet.add(closeIndex); // Position of closing bracket
            if (closeIndex + 1 < line.length) {
                positionSet.add(closeIndex + 1); // After closing bracket
            }
            closeIndex = line.indexOf(close, closeIndex + 1);
        }
    }

    private getIndentLevel(line: string): number {
        let indent = 0;
        for (const char of line) {
            if (char === ' ') {
                indent++; // Count spaces
            } else if (char === '\t') {
                indent += 4; // Treat tab as 4 spaces
            } else {
                break; // Stop at first non-whitespace character
            }
        }
        return indent;
    }

    private isLineMatchingKey(line: string, key: string): boolean {
        const cleanLine = removeQuotes(line).trim();

        // Check YAML format: "key:" or "key: value"
        if (cleanLine === `${key}:` || cleanLine.startsWith(`${key}:`)) {
            return true;
        }

        // Check JSON format: "key": or 'key':
        return (
            cleanLine === `${key}":` ||
            cleanLine === `${key}':` ||
            cleanLine.startsWith(`${key}":`) ||
            cleanLine.startsWith(`${key}':`)
        );
    }

    private isTopLevelSection(line: string): boolean {
        return TopLevelSections.some((section) => this.isLineMatchingKey(line, section));
    }

    private generateAllEntityPositions(): void {
        if (!this.template || typeof this.template !== 'object') {
            return;
        }

        for (const section of TopLevelSectionsWithLogicalIds) {
            const sectionData = this.template[section];

            // Create a map for this section's entities
            const sectionPositionMap = new Map<string, TextDocumentPositionParams[]>();
            this.entityPositions.set(section, sectionPositionMap);

            if (sectionData && typeof sectionData === 'object') {
                const logicalIds = Object.keys(sectionData);

                // Generate positions for each entity in this section
                for (const logicalId of logicalIds) {
                    const positions = this.getPositionsForEntity(section, logicalId);
                    sectionPositionMap.set(logicalId, positions);
                }
            }
        }
    }

    private getPositionsForEntity(section: string, logicalId: string): TextDocumentPositionParams[] {
        const positions: TextDocumentPositionParams[] = [];
        const lines = this.contents.split('\n');

        const entityBounds = this.findEntityBounds(section, logicalId, lines);
        if (!entityBounds) {
            return positions;
        }

        const { startLine, endLine } = entityBounds;

        for (let lineIndex = startLine; lineIndex <= endLine; lineIndex++) {
            const line = lines[lineIndex];
            const linePositions = this.generateLinePositions(line, lineIndex);
            positions.push(...linePositions);
        }

        return positions;
    }

    private normalizeEntity(entity: any): any {
        if (entity === null) {
            return entity;
        }

        if (typeof entity !== 'object') {
            return entity;
        }

        if (Array.isArray(entity)) {
            return entity.map((item) => this.normalizeEntity(item));
        }

        // Handle objects
        const normalized: any = {};
        for (const [key, value] of Object.entries(entity)) {
            if (value !== undefined) {
                normalized[key] = this.normalizeEntity(value);
            }
        }

        return normalized;
    }

    private hasAllExpectedKeys(expected: any, actual: any): boolean {
        if (expected === null && actual === null) return true;
        if (expected === null || actual === null) return false;

        if (isPrimitive(expected) && !isPrimitive(actual)) {
            return false;
        } else if (isPrimitive(expected) && isPrimitive(actual)) {
            return true;
        } else if (typeof expected !== typeof actual) {
            return false;
        }

        // Iterate over every key in the 'expected' object.
        for (const key of Object.keys(expected)) {
            // 1. Check if the key exists in the 'actual' object. If not, fail immediately.
            if (!(key in actual)) {
                return false;
            }

            const expectedValue = expected[key];
            const actualValue = actual[key];

            // 2. If the expected value is a nested object, we must recurse.
            // We only do this for plain objects, not arrays or null.
            if (typeof expectedValue === 'object' && expectedValue !== null && !Array.isArray(expectedValue)) {
                // The corresponding value in 'actual' must also be an object to check its keys.
                if (typeof actualValue !== 'object' || actualValue === null || Array.isArray(actualValue)) {
                    return false;
                }

                // If the recursive call finds missing keys in the nested object, propagate the failure.
                if (!this.hasAllExpectedKeys(expectedValue, actualValue)) {
                    return false;
                }
            }
        }

        // If the loop completes, it means all expected keys were found. ✅
        return true;
    }
}

function isPrimitive(value: any) {
    return ['boolean', 'string', 'number', 'symbol', 'bigint', 'undefined'].includes(typeof value);
}

function tupleString(tuples: [number, number]) {
    return tuples.join(',');
}

function positionsToSet(positions: Set<string>): [number, number][] {
    return [...positions].map((position) => {
        const tuple = position.split(',');
        return [Number(tuple[0]), Number(tuple[1])];
    });
}
