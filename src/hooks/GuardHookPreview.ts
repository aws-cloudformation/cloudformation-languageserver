import { DiagnosticSeverity } from 'vscode-languageserver';
import { RuleEvaluation } from '../services/guard/GuardEngine';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/errors/ErrorUtils';
import { buildStackHookContext, buildStackHookInput } from './GuardHookInput';
import { DetailedHook, GuardHookPreviewEntry, PreviewGuardHooksResult } from './HooksRequestType';

const log = LoggerFactory.getLogger('GuardHookPreview');

const PreviewConcurrency = 10;

const StackTargetOperation = 'STACK';

export type PreviewableGuardHook = DetailedHook & { ruleUri: string };

export interface GuardHookPreviewDeps {
    listHooksDetailed: () => Promise<DetailedHook[]>;
    fetchRuleContent: (ruleUri: string) => Promise<string>;
    accountId?: string;
    evaluateRule: (params: {
        ruleContent: string;
        data: string;
        severity: DiagnosticSeverity;
        name: string;
    }) => RuleEvaluation;
}

export function isPreviewableGuardHook(hook: DetailedHook): hook is PreviewableGuardHook {
    if (!hook.configured || hook.invocationStatus !== 'ENABLED' || !hook.ruleUri) {
        return false;
    }
    const targets = hook.targetOperations;
    return targets === undefined || targets.length === 0 || targets.includes(StackTargetOperation);
}

export async function previewGuardHooks(
    deps: GuardHookPreviewDeps,
    templateContent: string,
): Promise<PreviewGuardHooksResult> {
    const detailed = await deps.listHooksDetailed();
    const applicable = detailed.filter(isPreviewableGuardHook);
    const ruleContentByUri = new Map<string, Promise<string>>();
    const hooks: GuardHookPreviewEntry[] = [];

    for (let i = 0; i < applicable.length; i += PreviewConcurrency) {
        const batch = applicable.slice(i, i + PreviewConcurrency);
        const resolved = await Promise.all(
            batch.map((hook) => previewSingleHook(deps, templateContent, hook, ruleContentByUri)),
        );
        hooks.push(...resolved);
    }

    return { hooks };
}

async function previewSingleHook(
    deps: GuardHookPreviewDeps,
    templateContent: string,
    hook: PreviewableGuardHook,
    ruleContentByUri: Map<string, Promise<string>>,
): Promise<GuardHookPreviewEntry> {
    const ruleUri = hook.ruleUri;
    const severity = hook.failureMode === 'WARN' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error;
    const base = { typeName: hook.typeName, ruleUri, failureMode: hook.failureMode };

    try {
        let pendingContent = ruleContentByUri.get(ruleUri);
        if (!pendingContent) {
            pendingContent = deps.fetchRuleContent(ruleUri);
            ruleContentByUri.set(ruleUri, pendingContent);
        }
        const ruleContent = await pendingContent;

        const hookContext = buildStackHookContext({
            hookTypeName: hook.typeName,
            hookTypeVersion: hook.defaultVersionId,
            accountId: deps.accountId,
        });

        const evaluation = deps.evaluateRule({
            ruleContent,
            data: buildStackHookInput(templateContent, hookContext),
            severity,
            name: hook.typeName,
        });

        if (!evaluation.valid) {
            return {
                ...base,
                valid: false,
                violations: [],
                error: `The hook's Guard rule could not be evaluated: ${evaluation.parseErrors.join(' ')}`,
            };
        }

        return {
            ...base,
            valid: evaluation.violations.length === 0,
            violations: evaluation.violations.map((violation) => ({
                ruleName: violation.ruleName,
                message: violation.message,
                line: violation.location.line,
                column: violation.location.column,
            })),
        };
    } catch (error) {
        log.warn(error, `Failed to preview Guard hook ${hook.typeName} using rule ${ruleUri}`);
        return {
            ...base,
            valid: false,
            violations: [],
            error: extractErrorMessage(error),
        };
    }
}
