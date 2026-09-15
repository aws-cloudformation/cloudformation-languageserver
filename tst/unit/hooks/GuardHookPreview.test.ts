import { describe, it, expect, vi } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { previewGuardHooks, isPreviewableGuardHook } from '../../../src/hooks/GuardHookPreview';
import { DetailedHook } from '../../../src/hooks/HooksRequestType';
import { GuardEngine, RuleEvaluation } from '../../../src/services/guard/GuardEngine';

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

const passingEvaluation = (): RuleEvaluation => ({ valid: true, parseErrors: [], violations: [] });

describe('isPreviewableGuardHook', () => {
    it('is true only for configured, ENABLED hooks with a rule uri', () => {
        expect(isPreviewableGuardHook(hook())).toBe(true);
        expect(isPreviewableGuardHook(hook({ invocationStatus: 'DISABLED' }))).toBe(false);
        expect(isPreviewableGuardHook(hook({ configured: false }))).toBe(false);
        expect(isPreviewableGuardHook(hook({ ruleUri: undefined }))).toBe(false);
    });

    it('is true for stack-target hooks and hooks with no declared target', () => {
        expect(isPreviewableGuardHook(hook({ targetOperations: ['STACK'] }))).toBe(true);
        expect(isPreviewableGuardHook(hook({ targetOperations: ['RESOURCE', 'STACK'] }))).toBe(true);
        expect(isPreviewableGuardHook(hook({ targetOperations: [] }))).toBe(true);
    });

    it('is false for hooks that only run on non-stack targets', () => {
        expect(isPreviewableGuardHook(hook({ targetOperations: ['RESOURCE'] }))).toBe(false);
        expect(isPreviewableGuardHook(hook({ targetOperations: ['CLOUD_CONTROL'] }))).toBe(false);
        expect(isPreviewableGuardHook(hook({ targetOperations: ['CHANGE_SET'] }))).toBe(false);
    });
});

