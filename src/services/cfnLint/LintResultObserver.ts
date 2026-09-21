import { Diagnostic } from 'vscode-languageserver';
import { CloudFormationFileType } from '../../document/Document';

export interface LintResult {
    readonly uri: string;
    readonly content: string;
    readonly fileType: CloudFormationFileType;
    readonly diagnostics: readonly Diagnostic[];
}

export interface LintResultObserver {
    onLintResult(result: LintResult): void;
}
