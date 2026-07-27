import { OutputFormatType, ShowSummaryType, ValidateBuilder } from 'cfn-guard/guard';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/errors/ErrorUtils';

/**
 * Represents a Guard rule violation found during validation
 */
export interface GuardViolation {
    ruleName: string;
    message: string;
    severity: DiagnosticSeverity;
    location: {
        line: number;
        column: number;
        path?: string; // JSON path to the violating element
    };
    context?: string; // additional context about the violation
}

/**
 * Represents a Guard rule for policy validation
 */
export interface GuardRule {
    name: string;
    description: string;
    severity: DiagnosticSeverity;
    content: string; // Guard DSL rule content
    tags: string[];
    pack: string; // which rule pack this belongs to
    message?: string; // pre-extracted violation message from rule content
}

export type RuleEvaluation = {
    valid: boolean;
    parseErrors: string[];
    violations: GuardViolation[];
};

/**
 * GuardEngine handles the execution of Guard validation using the official cfn-guard TypeScript library
 */
export class GuardEngine {
    private readonly log = LoggerFactory.getLogger(GuardEngine);

    /**
     * Validate CloudFormation template using Guard rules
     */
    validateTemplate(content: string, rules: GuardRule[], severity: DiagnosticSeverity): GuardViolation[] {
        if (rules.length === 0) {
            return [];
        }

        try {
            const payload = {
                rules: rules.map((rule) => rule.content),
                data: [content],
            };

            const validateBuilder = new ValidateBuilder();
            const result = validateBuilder
                .payload(true)
                .structured(true)
                .showSummary([ShowSummaryType.None])
                .outputFormat(OutputFormatType.Sarif)
                .tryBuildAndExecute(JSON.stringify(payload)) as string;

            return this.convertSarifToViolations(result, rules, severity);
        } catch (error) {
            throw new Error(`Guard validation failed: ${extractErrorMessage(error)}`);
        }
    }

    evaluateRule(params: {
        ruleContent: string;
        data: string;
        severity?: DiagnosticSeverity;
        name?: string;
    }): RuleEvaluation {
        const syntaxError = this.findSyntaxError(params.ruleContent);
        if (syntaxError) {
            return { valid: false, parseErrors: [syntaxError], violations: [] };
        }

        const name = params.name ?? 'candidate-rule';
        const severity = params.severity ?? DiagnosticSeverity.Error;
        const rule: GuardRule = {
            name,
            description: name,
            severity,
            content: params.ruleContent,
            tags: [],
            pack: name,
        };

        try {
            const violations = this.validateTemplate(params.data, [rule], severity);
            return { valid: true, parseErrors: [], violations };
        } catch (error) {
            this.log.warn(error, `Guard rule evaluation failed for ${name}`);
            return { valid: false, parseErrors: [extractErrorMessage(error)], violations: [] };
        }
    }

    validateRule(
        ruleContent: string,
        sampleData?: string,
    ): { valid: boolean; parseErrors: string[]; violations: GuardViolation[] } {
        const data = sampleData && sampleData.trim().length > 0 ? sampleData : '{"Resources":{}}';
        return this.evaluateRule({ ruleContent, data, severity: DiagnosticSeverity.Error, name: 'candidate-rule' });
    }

