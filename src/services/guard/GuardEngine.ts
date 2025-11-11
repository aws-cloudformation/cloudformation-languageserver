import { OutputFormatType, ShowSummaryType, ValidateBuilder } from 'cfn-guard/guard';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';

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

    /**
     * Convert SARIF results to GuardViolation format
     */
    private convertSummaryToViolations(
        output: string,
        rules: GuardRule[],
        severity: DiagnosticSeverity,
    ): GuardViolation[] {
        const violations: GuardViolation[] = [];

        if (!output || output.trim() === '') {
            return violations;
        }

        // Use regex to find all PropertyPath entries with their associated violation messages
        const propertyPathRegex = /PropertyPath\s*=\s*([^\s]+\[L:(\d+),C:(\d+)\])/g;
        const ruleRegex = /Rule\s*=\s*([A-Z_][A-Z0-9_]*)/g;
        const missingPropertyRegex = /MissingProperty\s*=\s*([^\n]+)/g;
        const comparisonValueRegex = /Value\s*=\s*([^\n]+)/g;
        const comparisonWithRegex = /ComparedWith\s*=\s*([^\n]+)/g;
        const operatorRegex = /Operator\s*=\s*([^\n]+)/g;

        // Group violations by location and missing property
        const violationGroups = new Map<
            string,
            {
                line: number;
                column: number;
                cfnPath: string;
                missingProperty?: string;
                ruleNames: Set<string>;
                ruleMessages: string[];
                actualValue?: string;
                expectedValue?: string;
                operator?: string;
            }
        >();

        let propertyPathMatch;
        while ((propertyPathMatch = propertyPathRegex.exec(output)) !== null) {
            const fullPath = propertyPathMatch[1];
            const line = Number.parseInt(propertyPathMatch[2], 10);
            const column = Number.parseInt(propertyPathMatch[3], 10);

            // Extract the path without location info
            const pathMatch = fullPath.match(/^(.+)\[L:\d+,C:\d+\]$/);
            const cfnPath = pathMatch ? pathMatch[1] : fullPath;

            // Find the rule name by looking backwards from this PropertyPath
            const textBeforePropertyPath = output.slice(0, propertyPathMatch.index);
            const ruleMatches = [...textBeforePropertyPath.matchAll(ruleRegex)];
            const ruleName = ruleMatches.length > 0 ? ruleMatches[ruleMatches.length - 1][1] : 'unknown';

            // Find missing property within the error block
            const textAfterPropertyPath = output.slice(propertyPathMatch.index);
            const errorBlockEnd = textAfterPropertyPath.search(/\n\s*\}/);
            const errorBlockText =
                errorBlockEnd === -1
                    ? textAfterPropertyPath.slice(0, 500)
                    : textAfterPropertyPath.slice(0, errorBlockEnd);

            const missingPropertyMatches = [...errorBlockText.matchAll(missingPropertyRegex)];
            const valueMatches = [...errorBlockText.matchAll(comparisonValueRegex)];
            const comparedWithMatches = [...errorBlockText.matchAll(comparisonWithRegex)];
            const operatorMatches = [...errorBlockText.matchAll(operatorRegex)];

            let actualValue: string | undefined;
            let expectedValue: string | undefined;
            let operator: string | undefined;

            if (valueMatches.length > 0) {
                actualValue = valueMatches[0][1].trim();
            }
            if (comparedWithMatches.length > 0) {
                expectedValue = comparedWithMatches[0][1].trim();
            }
            if (operatorMatches.length > 0) {
                operator = operatorMatches[0][1].trim();
            }

            // Only process if this is a root missing property (no dots in property name)
            if (missingPropertyMatches.length > 0) {
                const missingProperty = missingPropertyMatches[0][1].trim();

                // Skip nested properties - only report root missing properties
                if (!missingProperty.includes('.')) {
                    const groupKey = `${line}:${column}:${cfnPath}:${missingProperty}`;

                    if (!violationGroups.has(groupKey)) {
                        violationGroups.set(groupKey, {
                            line,
                            column,
                            cfnPath,
                            missingProperty,
                            ruleNames: new Set(),
                            ruleMessages: [],
                            actualValue,
                            expectedValue,
                            operator,
                        });
                    }

                    const group = violationGroups.get(groupKey);
                    if (group) {
                        group.ruleNames.add(ruleName);

                        // Get rule message if available
                        const rule = rules.find((r) => r.name === ruleName);
                        if (rule?.message && !group.ruleMessages.includes(rule.message)) {
                            group.ruleMessages.push(rule.message);
                        }
                    }
                }
            } else {
                // Failsafe: handle any PropertyPath entry without missing property (comparison errors, etc.)
                const groupKey = `${line}:${column}:${cfnPath}:other`;

                if (!violationGroups.has(groupKey)) {
                    violationGroups.set(groupKey, {
                        line,
                        column,
                        cfnPath,
                        ruleNames: new Set(),
                        ruleMessages: [],
                        actualValue,
                        expectedValue,
                        operator,
                    });
                }

                const group = violationGroups.get(groupKey);
                if (group) {
                    group.ruleNames.add(ruleName);

                    // Get rule message if available
                    const rule = rules.find((r) => r.name === ruleName);
                    if (rule?.message && !group.ruleMessages.includes(rule.message)) {
                        group.ruleMessages.push(rule.message);
                    }
                }
            }
        }

        for (const [, group] of violationGroups) {
            const ruleNamesList = [...group.ruleNames].sort();
            const combinedRuleName = ruleNamesList.join(', ');

            // Use the first available rule message, or create a generic one
            let message = '';
            if (group.ruleMessages.length > 0) {
                message = group.ruleMessages[0];
            } else {
                if (group.missingProperty) {
                    message = `Missing property: ${group.missingProperty}`;
                } else if (group.actualValue && group.expectedValue) {
                    message = `Expected: ${group.expectedValue}, Found: ${group.actualValue}`;
                } else {
                    message = `Guard rule violation`;
                }
            }

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
                    path: group.cfnPath,
                },
            });
        }

        return violations;
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
                    const ruleNamesList = [...group.ruleNames].sort();
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
