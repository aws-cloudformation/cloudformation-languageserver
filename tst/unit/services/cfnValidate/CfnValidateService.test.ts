import type { Diagnostic as CfnValidateDiagnostic, ValidationReport } from '@aws/cloudformation-validate';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { CloudFormationFileType } from '../../../../src/document/Document';
import { LintResult } from '../../../../src/services/cfnLint/LintResultObserver';
import { CfnValidateEngine } from '../../../../src/services/cfnValidate/CfnValidateEngine';
import { CfnValidateService } from '../../../../src/services/cfnValidate/CfnValidateService';
import { DefaultSettings, Settings } from '../../../../src/settings/Settings';
import { TelemetryService } from '../../../../src/telemetry/TelemetryService';
import { createMockSettingsManager } from '../../../utils/MockServerComponents';
import { flushAllPromises } from '../../../utils/Utils';

const TEMPLATE_URI = 'file:///workspace/template.yaml';
const TEMPLATE_CONTENT = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket\n';

function cfnLintDiagnostic(code: string, line: number): Diagnostic {
    return {
        code,
        source: 'cfn-lint',
        severity: DiagnosticSeverity.Error,
        message: `${code} at ${line}`,
        range: { start: { line, character: 0 }, end: { line, character: 5 } },
    };
}

function validateDiagnostic(ruleId: string, oneBasedLine: number): CfnValidateDiagnostic {
    return {
        ruleId,
        severity: 'ERROR',
        message: `${ruleId} at ${oneBasedLine}`,
        source: 'CFN_LINT',
        startLine: oneBasedLine,
        startColumn: 1,
        endLine: oneBasedLine,
        endColumn: 6,
    };
}

function report(diagnostics: CfnValidateDiagnostic[]): ValidationReport {
    return { diagnostics } as unknown as ValidationReport;
}

function lintResult(overrides: Partial<LintResult> = {}): LintResult {
    return {
        uri: TEMPLATE_URI,
        content: TEMPLATE_CONTENT,
        fileType: CloudFormationFileType.Template,
        diagnostics: [],
        ...overrides,
    };
}

function settingsWithCfnLint(cfnLintOverrides: Partial<Settings['diagnostics']['cfnLint']>): Settings {
    const settings = structuredClone(DefaultSettings) as Settings;
    settings.diagnostics.cfnLint = { ...settings.diagnostics.cfnLint, ...cfnLintOverrides };
    return settings;
}