describe('previewGuardHooks', () => {
    it('runs each previewable hook rule against the template and reports pass/fail', async () => {
        const evaluateRule = vi
            .fn()
            .mockReturnValueOnce(passingEvaluation())
            .mockReturnValueOnce({
                valid: true,
                parseErrors: [],
                violations: [
                    {
                        ruleName: 'encryption',
                        message: 'must encrypt',
                        severity: DiagnosticSeverity.Error,
                        location: { line: 3, column: 5 },
                    },
                ],
            });
        const fetchRuleContent = vi.fn().mockResolvedValue('rule r { ... }');

        const result = await previewGuardHooks(
            {
                listHooksDetailed: () =>
                    Promise.resolve([
                        hook({ typeName: 'Private::Guard::A', ruleUri: 's3://b/a.guard' }),
                        hook({ typeName: 'Private::Guard::B', ruleUri: 's3://b/b.guard', failureMode: 'FAIL' }),
                        hook({ typeName: 'Private::Guard::Disabled', invocationStatus: 'DISABLED' }),
                    ]),
                fetchRuleContent,
                evaluateRule,
            },
            '{"Resources":{}}',
        );

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
            { ruleName: 'encryption', message: 'must encrypt', line: 3, column: 5 },
        ]);
    });

    it('evaluates the rule exactly once per hook', async () => {
        const evaluateRule = vi.fn().mockReturnValue(passingEvaluation());

        await previewGuardHooks(
            {
                listHooksDetailed: () => Promise.resolve([hook()]),
                fetchRuleContent: () => Promise.resolve('rule r { ... }'),
                evaluateRule,
            },
            '{}',
        );

        expect(evaluateRule).toHaveBeenCalledOnce();
    });

    it('uses Warning severity for WARN-mode hooks', async () => {
        const evaluateRule = vi.fn().mockReturnValue(passingEvaluation());

        await previewGuardHooks(
            {
                listHooksDetailed: () => Promise.resolve([hook({ failureMode: 'WARN' })]),
                fetchRuleContent: () => Promise.resolve('rule r { ... }'),
                evaluateRule,
            },
            '{}',
        );

        expect(evaluateRule).toHaveBeenCalledWith(expect.objectContaining({ severity: DiagnosticSeverity.Warning }));
        expect((evaluateRule.mock.calls[0][0] as { data: string }).data).toContain('HookContext');
    });

    it('captures an error per hook without failing the whole preview', async () => {
        const evaluateRule = vi.fn();

        const result = await previewGuardHooks(
            {
                listHooksDetailed: () => Promise.resolve([hook()]),
                fetchRuleContent: () => Promise.reject(new Error('S3 access denied')),
                evaluateRule,
            },
            '{}',
        );

        expect(result.hooks[0].valid).toBe(false);
        expect(result.hooks[0].error).toContain('S3 access denied');
        expect(evaluateRule).not.toHaveBeenCalled();
    });

    it('returns no entries when there are no previewable hooks', async () => {
        const result = await previewGuardHooks(
            {
                listHooksDetailed: () => Promise.resolve([hook({ configured: false })]),
                fetchRuleContent: vi.fn(),
                evaluateRule: vi.fn(),
            },
            '{}',
        );

        expect(result.hooks).toEqual([]);
    });

    it('reports a hook whose rule does not compile instead of a clean pass', async () => {
        const result = await previewGuardHooks(
            {
                listHooksDetailed: () => Promise.resolve([hook()]),
                fetchRuleContent: () => Promise.resolve('rule R { unbalanced'),
                evaluateRule: () => ({
                    valid: false,
                    parseErrors: ["Unclosed '{' in the Guard rule"],
                    violations: [],
                }),
            },
            '{}',
        );

        expect(result.hooks[0].valid).toBe(false);
        expect(result.hooks[0].violations).toEqual([]);
        expect(result.hooks[0].error).toContain("Unclosed '{'");
    });

    it('fetches shared rule content once across hooks', async () => {
        const fetchRuleContent = vi.fn().mockResolvedValue('rule r { ... }');

        await previewGuardHooks(
            {
                listHooksDetailed: () =>
                    Promise.resolve([
                        hook({ typeName: 'Private::Guard::A', ruleUri: 's3://b/shared.guard' }),
                        hook({ typeName: 'Private::Guard::B', ruleUri: 's3://b/shared.guard' }),
                    ]),
                fetchRuleContent,
                evaluateRule: () => passingEvaluation(),
            },
            '{}',
        );

        expect(fetchRuleContent).toHaveBeenCalledOnce();
    });

    it('previews against a real GuardEngine and a multi-resource template', async () => {
        const engine = new GuardEngine();
        const template = [
            'Resources:',
            '  EncryptedBucket:',
            '    Type: AWS::S3::Bucket',
            '    Properties:',
            '      BucketEncryption:',
            '        ServerSideEncryptionConfiguration: []',
            '  PlainBucket:',
            '    Type: AWS::S3::Bucket',
            '    Properties:',
            '      BucketName: plain',
        ].join('\n');
        const ruleContent = [
            "let buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]",
            'rule S3_ENCRYPTED when %buckets !empty {',
            '  %buckets.Properties.BucketEncryption exists',
            "  << bucket can't be unencrypted (see policy) >>",
            '}',
        ].join('\n');

        const result = await previewGuardHooks(
            {
                listHooksDetailed: () => Promise.resolve([hook({ typeName: 'Private::Guard::S3Encryption' })]),
                fetchRuleContent: () => Promise.resolve(ruleContent),
                evaluateRule: (params) => engine.evaluateRule(params),
            },
            template,
        );

        expect(result.hooks).toHaveLength(1);
        expect(result.hooks[0].error).toBeUndefined();
        expect(result.hooks[0].valid).toBe(false);
        expect(result.hooks[0].violations.length).toBeGreaterThan(0);
    });

    it('reports violations at their real line in a formatted JSON template', async () => {
        const engine = new GuardEngine();
        const template = JSON.stringify(
            {
                Resources: {
                    PlainBucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: 'plain' } },
                },
            },
            undefined,
            2,
        );
        const ruleContent = [
            "let buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]",
            'rule S3_ENCRYPTED when %buckets !empty {',
            '  %buckets.Properties.BucketEncryption exists',
            '}',
        ].join('\n');

        const result = await previewGuardHooks(
            {
                listHooksDetailed: () => Promise.resolve([hook({ typeName: 'Private::Guard::S3Encryption' })]),
                fetchRuleContent: () => Promise.resolve(ruleContent),
                evaluateRule: (params) => engine.evaluateRule(params),
            },
            template,
        );

        const violations = result.hooks[0].violations;
        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0].line).toBeGreaterThan(1);
        expect(violations[0].line).toBeLessThanOrEqual(template.split('\n').length);
    });
});
