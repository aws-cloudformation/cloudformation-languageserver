import { describe, expect, it } from 'vitest';
import { buildStackHookContext, buildStackHookInput, PreviewInvocationPoint } from '../../../src/hooks/GuardHookInput';

describe('buildStackHookContext', () => {
    it('models a create operation with the hook identity', () => {
        const context = buildStackHookContext({
            hookTypeName: 'Private::Guard::S3',
            hookTypeVersion: '00001',
            accountId: '123',
        });

        expect(context).toEqual({
            AwsAccountId: '123',
            StackId: '',
            ChangeSetId: '',
            HookTypeName: 'Private::Guard::S3',
            HookTypeVersion: '00001',
            InvocationPoint: PreviewInvocationPoint,
            TargetName: '',
            TargetType: 'STACK',
        });
    });

    it('leaves unknown identity fields empty rather than inventing them', () => {
        const context = buildStackHookContext({ hookTypeName: 'Private::Guard::S3' });

        expect(context.AwsAccountId).toBe('');
        expect(context.HookTypeVersion).toBe('');
        expect(context.StackId).toBe('');
    });
});

describe('buildStackHookInput', () => {
    const context = buildStackHookContext({ hookTypeName: 'Private::Guard::S3', accountId: '123' });

    it('adds HookContext as a top-level key for JSON templates', () => {
        const template = JSON.stringify({ Resources: { B: { Type: 'AWS::S3::Bucket' } } });

        const input = buildStackHookInput(template, context);
        const parsed = JSON.parse(input) as Record<string, unknown>;

        expect(parsed.Resources).toEqual({ B: { Type: 'AWS::S3::Bucket' } });
        expect(parsed.HookContext).toEqual(context);
    });

    it('appends HookContext for YAML templates without rewriting the template', () => {
        const template = [
            'Resources:',
            '  B:',
            '    Type: AWS::S3::Bucket',
            '    Properties:',
            '      Name: !Ref Foo',
        ].join('\n');

        const input = buildStackHookInput(template, context);

        expect(input).toContain('Name: !Ref Foo');
        expect(input).toContain('\nHookContext:');
        expect(input).toContain('  TargetType: "STACK"');
        expect(input.indexOf('Resources:')).toBeLessThan(input.indexOf('HookContext:'));
    });

    it('returns the template unchanged when JSON cannot be parsed', () => {
        const broken = '{ "Resources": ';

        expect(buildStackHookInput(broken, context)).toBe(broken);
    });

    it('appends only the HookContext block for an empty template', () => {
        const input = buildStackHookInput('', context);

        expect(input.startsWith('\nHookContext:')).toBe(true);
        expect(input).toContain('  AwsAccountId: "123"');
        expect(input).toContain('  TargetType: "STACK"');
    });

    it('appends HookContext to a YAML template that has no Resources section', () => {
        const template = 'Description: just a description';

        const input = buildStackHookInput(template, context);

        expect(input).toContain('Description: just a description');
        expect(input).toContain('\nHookContext:');
        expect(input).not.toContain('Resources:');
    });

    it('preserves CRLF in the body but joins the appended block with LF', () => {
        const template = 'Resources:\r\n  B:\r\n    Type: AWS::S3::Bucket\r\n';

        const input = buildStackHookInput(template, context);

        expect(input).toContain('Resources:\r\n  B:\r\n');
        expect(input).toContain('AWS::S3::Bucket\nHookContext:');
        expect(input.endsWith('\r\n')).toBe(false);
    });

    it('leaves a JSON template unchanged when it already declares a top-level HookContext', () => {
        const template = JSON.stringify({ HookContext: 'existing', Resources: {} });

        expect(buildStackHookInput(template, context)).toBe(template);
    });

    it('leaves a YAML template unchanged when it already declares a top-level HookContext', () => {
        const template = 'HookContext: existing\nResources: {}';

        const input = buildStackHookInput(template, context);

        expect(input).toBe(template);
        expect((input.match(/HookContext:/g) ?? []).length).toBe(1);
    });

    it('preserves every line number of a formatted JSON template', () => {
        const template = JSON.stringify(
            { Resources: { Bucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: 'b' } } } },
            undefined,
            2,
        );

        const input = buildStackHookInput(template, context);
        const originalLines = template.split('\n');
        const builtLines = input.split('\n');

        expect(builtLines.length).toBe(originalLines.length);
        for (const [index, line] of originalLines.entries()) {
            if (index > 0) {
                expect(builtLines[index]).toBe(line);
            }
        }
    });

    it('injects HookContext into JSON without a trailing comma when the template has no other keys', () => {
        const input = buildStackHookInput('{}', context);

        expect(JSON.parse(input)).toEqual({ HookContext: context });
    });
});
