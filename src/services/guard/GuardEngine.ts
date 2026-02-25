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
