import { spawn, type ChildProcess } from 'child_process';
import { Readable } from 'stream';
import { describe, expect, beforeEach, vi, test } from 'vitest';
import { LocalCfnLintExecutor } from '../../../../src/services/cfnLint/LocalCfnLintExecutor';
import { CloudFormationFileType } from '../../../../src/document/Document';

vi.mock('child_process', async () => {
    const childProcess = await vi.importActual<typeof import('child_process')>('child_process');
    return { ...childProcess, spawn: vi.fn() };
});

const mockFilePath = 'test.yaml';
const mockUri = 'file:///test.yaml';
const mockCfnLintPath = '/usr/local/bin/cfn-lint';

/**
 * Creates a mock ChildProcess that emits data on stdout/stderr then closes with the given exit code.
 */
function createMockChildProcess(exitCode: number | null, stdout: string, stderr: string = ''): ChildProcess {
    const stdoutStream = new Readable({ read() {} });
    const stderrStream = new Readable({ read() {} });
    const handlers = new Map<string, (...args: unknown[]) => void>();

    const child = {
        stdout: stdoutStream,
        stderr: stderrStream,
        on(event: string, handler: (...args: unknown[]) => void) {
            handlers.set(event, handler);
            return child;
        },
    } as unknown as ChildProcess;

    setImmediate(() => {
        if (stdout) stdoutStream.push(stdout);
        stdoutStream.push(null);
        if (stderr) stderrStream.push(stderr);
        stderrStream.push(null);
        handlers.get('close')?.(exitCode);
    });

    return child;
}

/**
 * Returns a JSON string representing a single cfn-lint diagnostic.
 */
function makeDiagnosticJson(ruleId: string, level: string): string {
    return JSON.stringify([
        {
            Filename: mockFilePath,
            Id: 'test-id',
            Level: level,
            Location: {
                Start: { LineNumber: 1, ColumnNumber: 1 },
                End: { LineNumber: 1, ColumnNumber: 10 },
                Path: ['Resources', 'TestResource'],
            },
            Message: 'Test diagnostic',
            Rule: {
                Id: ruleId,
                Description: 'Test rule description',
                Source: 'https://example.com',
            },
        },
    ]);
}

const errorDiagnosticsJson = makeDiagnosticJson('E1001', 'Error');
const warningDiagnosticsJson = makeDiagnosticJson('W8001', 'Warning');
const infoDiagnosticsJson = makeDiagnosticJson('I4010', 'Info');

describe('LocalCfnLintExecutor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('exit code handling', () => {
        // cfn-lint exit codes are a bitmask (2=error, 4=warning, 8=informational).
        // The executor should parse valid JSON output regardless of the exit code.

        test.each([
            { exitCode: 0, description: 'no issues', stdout: '[]' },
            { exitCode: 2, description: 'error findings', stdout: errorDiagnosticsJson },
            { exitCode: 4, description: 'warning findings', stdout: warningDiagnosticsJson },
            { exitCode: 6, description: 'errors + warnings', stdout: errorDiagnosticsJson },
            { exitCode: 8, description: 'informational findings', stdout: infoDiagnosticsJson },
            { exitCode: 10, description: 'errors + informational', stdout: errorDiagnosticsJson },
            { exitCode: 12, description: 'warnings + informational', stdout: warningDiagnosticsJson },
            { exitCode: 14, description: 'all severity levels', stdout: errorDiagnosticsJson },
        ])('should parse diagnostics from exit code $exitCode ($description)', async ({ exitCode, stdout }) => {
            vi.mocked(spawn).mockReturnValue(
                createMockChildProcess(exitCode, stdout) as unknown as ReturnType<typeof spawn>,
            );

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });

        test('should reject when stdout is not valid JSON', async () => {
            vi.mocked(spawn).mockReturnValue(
                createMockChildProcess(1, 'not json', 'Internal error') as unknown as ReturnType<typeof spawn>,
            );

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            await expect(executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template)).rejects.toThrow(
                'cfn-lint exited with code 1',
            );
        });

        test('should return empty diagnostics when stdout is empty', async () => {
            vi.mocked(spawn).mockReturnValue(
                createMockChildProcess(0, '') as unknown as ReturnType<typeof spawn>,
            );

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result).toEqual([]);
        });

        test('should map informational level to Information severity', async () => {
            vi.mocked(spawn).mockReturnValue(
                createMockChildProcess(8, infoDiagnosticsJson) as unknown as ReturnType<typeof spawn>,
            );

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result).toHaveLength(1);
            expect(result[0].diagnostics).toHaveLength(1);
            expect(result[0].diagnostics[0].code).toBe('I4010');
        });

        test('should map warning level to Warning severity', async () => {
            vi.mocked(spawn).mockReturnValue(
                createMockChildProcess(4, warningDiagnosticsJson) as unknown as ReturnType<typeof spawn>,
            );

            const executor = new LocalCfnLintExecutor(mockCfnLintPath);
            const result = await executor.lintFile(mockFilePath, mockUri, CloudFormationFileType.Template);

            expect(result).toHaveLength(1);
            expect(result[0].diagnostics).toHaveLength(1);
            expect(result[0].diagnostics[0].code).toBe('W8001');
        });
    });
});
