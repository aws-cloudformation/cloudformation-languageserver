import { describe, it, expect, vi } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { previewGuardHooks, isPreviewableGuardHook } from '../../../src/hooks/GuardHookPreview';
import { DetailedHook } from '../../../src/hooks/HooksRequestType';

function hook(overrides: Partial<DetailedHook> = {}): DetailedHook {
    return {
        typeName: 'Private::Guard::S3',
        typeArn: 'arn:hook',
        configured: true,
        invocationStatus: 'ENABLED',
        ruleUri: 's3://bucket/rule.guard',
        ...overrides,
    };
}

describe('isPreviewableGuardHook', () => {
    it('is true only for configured, ENABLED hooks with a rule uri', () => {
        expect(isPreviewableGuardHook(hook())).toBe(true);
        expect(isPreviewableGuardHook(hook({ invocationStatus: 'DISABLED' }))).toBe(false);
        expect(isPreviewableGuardHook(hook({ configured: false }))).toBe(false);
        expect(isPreviewableGuardHook(hook({ ruleUri: undefined }))).toBe(false);
    });
});

describe('previewGuardHooks', () => {
    it('runs each previewable hook rule against the template and reports pass/fail', async () => {
        const validateTemplate = vi
            .fn()
            .mockReturnValueOnce([])
            .mockReturnValueOnce([
                {
                    ruleName: 'encryption',
                    message: 'must encrypt',
                    severity: DiagnosticSeverity.Error,
                    location: { line: 3, column: 5, path: 'Resources/Bucket' },
                },
            ]);
        const fetchRuleContent = vi.fn().mockResolvedValue('rule r { ... }');
        const deps = {
            listHooksDetailed: () =>
                Promise.resolve([
                    hook({ typeName: 'Private::Guard::A', ruleUri: 's3://b/a.guard' }),
                    hook({ typeName: 'Private::Guard::B', ruleUri: 's3://b/b.guard', failureMode: 'FAIL' }),
                    hook({ typeName: 'Private::Guard::Disabled', invocationStatus: 'DISABLED' }),
                ]),
            fetchRuleContent,
            validateTemplate,
        };

        const result = await previewGuardHooks(deps, '{"Resources":{}}');

        expect(result.hooks).toHaveLength(2);
        expect(fetchRuleContent).toHaveBeenCalledTimes(2);
        expect(result.hooks[0]).toEqual({
            typeName: 'Private::Guard::A',
            ruleUri: 's3://b/a.guard',
            failureMode: undefined,
            valid: true,
            violations: [],
        });
        expect(result.hooks[1].valid).toBe(false);
        expect(result.hooks[1].violations).toEqual([
            { ruleName: 'encryption', message: 'must encrypt', line: 3, column: 5, path: 'Resources/Bucket' },
        ]);
    });

    it('uses Warning severity for WARN-mode hooks', async () => {
        const validateTemplate = vi.fn().mockReturnValue([]);
        const deps = {
            listHooksDetailed: () => Promise.resolve([hook({ failureMode: 'WARN' })]),
            fetchRuleContent: () => Promise.resolve('rule r { ... }'),
            validateTemplate,
        };
        await previewGuardHooks(deps, '{}');
        expect(validateTemplate).toHaveBeenCalledWith('{}', expect.any(Array), DiagnosticSeverity.Warning);
    });

    it('captures an error per hook without failing the whole preview', async () => {
        const deps = {
            listHooksDetailed: () => Promise.resolve([hook()]),
            fetchRuleContent: () => Promise.reject(new Error('S3 access denied')),
            validateTemplate: vi.fn(),
        };
        const result = await previewGuardHooks(deps, '{}');
        expect(result.hooks[0].valid).toBe(false);
        expect(result.hooks[0].error).toContain('S3 access denied');
        expect(deps.validateTemplate).not.toHaveBeenCalled();
    });

    it('returns no entries when there are no previewable hooks', async () => {
        const result = await previewGuardHooks(
            {
                listHooksDetailed: () => Promise.resolve([hook({ configured: false })]),
                fetchRuleContent: vi.fn(),
                validateTemplate: vi.fn(),
            },
            '{}',
        );
        expect(result.hooks).toEqual([]);
    });
});
