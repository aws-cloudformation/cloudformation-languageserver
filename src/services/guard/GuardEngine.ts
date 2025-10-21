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
 * Guard WASM module interface based on cfn-guard TypeScript bindings
 */
interface GuardWasmModule {
    ValidateBuilder: {
        new (): GuardValidateBuilder;
    };
    OutputFormatType: {
        SingleLineSummary: number;
        JSON: number;
        YAML: number;
        Junit: number;
        Sarif: number;
    };
    ShowSummaryType: {
        All: number;
        Pass: number;
        Fail: number;
        Skip: number;
        None: number;
    };
}

/**
 * Guard ValidateBuilder interface from WASM bindings
 */
interface GuardValidateBuilder {
    payload(enabled: boolean): GuardValidateBuilder;
    structured(enabled: boolean): GuardValidateBuilder;
    outputFormat(format: number): GuardValidateBuilder;
    showSummary(args: number[]): GuardValidateBuilder;
    tryBuildAndExecute(payload: string): unknown;
}

/**
 * GuardEngine handles the loading and execution of the Guard WASM module
 * for policy-as-code validation of CloudFormation templates.
 */
export class GuardEngine {
    private guardWasm: GuardWasmModule | undefined;
    private readonly log = LoggerFactory.getLogger(GuardEngine);
    private initializationPromise: Promise<void> | undefined;
    private isInitialized = false;

    /**
     * Initialize the Guard WASM module
     * This loads the WASM binary and sets up the JavaScript bindings
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return await this.initializationPromise;
        }

        this.initializationPromise = this._initialize();
        return await this.initializationPromise;
    }

    private async _initialize(): Promise<void> {
        try {
            const wasmModule = await import('./assets/guard-wrapper.js');
            this.guardWasm = wasmModule;

            this.isInitialized = true;
        } catch (error) {
            this.log.error(`Failed to initialize Guard WASM module: ${extractErrorMessage(error)}`);
            throw new Error(`Guard WASM initialization failed: ${extractErrorMessage(error)}`);
        }
    }

    /**
     * Execute Guard validation against template content with specified rules
     *
     * @param content The CloudFormation template content (JSON or YAML)
     * @param rules Array of Guard rules to validate against
     * @param severity Default severity to use when Guard doesn't provide one
     * @returns Array of violations found
     */
    validateTemplate(content: string, rules: GuardRule[], severity: DiagnosticSeverity): GuardViolation[] {
        if (!this.isInitialized || !this.guardWasm) {
            throw new Error('GuardEngine not initialized. Call initialize() first.');
        }

        if (rules.length === 0) {
            return [];
        }

        try {
            return this.performValidation(content, rules, severity);
        } catch (error) {
            this.log.debug(`Guard validation failed: ${extractErrorMessage(error)}`);
            throw new Error(`Guard validation failed: ${extractErrorMessage(error)}`);
        }
    }

    /**
     * Execute Guard validation using SingleLineSummary format
     */
    private executeGuardValidation(content: string, rules: GuardRule[]): string {
        if (!this.isInitialized || !this.guardWasm) {
            throw new Error('GuardEngine not initialized. Call initialize() first.');
        }

        const payload = {
            rules: rules.map((rule) => rule.content),
            data: [content],
        };

        const builder = new this.guardWasm.ValidateBuilder()
            .payload(true) // Use payload mode
            .structured(false) // Get unstructured output for single-line-summary
            .outputFormat(this.guardWasm.OutputFormatType.SingleLineSummary) // Single line summary format
            .showSummary([this.guardWasm.ShowSummaryType.None]); // No summary

        const payloadString = JSON.stringify(payload);

        const result = builder.tryBuildAndExecute(payloadString);

        if (typeof result === 'string') {
            return result;
        } else {
            return JSON.stringify(result, undefined, 2);
        }
    }

    /**
     * Perform the actual validation using SingleLineSummary format
     */
    private performValidation(content: string, rules: GuardRule[], severity: DiagnosticSeverity): GuardViolation[] {
        try {
            const output = this.executeGuardValidation(content, rules);
            const violations = this.parseSingleLineSummaryOutput(output, rules, severity);
            return this.deduplicateViolations(violations);
        } catch (error) {
            this.log.debug(`Guard WASM execution failed: ${extractErrorMessage(error)}`);
            throw error;
        }
    }

    /**
     * Get raw SingleLineSummary output for debugging/inspection
     */
    getRawOutput(content: string, rules: GuardRule[]): string {
        try {
            const result = this.executeGuardValidation(content, rules);

            if (typeof result === 'string') {
                return result;
            } else {
                return JSON.stringify(result, undefined, 2);
            }
        } catch (error) {
            this.log.error(`Error in getRawOutput: ${extractErrorMessage(error)}`);
            throw error;
        }
    }

    /**
     * Parse SingleLineSummary output and convert to structured violations
     * Groups violations by missing property and location, combining rule names
     */
    private parseSingleLineSummaryOutput(
        output: string,
        _rules: GuardRule[],
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
                    if (!group) {
                        continue;
                    }

                    group.ruleNames.add(ruleName);

                    // Get rule message if available
                    const rule = _rules.find((r) => r.name === ruleName);
                    if (rule?.message && !group.ruleMessages.includes(rule.message)) {
                        group.ruleMessages.push(rule.message);
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
                if (!group) {
                    continue;
                }

                group.ruleNames.add(ruleName);

                // Get rule message if available
                const rule = _rules.find((r) => r.name === ruleName);
                if (rule?.message && !group.ruleMessages.includes(rule.message)) {
                    group.ruleMessages.push(rule.message);
                }
            }
        }

