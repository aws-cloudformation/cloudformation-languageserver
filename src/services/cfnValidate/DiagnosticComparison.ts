import { Diagnostic } from 'vscode-languageserver';

export interface DiagnosticComparisonResult {
    readonly cfnLintOnlyRuleIds: readonly string[];
    readonly cfnValidateOnlyRuleIds: readonly string[];
    readonly locationMismatchRuleIds: readonly string[];
}

/**
 * Findings are paired by rule id and start line first, then by rule id alone (a location mismatch); whatever is left
 * is a rule id mismatch attributed to the tool that reported it. Pairing is a multiset operation, so each surplus
 * finding of a rule yields its own entry.
 */
export function compareDiagnostics(
    cfnLint: readonly Diagnostic[],
    cfnValidate: readonly Diagnostic[],
): DiagnosticComparisonResult {
    const sameLine = pairBy(cfnLint, cfnValidate, ruleIdAndLineKey);
    const sameRule = pairBy(sameLine.unpairedLeft, sameLine.unpairedRight, ruleIdOf);

    return {
        cfnLintOnlyRuleIds: sameRule.unpairedLeft.map((diagnostic) => ruleIdOf(diagnostic)),
        cfnValidateOnlyRuleIds: sameRule.unpairedRight.map((diagnostic) => ruleIdOf(diagnostic)),
        locationMismatchRuleIds: sameRule.pairedLeft.map((diagnostic) => ruleIdOf(diagnostic)),
    };
}

function ruleIdOf(diagnostic: Diagnostic): string {
    return diagnostic.code === undefined ? '' : String(diagnostic.code);
}

function ruleIdAndLineKey(diagnostic: Diagnostic): string {
    return `${ruleIdOf(diagnostic)}@${diagnostic.range.start.line}`;
}

interface Pairing {
    readonly pairedLeft: Diagnostic[];
    readonly unpairedLeft: Diagnostic[];
    readonly unpairedRight: Diagnostic[];
}

function pairBy(
    left: readonly Diagnostic[],
    right: readonly Diagnostic[],
    keyOf: (diagnostic: Diagnostic) => string,
): Pairing {
    const unpairedRightByKey = new Map<string, Diagnostic[]>();
    for (const diagnostic of right) {
        const key = keyOf(diagnostic);
        const sameKey = unpairedRightByKey.get(key);
        if (sameKey) {
            sameKey.push(diagnostic);
        } else {
            unpairedRightByKey.set(key, [diagnostic]);
        }
    }

    const pairedLeft: Diagnostic[] = [];
    const unpairedLeft: Diagnostic[] = [];
    for (const diagnostic of left) {
        if (unpairedRightByKey.get(keyOf(diagnostic))?.shift()) {
            pairedLeft.push(diagnostic);
        } else {
            unpairedLeft.push(diagnostic);
        }
    }

    return { pairedLeft, unpairedLeft, unpairedRight: [...unpairedRightByKey.values()].flat() };
}
