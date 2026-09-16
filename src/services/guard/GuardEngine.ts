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
    /**
     * Zero-based location of the violating template node. `line`/`column` are LSP-style (0-based) and
     * point at the start of the node identified by `path`. When cfn-guard does not report a location,
     * both are 0 and `path` is undefined.
     */
    location: {
        line: number;
        column: number;
        path?: string; // Template path to the violating element, e.g. /Resources/Db/Properties/AutoMinorVersionUpgrade
    };
    context?: string; // additional context about the violation
}

type SarifRegion = { startLine?: number; startColumn?: number };

type SarifResult = {
    ruleId: string;
    message: { text: string };
    locations?: Array<{ physicalLocation?: { region?: SarifRegion } }>;
};

type ViolationLocation = GuardViolation['location'];

/**
 * cfn-guard embeds the location of the offending value in every clause message as
 * `<path>[L:<line>,C:<column>]`, e.g. `[Path=/Resources/Db/Properties/AutoMinorVersionUpgrade[L:17,C:6] Value=...]`
 * or `property [/Resources/Role/Properties/Policies[L:12,C:8]] existed`. Both coordinates are 0-based.
 * Location-less placeholders such as `Path=[L:0,C:0]` (the literal being compared against) have no path
 * and are intentionally not matched.
 */
const MESSAGE_LOCATION_PATTERN = /(\/[^\s[\]]*)\[L:(\d+),C:(\d+)\]/;

/**
 * cfn-guard only populates the SARIF region for a subset of clause failures and otherwise emits
 * `startLine: 1, startColumn: 1` as a placeholder (its 0,0 default clamped to a minimum of 1).
 */
const SARIF_UNKNOWN_REGION_VALUE = 1;

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
            const sarif = JSON.parse(sarifResult) as { runs: Array<{ results: SarifResult[] }> };

            if (sarif.runs && sarif.runs.length > 0) {
                const results = sarif.runs[0].results || [];

                // Group violations by location and message for consolidation
                const violationGroups = new Map<
                    string,
                    {
                        location: ViolationLocation;
                        message: string;
                        ruleNames: Set<string>;
                    }
                >();

                for (const result of results) {
                    const location = GuardEngine.resolveLocation(result);

                    // Get custom message if available, otherwise use SARIF message
                    const rule = rules.find((r) => r.name === result.ruleId);
                    const message = rule?.message ?? result.message.text;

                    const groupKey = `${location.path ?? ''}:${location.line}:${location.column}:${message}`;

                    if (!violationGroups.has(groupKey)) {
                        violationGroups.set(groupKey, {
                            location,
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
                        location: group.location,
                    });
                }
            }
        } catch (error) {
            this.log.error(`Failed to parse SARIF results: ${extractErrorMessage(error)}`);
        }

        return violations;
    }

    /**
     * Resolve the 0-based location of a SARIF result. The location embedded in the message text is
     * preferred because it is present for every clause type and carries the template path; the SARIF
     * region is only a fallback since cfn-guard leaves it at the `1:1` placeholder for most failures.
     */
    private static resolveLocation(result: SarifResult): ViolationLocation {
        const embedded = MESSAGE_LOCATION_PATTERN.exec(result.message.text);
        if (embedded) {
            return {
                path: embedded[1],
                line: Number.parseInt(embedded[2], 10),
                column: Number.parseInt(embedded[3], 10),
            };
        }

        const region = result.locations?.[0]?.physicalLocation?.region;
        const line = region?.startLine ?? SARIF_UNKNOWN_REGION_VALUE;
        const column = region?.startColumn ?? SARIF_UNKNOWN_REGION_VALUE;
        if (line === SARIF_UNKNOWN_REGION_VALUE && column === SARIF_UNKNOWN_REGION_VALUE) {
            return { line: 0, column: 0 };
        }

        // cfn-guard copies its internal 0-based coordinates straight into the region
        return { line: Math.max(0, line), column: Math.max(0, column) };
    }

    /**
     * Extract rule message (compatibility method)
     */
    static extractRuleMessage(ruleContent: string): string | undefined {
        const messageMatch = ruleContent.match(/<<\s*([\s\S]*?)\s*>>/);
        return messageMatch ? messageMatch[1].trim() : undefined;
    }
}
