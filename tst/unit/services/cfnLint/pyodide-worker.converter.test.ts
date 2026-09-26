import { describe, expect, test } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { convertPythonResultToDiagnostics } from '../../../../src/services/cfnLint/pyodide-worker';

const TEST_URI = 'file:///template.yaml';

const FINDING = JSON.stringify([
    {
        Filename: '/tmp/template.yaml',
        Id: 'id-1',
        ParentId: null,
        Level: 'Warning',
        Message: 'Test warning',
        Rule: {
            Id: 'W3001',
            Source: 'https://docs.aws.amazon.com/cfn-lint/rules/W3001',
        },
        Location: {
            Start: { LineNumber: 3, ColumnNumber: 5 },
            End: { LineNumber: 3, ColumnNumber: 10 },
            Path: ['Resources', 'MyBucket'],
        },
    },
]);

describe('convertPythonResultToDiagnostics', () => {
    test('converts a valid JSON string from the Python linter to LSP diagnostics', () => {
        const result = convertPythonResultToDiagnostics(FINDING, TEST_URI);
        expect(result).toHaveLength(1);
        expect(result[0].uri).toBe(TEST_URI);
        expect(result[0].diagnostics).toHaveLength(1);
        expect(result[0].diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
        expect(result[0].diagnostics[0].code).toBe('W3001');
        expect(result[0].diagnostics[0].codeDescription).toEqual({
            href: 'https://docs.aws.amazon.com/cfn-lint/rules/W3001',
        });
    });

    test('throws TypeError when result is not a string', () => {
        expect(() => convertPythonResultToDiagnostics({ toJs: () => [] }, TEST_URI)).toThrow(TypeError);
        expect(() => convertPythonResultToDiagnostics({ toJs: () => [] }, TEST_URI)).toThrow(
            'Expected a JSON string from Python linting',
        );
    });

    test('throws an Error when result is not valid JSON', () => {
        expect(() => convertPythonResultToDiagnostics('not json', TEST_URI)).toThrow(
            'Failed to parse cfn-lint output from Pyodide',
        );
    });

    test('returns empty array for an empty findings list', () => {
        const result = convertPythonResultToDiagnostics('[]', TEST_URI);
        expect(result).toEqual([]);
    });
});
