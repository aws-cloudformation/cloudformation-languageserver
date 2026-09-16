import { z } from 'zod';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('GuardHookInput');

const TemplateObjectSchema = z.record(z.string(), z.unknown());

export type StackHookContext = {
    AwsAccountId: string;
    StackId: string;
    ChangeSetId: string;
    HookTypeName: string;
    HookTypeVersion: string;
    InvocationPoint: string;
    TargetName: string;
    TargetType: string;
};

export const PreviewInvocationPoint = 'CREATE_PRE_PROVISION';

export function buildStackHookContext(params: {
    hookTypeName: string;
    hookTypeVersion?: string;
    accountId?: string;
    stackName?: string;
}): StackHookContext {
    return {
        AwsAccountId: params.accountId ?? '',
        StackId: '',
        ChangeSetId: '',
        HookTypeName: params.hookTypeName,
        HookTypeVersion: params.hookTypeVersion ?? '',
        InvocationPoint: PreviewInvocationPoint,
        TargetName: params.stackName ?? '',
        TargetType: 'STACK',
    };
}

export function buildStackHookInput(templateContent: string, hookContext: StackHookContext): string {
    const trimmed = templateContent.trim();
    if (trimmed.startsWith('{')) {
        try {
            const parsed: unknown = JSON.parse(templateContent);
            const validated = TemplateObjectSchema.parse(parsed);
            if ('HookContext' in validated) {
                log.warn('Template already declares a top-level HookContext; leaving it as authored');
                return templateContent;
            }
            return injectJsonHookContext(templateContent, hookContext, Object.keys(validated).length > 0);
        } catch (error) {
            log.warn(error, "Template began with '{' but is not valid JSON; skipping HookContext injection");
            return templateContent;
        }
    }
    if (/^HookContext\s*:/m.test(templateContent)) {
        log.warn('Template already declares a top-level HookContext; leaving it as authored');
        return templateContent;
    }
    return `${templateContent.replace(/\s+$/, '')}\n${toYamlBlock(hookContext)}`;
}

function injectJsonHookContext(templateContent: string, hookContext: StackHookContext, hasKeys: boolean): string {
    const braceIndex = templateContent.indexOf('{');
    const entry = `"HookContext":${JSON.stringify(hookContext)}${hasKeys ? ',' : ''}`;
    return `${templateContent.slice(0, braceIndex + 1)}${entry}${templateContent.slice(braceIndex + 1)}`;
}

function toYamlBlock(hookContext: StackHookContext): string {
    const entries = Object.entries(hookContext).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`);
    return ['HookContext:', ...entries].join('\n');
}