        // Convert groups to violations
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

    /**
     * Extract the message from Guard rule content << >> blocks
     * This provides a consistent message for all violations of a rule
     */
    public static extractRuleMessage(ruleContent: string): string | undefined {
        // Match << >> blocks and extract Violation and Fix messages
        const messageBlockRegex = /<<\s*([\s\S]*?)\s*>>/;
        const match = ruleContent.match(messageBlockRegex);

        if (!match) {
            return undefined;
        }

        const messageBlock = match[1];
        const violationMatch = messageBlock.match(/Violation:\s*([^\n]+)/);
        const fixMatch = messageBlock.match(/Fix:\s*([^\n]+)/);

        let message = '';
        if (violationMatch) {
            message = violationMatch[1].trim();
        }
        if (fixMatch) {
            message += ` ${fixMatch[1].trim()}`;
        }

        return message || undefined;
    }

    /**
     * Extract useful context from Guard violation messages
     * Focuses on specific, actionable information like missing properties or value mismatches
     */
    private extractViolationContext(
        violationMessage?: string,
        fixMessage?: string,
        actualValue?: string,
        expectedValue?: string,
        missingProperty?: string,
        operator?: string,
    ): string | undefined {
        // Add missing property context
        if (missingProperty) {
            return `Missing property: ${missingProperty}`;
        }

        // Add comparison context if we have both values
        if (actualValue && expectedValue) {
            return `Expected: ${expectedValue}, Found: ${actualValue}`;
        }

        // Add operator context - generic for any operator with values
        if (operator && actualValue && expectedValue) {
            const operatorText = operator.toLowerCase().replaceAll('_', ' ');
            return `Value must be ${operatorText} ${expectedValue}, found: ${actualValue}`;
        }

        // Special case for existence operators without values
        if (operator === 'NOT EXISTS') {
            return 'Property should not exist';
        }
        if (operator === 'EXISTS') {
            return 'Property should exist';
        }

        return undefined;
    }

    /**
     * Deduplicate violations that have the same rule name and location
     * This handles cases where Guard reports multiple violations for the same issue
     * When duplicates are found, we combine all contexts into a single comprehensive finding
     */
    private deduplicateViolations(violations: GuardViolation[]): GuardViolation[] {
        const groupedViolations = new Map<string, GuardViolation[]>();

        // Group violations by rule name and location
        for (const violation of violations) {
            const key = `${violation.ruleName}:${violation.location.path}:${violation.location.line}:${violation.location.column}`;

            if (!groupedViolations.has(key)) {
                groupedViolations.set(key, []);
            }
            groupedViolations.get(key)?.push(violation);
        }

        // Combine all violations in each group
        const result: GuardViolation[] = [];
        for (const violationGroup of groupedViolations.values()) {
            if (violationGroup.length === 1) {
                result.push(violationGroup[0]);
            } else {
                const combined = this.combineAllViolationMessages(violationGroup);
                result.push(combined);
            }
        }

        return result;
    }

    /**
     * Combine all violation messages from multiple violations for the same rule and location
     * Collects all unique context information into a single comprehensive message
     */
    private combineAllViolationMessages(violations: GuardViolation[]): GuardViolation {
        if (violations.length === 0) {
            throw new Error('Cannot combine empty violations array');
        }

        // Use the first violation as the base
        const baseViolation = violations[0];

        // Extract the base rule message (everything before any context)
        const baseMessage = baseViolation.message
            .replace(/\n+$/, '')
            .split(' Expected:')[0]
            .split(' Missing property:')[0]
            .split(' Property should not exist')[0];

        // Collect all unique context pieces from all violations
        const contexts = new Set<string>();

        for (const violation of violations) {
            const context = this.extractContextFromMessage(violation.message);
            if (context) {
                contexts.add(context);
            }
        }

        // Build combined message with all deduplicated contexts
        let combinedMessage = baseMessage;
        if (contexts.size > 0) {
            // Sort contexts to have a consistent order
            const sortedContexts = [...contexts].sort();
            combinedMessage += '\n' + sortedContexts.join('\n');
        }
        combinedMessage += '\n';

        return {
            ...baseViolation,
            message: combinedMessage,
        };
    }

    /**
     * Extract context information from a violation message
     */
    private extractContextFromMessage(message: string): string | undefined {
        if (message.includes('Expected:')) {
            const match = message.match(/(Expected: [^,\n]+, Found: [^,\n]+)/);
            return match ? match[1] : undefined;
        }
        if (message.includes('Missing property:')) {
            const match = message.match(/(Missing property: [^\n]+)/);
            return match ? match[1].trim() : undefined;
        }
        if (message.includes('Property should not exist')) {
            return 'Property should not exist';
        }
        if (message.includes('Check failed:')) {
            const match = message.match(/(Check failed: [^\n]+)/);
            return match ? match[1].trim() : undefined;
        }
        return undefined;
    }

    /**
     * Check if the GuardEngine is initialized and ready for use
     */
    isReady(): boolean {
        return this.isInitialized && this.guardWasm !== undefined;
    }

    /**
     * Cleanup WASM resources and reset state
     */
    dispose(): void {
        try {
            if (this.guardWasm) {
                this.guardWasm = undefined;
            }

            // Reset state
            this.isInitialized = false;
            this.initializationPromise = undefined;
        } catch (error) {
            this.log.error(`Error disposing Guard WASM module: ${extractErrorMessage(error)}`);
        }
    }
}