    private findSyntaxError(ruleContent: string): string | undefined {
        const closers: Record<string, string> = { '}': '{', ')': '(', ']': '[' };
        const stack: string[] = [];
        let inString: string | undefined;
        let inRegex = false;
        let inRegexClass = false;
        let hasContent = false;

        for (let i = 0; i < ruleContent.length; i++) {
            const char = ruleContent[i];
            const rangeEnd = findRangeLiteralEnd(ruleContent, i);
            const isRangeLiteral = rangeEnd > -1;

            if (inString) {
                if (char === '\\' && ruleContent[i + 1] !== '\n') {
                    i++;
                } else if (char === '\n' || char === inString) {
                    inString = undefined;
                }
            } else if (inRegex) {
                switch (char) {
                    case '\\': {
                        i++;

                        break;
                    }
                    case '[': {
                        inRegexClass = true;

                        break;
                    }
                    case ']': {
                        inRegexClass = false;

                        break;
                    }
                    case '\n': {
                        inRegex = false;
                        inRegexClass = false;

                        break;
                    }
                    default: {
                        if (char === '/' && !inRegexClass) {
                            inRegex = false;
                        }
                    }
                }
            } else if (char === '<' && ruleContent[i + 1] === '<') {
                const messageEnd = ruleContent.indexOf('>>', i + 2);
                i = messageEnd === -1 ? ruleContent.length : messageEnd + 1;
            } else if (char === '#') {
                while (i < ruleContent.length && ruleContent[i] !== '\n') {
                    i++;
                }
            } else if (isRangeLiteral) {
                hasContent = true;
                i = rangeEnd;
            } else {
                if (char.trim().length > 0) {
                    hasContent = true;
                }

                switch (char) {
                    case '"':
                    case "'": {
                        inString = char;
                        break;
                    }
                    case '/': {
                        inRegex = true;
                        break;
                    }
                    case '{':
                    case '(':
                    case '[': {
                        stack.push(char);
                        break;
                    }
                    case '}':
                    case ')':
                    case ']': {
                        if (stack.pop() !== closers[char]) {
                            return `Mismatched '${char}' in the Guard rule. Check your rule blocks and brackets.`;
                        }
                        break;
                    }
                }
            }
        }

        if (!hasContent) {
            return 'The Guard rule is empty. Define at least one `rule <name> { ... }` block.';
        }
        if (stack.length > 0) {
            return `Unclosed '${stack[stack.length - 1]}' in the Guard rule — a block is missing its closing bracket.`;
        }
        return undefined;
    }

    private convertSarifToViolations(
        sarifResult: string,
        rules: GuardRule[],
        severity: DiagnosticSeverity,
    ): GuardViolation[] {
        const violations: GuardViolation[] = [];

        try {
            const sarif = JSON.parse(sarifResult) as {
                runs: Array<{
                    results: Array<{
                        ruleId: string;
                        message: { text: string };
                        locations: Array<{ physicalLocation: { region: { startLine: number; startColumn: number } } }>;
                    }>;
                }>;
            };

            if (sarif.runs && sarif.runs.length > 0) {
                const results = sarif.runs[0].results || [];

                // Group violations by location and message for consolidation
                const violationGroups = new Map<
                    string,
                    {
                        line: number;
                        column: number;
                        message: string;
                        ruleNames: Set<string>;
                    }
                >();

                for (const result of results) {
                    const line = result.locations[0]?.physicalLocation?.region?.startLine || 1;
                    const column = result.locations[0]?.physicalLocation?.region?.startColumn || 1;

                    // Get custom message if available, otherwise use SARIF message
                    const rule = rules.find((r) => r.name === result.ruleId);
                    const message = rule?.message ?? result.message.text;

                    const groupKey = `${line}:${column}:${message}`;

                    if (!violationGroups.has(groupKey)) {
                        violationGroups.set(groupKey, {
                            line,
                            column,
                            message,
                            ruleNames: new Set(),
                        });
                    }

                    violationGroups.get(groupKey)?.ruleNames.add(result.ruleId);
                }

                // Convert groups to violations with consolidated rule names
                for (const [, group] of violationGroups) {
                    const ruleNamesList = [...group.ruleNames].toSorted();
                    const combinedRuleName = ruleNamesList.join(', ');

                    let message = group.message;
                    if (!message.endsWith('\n')) {
                        message += '\n';
                    }

                    violations.push({
                        ruleName: combinedRuleName,
                        message,
                        severity,
                        location: {
                            line: group.line,
                            column: group.column,
                        },
                    });
                }
            }
        } catch (error) {
            this.log.error(`Failed to parse SARIF results: ${extractErrorMessage(error)}`);
        }

        return violations;
    }

    /**
     * Extract rule message (compatibility method)
     */
    static extractRuleMessage(ruleContent: string): string | undefined {
        const messageMatch = ruleContent.match(/<<\s*([\s\S]*?)\s*>>/);
        return messageMatch ? messageMatch[1].trim() : undefined;
    }
}

const RangeBodyPattern = /[\s\d,.'"+-]|[A-Za-z]/;

function findRangeLiteralEnd(ruleContent: string, index: number): number {
    if (ruleContent[index] !== 'r') {
        return -1;
    }
    const previous = ruleContent[index - 1];
    if (previous !== undefined && /[\w.]/.test(previous)) {
        return -1;
    }
    const opener = ruleContent[index + 1];
    if (opener !== '[' && opener !== '(') {
        return -1;
    }
    for (let i = index + 2; i < ruleContent.length; i++) {
        const char = ruleContent[i];
        if (char === ']' || char === ')') {
            return i;
        }
        if (!RangeBodyPattern.test(char) || char === '\n') {
            return -1;
        }
    }
    return -1;
}
