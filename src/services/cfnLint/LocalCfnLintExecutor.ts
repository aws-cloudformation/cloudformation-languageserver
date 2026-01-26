import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PublishDiagnosticsParams, DiagnosticSeverity } from 'vscode-languageserver';
import { CloudFormationFileType } from '../../document/Document';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';

interface CfnLintDiagnostic {
    Level: string;
    Message: string;
    Rule: {
        Id: string;
        Description: string;
        Source: string;
    };
    Location: {
        Start: {
            LineNumber: number;
            ColumnNumber: number;
        };
        End: {
            LineNumber: number;
            ColumnNumber: number;
        };
        Path: string[];
    };
    Filename: string;
}

export class LocalCfnLintExecutor {
    private readonly log = LoggerFactory.getLogger(LocalCfnLintExecutor);

    constructor(private readonly cfnLintPath: string) {}

    async lintTemplate(
        content: string,
        uri: string,
        fileType: CloudFormationFileType,
    ): Promise<PublishDiagnosticsParams[]> {
        // Write content to temporary file
        const tempFile = join(
            tmpdir(),
            `cfn-lint-${Date.now()}.${fileType === CloudFormationFileType.Template ? 'yaml' : 'json'}`,
        );

        try {
            await writeFile(tempFile, content, 'utf8');
            return await this.lintFile(tempFile, uri, fileType);
        } finally {
            try {
                await unlink(tempFile);
            } catch {
                // Ignore cleanup errors
            }
        }
    }

    async lintFile(
        filePath: string,
        uri: string,
        fileType: CloudFormationFileType,
        workspaceRoot?: string,
    ): Promise<PublishDiagnosticsParams[]> {
        const rawDiagnostics = await this.executeCfnLint(filePath, workspaceRoot);
        return this.convertToLspFormat(rawDiagnostics, uri);
    }

    private async executeCfnLint(filePath: string, workspaceRoot?: string): Promise<CfnLintDiagnostic[]> {
        return await new Promise((resolve, reject) => {
            const args = ['--format', 'json', filePath];
            const child = spawn(this.cfnLintPath, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: workspaceRoot,
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                try {
                    if (code === 0 || code === 2) {
                        // 0 = no issues, 2 = issues found
                        const diagnostics: CfnLintDiagnostic[] = stdout.trim()
                            ? (JSON.parse(stdout) as CfnLintDiagnostic[])
                            : [];
                        resolve(diagnostics);
                    } else {
                        reject(new Error(`cfn-lint exited with code ${code}: ${stderr}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse cfn-lint output: ${extractErrorMessage(error)}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to execute cfn-lint: ${extractErrorMessage(error)}`));
            });
        });
    }

    private convertToLspFormat(diagnostics: CfnLintDiagnostic[], uri: string): PublishDiagnosticsParams[] {
        if (!diagnostics || diagnostics.length === 0) {
            return [];
        }

        const lspDiagnostics = diagnostics.map((item) => ({
            severity: this.convertSeverity(item.Level),
            range: {
                start: {
                    line: Math.max(0, (item.Location?.Start?.LineNumber || 1) - 1),
                    character: Math.max(0, (item.Location?.Start?.ColumnNumber || 1) - 1),
                },
                end: {
                    line: Math.max(0, (item.Location?.End?.LineNumber || 1) - 1),
                    character: Math.max(0, (item.Location?.End?.ColumnNumber || 1) - 1),
                },
            },
            message: item.Message || 'Unknown cfn-lint error',
            source: 'cfn-lint',
            code: item.Rule?.Id || 'unknown',
        }));

        return [{ uri, diagnostics: lspDiagnostics }];
    }

    private convertSeverity(level: string): DiagnosticSeverity {
        switch (level) {
            case 'Error': {
                return DiagnosticSeverity.Error;
            }
            case 'Warning': {
                return DiagnosticSeverity.Warning;
            }
            case 'Info': {
                return DiagnosticSeverity.Information;
            }
            default: {
                return DiagnosticSeverity.Information;
            }
        }
    }
}