describe('CfnValidateService', () => {
    let engine: StubbedInstance<CfnValidateEngine>;
    let telemetry: { count: Mock; error: Mock; histogram: Mock; measure: Mock };
    let service: CfnValidateService;

    type Mock = ReturnType<typeof vi.fn>;

    beforeEach(() => {
        telemetry = {
            count: vi.fn(),
            error: vi.fn(),
            histogram: vi.fn(),
            measure: vi.fn((_name: string, fn: () => unknown) => fn()),
        };
        vi.spyOn(TelemetryService, 'instance', 'get').mockReturnValue({ get: () => telemetry } as never);

        engine = stubInterface<CfnValidateEngine>();
        engine.initialize.resolves();
        engine.isInitialized.returns(false);
        engine.validate.returns(report([]));

        service = new CfnValidateService(engine);
    });

    afterEach(() => {
        service.close();
        vi.restoreAllMocks();
    });

    describe('onLintResult', () => {
        test.each([
            CloudFormationFileType.GitSyncDeployment,
            CloudFormationFileType.Other,
            CloudFormationFileType.Unknown,
            CloudFormationFileType.Empty,
        ])('ignores %s files', async (fileType) => {
            service.onLintResult(lintResult({ fileType }));
            await flushAllPromises();

            expect(engine.initialize.called).toBe(false);
            expect(engine.validate.called).toBe(false);
            expect(telemetry.count).not.toHaveBeenCalled();
        });

        test('validates the exact content cfn-lint linted with a warning floor by default', async () => {
            service.onLintResult(lintResult());
            await flushAllPromises();

            expect(engine.validate.calledOnceWith(TEMPLATE_CONTENT, TEMPLATE_URI, { severityLevel: 'WARN' })).toBe(
                true,
            );
        });

        test('emits only the comparison count when both tools agree', async () => {
            engine.validate.returns(report([validateDiagnostic('E3012', 3)]));

            service.onLintResult(lintResult({ diagnostics: [cfnLintDiagnostic('E3012', 2)] }));
            await flushAllPromises();

            expect(telemetry.count).toHaveBeenCalledWith('comparison.count', 1);
            expect(telemetry.count).not.toHaveBeenCalledWith(
                'comparison.ruleIdMismatch',
                expect.anything(),
                expect.anything(),
            );
            expect(telemetry.count).not.toHaveBeenCalledWith(
                'comparison.locationMismatch',
                expect.anything(),
                expect.anything(),
            );
        });

        test('emits a rule id mismatch per rule attributed to the tool that reported it', async () => {
            engine.validate.returns(report([validateDiagnostic('W9003', 3), validateDiagnostic('W9003', 8)]));

            service.onLintResult(lintResult({ diagnostics: [cfnLintDiagnostic('E3012', 2)] }));
            await flushAllPromises();

            expect(telemetry.count).toHaveBeenCalledWith('comparison.ruleIdMismatch', 1, {
                attributes: { onlyIn: 'cfn-lint', ruleId: 'E3012' },
            });
            expect(telemetry.count).toHaveBeenCalledWith('comparison.ruleIdMismatch', 2, {
                attributes: { onlyIn: 'cloudformation-validate', ruleId: 'W9003' },
            });
        });

        test('emits a location mismatch per rule when both tools report it on different lines', async () => {
            engine.validate.returns(report([validateDiagnostic('E3012', 9)]));

            service.onLintResult(lintResult({ diagnostics: [cfnLintDiagnostic('E3012', 2)] }));
            await flushAllPromises();

            expect(telemetry.count).toHaveBeenCalledWith('comparison.locationMismatch', 1, {
                attributes: { ruleId: 'E3012' },
            });
            expect(telemetry.count).not.toHaveBeenCalledWith(
                'comparison.ruleIdMismatch',
                expect.anything(),
                expect.anything(),
            );
        });

        test('initializes the engine once across lint results', async () => {
            service.onLintResult(lintResult());
            service.onLintResult(lintResult({ uri: 'file:///workspace/other.yaml' }));
            await flushAllPromises();

            expect(engine.initialize.calledOnce).toBe(true);
            expect(engine.validate.calledTwice).toBe(true);
            expect(telemetry.count).toHaveBeenCalledWith('init.success', 1);
            expect(telemetry.histogram).toHaveBeenCalledWith('init.duration', expect.any(Number), { unit: 'ms' });
        });

        test('reports an initialization failure once and skips every later comparison', async () => {
            const failure = new Error('wasm unavailable');
            engine.initialize.rejects(failure);

            service.onLintResult(lintResult());
            await flushAllPromises();
            service.onLintResult(lintResult());
            await flushAllPromises();

            expect(engine.initialize.calledOnce).toBe(true);
            expect(telemetry.error).toHaveBeenCalledExactlyOnceWith('init.fault', failure, undefined, {
                captureErrorAttributes: true,
            });
            expect(engine.validate.called).toBe(false);
            expect(telemetry.count).not.toHaveBeenCalledWith('comparison.count', 1);
        });

        test('reports a validation failure as an error metric without throwing', async () => {
            const failure = new Error('engine panic');
            engine.validate.throws(failure);

            expect(() => service.onLintResult(lintResult())).not.toThrow();
            await flushAllPromises();

            expect(telemetry.count).toHaveBeenCalledWith('validate.count', 1);
            expect(telemetry.error).toHaveBeenCalledWith('validate.error', failure, undefined, {
                captureErrorAttributes: true,
            });
            expect(telemetry.count).not.toHaveBeenCalledWith('comparison.count', 1);
        });

        test('does nothing after the service is closed', async () => {
            service.close();

            service.onLintResult(lintResult());
            await flushAllPromises();

            expect(engine.initialize.called).toBe(false);
        });
    });

    describe('cfn-lint settings alignment', () => {
        test('raises the floor to informational when cfn-lint includes informational checks', async () => {
            service.configure(createMockSettingsManager(settingsWithCfnLint({ includeChecks: ['I'] })));

            service.onLintResult(lintResult());
            await flushAllPromises();

            expect(engine.validate.calledOnceWith(TEMPLATE_CONTENT, TEMPLATE_URI, { severityLevel: 'INFO' })).toBe(
                true,
            );
        });

        test('drops validator findings for rules cfn-lint was told to ignore', async () => {
            service.configure(createMockSettingsManager(settingsWithCfnLint({ ignoreChecks: ['W', 'E3012'] })));
            engine.validate.returns(
                report([
                    validateDiagnostic('W9003', 3),
                    validateDiagnostic('E3012', 4),
                    validateDiagnostic('E1001', 1),
                ]),
            );

            service.onLintResult(lintResult());
            await flushAllPromises();

            expect(telemetry.count).toHaveBeenCalledWith('comparison.ruleIdMismatch', 1, {
                attributes: { onlyIn: 'cloudformation-validate', ruleId: 'E1001' },
            });
            expect(telemetry.count).not.toHaveBeenCalledWith('comparison.ruleIdMismatch', expect.anything(), {
                attributes: { onlyIn: 'cloudformation-validate', ruleId: 'W9003' },
            });
            expect(telemetry.count).not.toHaveBeenCalledWith('comparison.ruleIdMismatch', expect.anything(), {
                attributes: { onlyIn: 'cloudformation-validate', ruleId: 'E3012' },
            });
        });

        test('follows cfn-lint settings changes published after configuration', async () => {
            const settingsManager = createMockSettingsManager();
            let onDiagnosticsChanged: ((settings: Settings['diagnostics']) => void) | undefined;
            settingsManager.subscribe.callsFake((_path, observer) => {
                onDiagnosticsChanged = observer;
                return { unsubscribe: vi.fn(), isActive: () => true };
            });
            service.configure(settingsManager);

            onDiagnosticsChanged?.(settingsWithCfnLint({ includeChecks: ['I3011'] }).diagnostics);
            service.onLintResult(lintResult());
            await flushAllPromises();

            expect(engine.validate.calledOnceWith(TEMPLATE_CONTENT, TEMPLATE_URI, { severityLevel: 'INFO' })).toBe(
                true,
            );
        });

        test('unsubscribes from settings on close', () => {
            const unsubscribe = vi.fn();
            const settingsManager = createMockSettingsManager();
            settingsManager.subscribe.returns({ unsubscribe, isActive: () => true });
            service.configure(settingsManager);

            service.close();

            expect(unsubscribe).toHaveBeenCalledOnce();
            expect(engine.close.calledOnce).toBe(true);
        });
    });

    test('reports whether the engine is initialized', () => {
        engine.isInitialized.returns(true);

        expect(service.isInitialized()).toBe(true);
    });
});
