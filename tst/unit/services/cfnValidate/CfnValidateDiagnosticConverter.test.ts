import type { Diagnostic as CfnValidateDiagnostic } from '@aws/cloudformation-validate';
import { describe, expect, test } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import {
    CFN_VALIDATE_SOURCE,
    toLspDiagnostics,
} from '../../../../src/services/cfnValidate/CfnValidateDiagnosticConverter';

function validateDiagnostic(overrides: Partial<CfnValidateDiagnostic> = {}): CfnValidateDiagnostic {
    return {
        ruleId: 'F3002',
        severity: 'FATAL',
        message: "Additional properties are not allowed ('Foo' was unexpected)",
        source: 'SCHEMA',
        startLine: 6,
        startColumn: 7,
        endLine: 6,
        endColumn: 10,
        ...overrides,
    };
}

describe('toLspDiagnostics', () => {
    test('converts 1-based lines and columns to 0-based LSP positions', () => {
        const [converted] = toLspDiagnostics([validateDiagnostic()]);

        expect(converted.range).toEqual({ start: { line: 5, character: 6 }, end: { line: 5, character: 9 } });
    });

    test('carries the rule id as the code and marks the source', () => {
        const [converted] = toLspDiagnostics([validateDiagnostic({ ruleId: 'W2001', message: 'unused parameter' })]);

        expect(converted.code).toBe('W2001');
        expect(converted.message).toBe('unused parameter');
        expect(converted.source).toBe(CFN_VALIDATE_SOURCE);
    });

    test.each([
        ['FATAL', DiagnosticSeverity.Error],
        ['ERROR', DiagnosticSeverity.Error],
        ['WARN', DiagnosticSeverity.Warning],
        ['INFO', DiagnosticSeverity.Information],
        ['DEBUG', DiagnosticSeverity.Hint],
    ] as const)('maps severity %s to LSP severity %d', (severity, expected) => {
        const [converted] = toLspDiagnostics([validateDiagnostic({ severity })]);

        expect(converted.severity).toBe(expected);
    });

    test('anchors template-level findings without a location at the start of the document', () => {
        const [converted] = toLspDiagnostics([
            validateDiagnostic({
                startLine: undefined,
                startColumn: undefined,
                endLine: undefined,
                endColumn: undefined,
            }),
        ]);

        expect(converted.range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } });
    });

    test('collapses the range to the start position when only the start is known', () => {
        const [converted] = toLspDiagnostics([validateDiagnostic({ endLine: undefined, endColumn: undefined })]);

        expect(converted.range).toEqual({ start: { line: 5, character: 6 }, end: { line: 5, character: 6 } });
    });

    test('clamps a zero column reported for parse errors to the first character', () => {
        const [converted] = toLspDiagnostics([
            validateDiagnostic({ ruleId: 'F1101', startLine: 3, startColumn: 0, endLine: 3, endColumn: 0 }),
        ]);

        expect(converted.range).toEqual({ start: { line: 2, character: 0 }, end: { line: 2, character: 0 } });
    });

    test('converts every finding in order', () => {
        const converted = toLspDiagnostics([
            validateDiagnostic({ ruleId: 'F3002' }),
            validateDiagnostic({ ruleId: 'W9003' }),
        ]);

        expect(converted.map((diagnostic) => diagnostic.code)).toEqual(['F3002', 'W9003']);
    });
});
