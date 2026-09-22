import { describe, expect, test } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { CfnLintDiagnostic, toPublishDiagnostics } from '../../../../src/services/cfnLint/CfnLintDiagnosticConverter';

const TEST_URI = 'file:///template.yaml';

function makeFinding(overrides: Partial<CfnLintDiagnostic> = {}): CfnLintDiagnostic {
    return {
        Filename: '/tmp/template.yaml',
        Level: 'Error',
        Message: 'Test error',
        Rule: {
            Id: 'E1001',
            Description: 'Test rule',
            ShortDescription: 'Short',
            Source: 'https://docs.example.com/E1001',
        },
        Location: {
            Start: { LineNumber: 5, ColumnNumber: 3 },
            End: { LineNumber: 5, ColumnNumber: 15 },
            Path: ['Resources', 'MyBucket'],
        },
        ...overrides,
    };
}

describe('toPublishDiagnostics', () => {
    describe('empty input', () => {
        test('returns empty array for empty findings list', () => {
            expect(toPublishDiagnostics([], TEST_URI)).toEqual([]);
        });

        test('returns empty array for null input', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(toPublishDiagnostics(null as any, TEST_URI)).toEqual([]);
        });
    });

    describe('severity mapping', () => {
        test.each([
            { level: 'Error', expected: DiagnosticSeverity.Error },
            { level: 'Warning', expected: DiagnosticSeverity.Warning },
            { level: 'Informational', expected: DiagnosticSeverity.Information },
            // 'Info' is not emitted by JsonFormatter but is accepted for compatibility
            { level: 'Info', expected: DiagnosticSeverity.Information },
            // Unknown levels default to Information (least alarming)
            { level: 'Unknown', expected: DiagnosticSeverity.Information },
            { level: '', expected: DiagnosticSeverity.Information },
        ])('maps Level "$level" to severity $expected', ({ level, expected }) => {
            const result = toPublishDiagnostics([makeFinding({ Level: level })], TEST_URI);
            expect(result[0].diagnostics[0].severity).toBe(expected);
        });
    });

    describe('range conversion', () => {
        test('converts 1-based cfn-lint line/column to 0-based LSP', () => {
            const finding = makeFinding({
                Location: {
                    Start: { LineNumber: 5, ColumnNumber: 3 },
                    End: { LineNumber: 5, ColumnNumber: 15 },
                    Path: null,
                },
            });
            const result = toPublishDiagnostics([finding], TEST_URI);
            const range = result[0].diagnostics[0].range;
            expect(range.start).toEqual({ line: 4, character: 2 });
            expect(range.end).toEqual({ line: 4, character: 14 });
        });

        test('clamps to 0 when LineNumber or ColumnNumber is missing (uses || 1 fallback)', () => {
            const finding = makeFinding({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Location: { Start: {}, End: {}, Path: null } as any,
            });
            const result = toPublishDiagnostics([finding], TEST_URI);
            const range = result[0].diagnostics[0].range;
            expect(range.start).toEqual({ line: 0, character: 0 });
            expect(range.end).toEqual({ line: 0, character: 0 });
        });

        test('clamps to 0 when LineNumber is 0 (defensive floor guard)', () => {
            const finding = makeFinding({
                Location: {
                    Start: { LineNumber: 0, ColumnNumber: 0 },
                    End: { LineNumber: 0, ColumnNumber: 0 },
                    Path: null,
                },
            });
            const result = toPublishDiagnostics([finding], TEST_URI);
            const range = result[0].diagnostics[0].range;
            // (0 || 1) - 1 = 0; Math.max(0, 0) = 0
            expect(range.start).toEqual({ line: 0, character: 0 });
        });
    });

    describe('codeDescription', () => {
        test('sets codeDescription.href from Rule.Source when present', () => {
            const sourceUrl = 'https://docs.aws.amazon.com/cfn-lint/rules/E1001.html';
            const result = toPublishDiagnostics([makeFinding({ Rule: { ...makeFinding().Rule, Source: sourceUrl } })], TEST_URI);
            expect(result[0].diagnostics[0].codeDescription).toEqual({ href: sourceUrl });
        });

        test('omits codeDescription when Rule.Source is empty string', () => {
            const result = toPublishDiagnostics([makeFinding({ Rule: { ...makeFinding().Rule, Source: '' } })], TEST_URI);
            expect(result[0].diagnostics[0].codeDescription).toBeUndefined();
        });

        test('omits codeDescription when Rule.Source is null', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = toPublishDiagnostics([makeFinding({ Rule: { ...makeFinding().Rule, Source: null as any } })], TEST_URI);
            expect(result[0].diagnostics[0].codeDescription).toBeUndefined();
        });
    });

    describe('message and code fallbacks', () => {
        test('uses fallback message when Message is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = toPublishDiagnostics([makeFinding({ Message: undefined as any })], TEST_URI);
            expect(result[0].diagnostics[0].message).toBe('Unknown cfn-lint error');
        });

        test('uses fallback code when Rule.Id is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = toPublishDiagnostics([makeFinding({ Rule: { ...makeFinding().Rule, Id: undefined as any } })], TEST_URI);
            expect(result[0].diagnostics[0].code).toBe('unknown');
        });
    });

    describe('output shape', () => {
        test('wraps all diagnostics in a single PublishDiagnosticsParams entry for the given uri', () => {
            const findings = [
                makeFinding({ Level: 'Error', Rule: { ...makeFinding().Rule, Id: 'E1001' } }),
                makeFinding({ Level: 'Warning', Rule: { ...makeFinding().Rule, Id: 'W3002' } }),
            ];
            const result = toPublishDiagnostics(findings, TEST_URI);
            expect(result).toHaveLength(1);
            expect(result[0].uri).toBe(TEST_URI);
            expect(result[0].diagnostics).toHaveLength(2);
        });

        test('sets source field to cfn-lint on all diagnostics', () => {
            const result = toPublishDiagnostics([makeFinding()], TEST_URI);
            expect(result[0].diagnostics[0].source).toBe('cfn-lint');
        });

        test('sets code to the rule ID', () => {
            const result = toPublishDiagnostics([makeFinding({ Rule: { ...makeFinding().Rule, Id: 'W4011' } })], TEST_URI);
            expect(result[0].diagnostics[0].code).toBe('W4011');
        });
    });
});
