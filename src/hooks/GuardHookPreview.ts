import { DiagnosticSeverity } from 'vscode-languageserver';
import { GuardRule, GuardViolation } from '../services/guard/GuardEngine';
import { extractErrorMessage } from '../utils/errors/ErrorUtils';
import { DetailedHook, GuardHookPreviewEntry, PreviewGuardHooksResult } from './HooksRequestType';

export interface GuardHookPreviewDeps {
    listHooksDetailed: () => Promise<DetailedHook[]>;
    fetchRuleContent: (ruleUri: string) => Promise<string>;
    validateTemplate: (content: string, rules: GuardRule[], severity: DiagnosticSeverity) => GuardViolation[];
}

export function isPreviewableGuardHook(hook: DetailedHook): boolean {
    return Boolean(hook.configured && hook.invocationStatus === 'ENABLED' && hook.ruleUri);
}

export async function previewGuardHooks(
    deps: GuardHookPreviewDeps,
    templateContent: string,
): Promise<PreviewGuardHooksResult> {
    const detailed = await deps.listHooksDetailed();
    const applicable = detailed.filter((hook) => isPreviewableGuardHook(hook));
    const hooks = await Promise.all(applicable.map((hook) => previewSingleHook(deps, templateContent, hook)));
    return { hooks };
}

async function previewSingleHook(
    deps: GuardHookPreviewDeps,
    templateContent: string,
    hook: DetailedHook,
): Promise<GuardHookPreviewEntry> {
    const ruleUri = hook.ruleUri as string;
    const severity = hook.failureMode === 'WARN' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error;
    try {
        const content = await deps.fetchRuleContent(ruleUri);
        const rule: GuardRule = {
            name: hook.typeName,
            description: hook.typeName,
            severity,
            content,
            tags: [],
            pack: hook.typeName,
        };
        const violations = deps.validateTemplate(templateContent, [rule], severity);
        return {
            typeName: hook.typeName,
            ruleUri,
            failureMode: hook.failureMode,
            valid: violations.length === 0,
            violations: violations.map((violation) => ({
                ruleName: violation.ruleName,
                message: violation.message,
                line: violation.location.line,
                column: violation.location.column,
                path: violation.location.path,
            })),
        };
    } catch (error) {
        return {
            typeName: hook.typeName,
            ruleUri,
            failureMode: hook.failureMode,
            valid: false,
            violations: [],
            error: extractErrorMessage(error),
        };
    }
}
