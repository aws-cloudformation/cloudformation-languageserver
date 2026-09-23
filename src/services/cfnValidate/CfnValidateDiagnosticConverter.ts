import type { Diagnostic as CfnValidateDiagnostic, Severity } from '@aws/cloudformation-validate';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';

export const CFN_VALIDATE_SOURCE = 'cloudformation-validate';

const SEVERITY_TO_LSP: Record<Severity, DiagnosticSeverity> = {
    FATAL: DiagnosticSeverity.Error,
    ERROR: DiagnosticSeverity.Error,
    WARN: DiagnosticSeverity.Warning,
    INFO: DiagnosticSeverity.Information,
    DEBUG: DiagnosticSeverity.Hint,
};

export function toLspDiagnostics(diagnostics: readonly CfnValidateDiagnostic[]): Diagnostic[] {
    return diagnostics.map((diagnostic) => ({
        severity: SEVERITY_TO_LSP[diagnostic.severity],
        range: toLspRange(diagnostic),
        message: diagnostic.message,
        source: CFN_VALIDATE_SOURCE,
        code: diagnostic.ruleId,
    }));
}

/**
 * cloudformation-validate reports 1-based lines and columns; LSP positions are 0-based. Template-level findings carry
 * no location and are anchored at the start of the document, as cfn-lint does.
 */
function toLspRange(diagnostic: CfnValidateDiagnostic): Range {
    const startLine = toZeroBased(diagnostic.startLine);
    const startCharacter = toZeroBased(diagnostic.startColumn);
    return {
        start: { line: startLine, character: startCharacter },
        end: {
            line: Math.max(startLine, toZeroBased(diagnostic.endLine)),
            character: diagnostic.endColumn === undefined ? startCharacter : toZeroBased(diagnostic.endColumn),
        },
    };
}

function toZeroBased(oneBased: number | undefined): number {
    return oneBased === undefined ? 0 : Math.max(0, oneBased - 1);
}
