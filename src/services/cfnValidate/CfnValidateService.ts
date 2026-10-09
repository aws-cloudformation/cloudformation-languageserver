import { performance } from 'perf_hooks';
import type { Diagnostic as CfnValidateDiagnostic, Severity } from '@aws/cloudformation-validate';
import { Diagnostic } from 'vscode-languageserver';
import { CloudFormationFileType } from '../../document/Document';
import { FeatureFlag } from '../../featureFlag/FeatureFlagI';
import { ISettingsSubscriber, SettingsConfigurable, SettingsSubscription } from '../../settings/ISettingsSubscriber';
import { CfnLintSettings, DefaultSettings } from '../../settings/Settings';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { Telemetry } from '../../telemetry/TelemetryDecorator';
import { Closeable } from '../../utils/Closeable';
import { byteSize } from '../../utils/String';
import { LintResult, LintResultObserver } from '../cfnLint/LintResultObserver';
import { toLspDiagnostics } from './CfnValidateDiagnosticConverter';
import { CfnValidateEngine } from './CfnValidateEngine';
import { compareDiagnostics, DiagnosticComparisonResult } from './DiagnosticComparison';

const CFN_LINT_TOOL = 'cfn-lint';
const CFN_VALIDATE_TOOL = 'cloudformation-validate';

export class CfnValidateService implements LintResultObserver, SettingsConfigurable, Closeable {
    private closed = false;
    private validating = false;
    private cfnLintSettings: CfnLintSettings = DefaultSettings.diagnostics.cfnLint;

    private settingsSubscription?: SettingsSubscription;

    @Telemetry() private readonly telemetry!: ScopedTelemetry;
    private readonly log = LoggerFactory.getLogger(CfnValidateService);
    constructor(
        private readonly featureFlag: FeatureFlag,
        private readonly engine: CfnValidateEngine = new CfnValidateEngine(),
    ) {}

    configure(settingsManager: ISettingsSubscriber): void {
        this.settingsSubscription?.unsubscribe();
        this.cfnLintSettings = settingsManager.getCurrentSettings().diagnostics.cfnLint;
        this.settingsSubscription = settingsManager.subscribe('diagnostics', (diagnosticsSettings) => {
            this.cfnLintSettings = diagnosticsSettings.cfnLint;
        });
    }

    // The engine validates one template at a time; a result that arrives while it is busy is skipped
    onLintResult(result: LintResult): void {
        if (
            this.closed ||
            this.validating ||
            result.fileType !== CloudFormationFileType.Template ||
            !this.featureFlag.isEnabled() ||
            this.engine.isFailed()
        ) {
            return;
        }

        this.validating = true;
        void this.compare(result).finally(() => {
            this.validating = false;
        });
    }

    isInitialized(): boolean {
        return this.engine.isInitialized();
    }

    private async compare(result: LintResult): Promise<void> {
        if (!(await this.ensureInitialized()) || this.closed) {
            return;
        }

        const now = performance.now();
        this.telemetry.count('validate.count', 1);
        let report;
        try {
            report = await this.engine.validate(result.content, result.uri, { severityLevel: this.severityLevel() });
        } catch (error) {
            if (!this.closed) {
                this.telemetry.error('validate.error', error, undefined, { captureErrorAttributes: true });
                this.log.warn(error, 'cloudformation-validate failed; comparisons stop until the server restarts');
            }
            return;
        }

        const elapsedMs = performance.now() - now;
        this.telemetry.count('validate.success', 1);
        this.telemetry.histogram('validate.latency', elapsedMs, { unit: 'ms' });
        this.telemetry.histogram('validate.duration', elapsedMs / byteSize(result.content), {
            unit: 'ms/byte',
        });

        const comparison = compareDiagnostics(result.diagnostics, this.withoutIgnoredRules(report.diagnostics));
        this.recordComparison(comparison);
    }

    private async ensureInitialized(): Promise<boolean> {
        if (this.engine.isInitialized()) {
            return true;
        }

        const startTime = performance.now();
        try {
            await this.engine.initialize();
            this.log.info(`cloudformation-validate version: ${this.engine.version()} (initialized)`);
            this.telemetry.count('init.success', 1);
            return true;
        } catch (error) {
            if (!this.closed) {
                this.telemetry.error('init.fault', error, undefined, { captureErrorAttributes: true });
            }
            return false;
        } finally {
            this.telemetry.histogram('init.duration', performance.now() - startTime, { unit: 'ms' });
        }
    }

    /**
     * cfn-lint only reports informational rules when `includeChecks` enables an `I` prefix, so the validator is held
     * to the same floor; otherwise every informational finding would count as a mismatch.
     */
    private severityLevel(): Severity {
        return this.cfnLintSettings.includeChecks.some((check) => check.startsWith('I')) ? 'INFO' : 'WARN';
    }

    /**
     * Rules the user told cfn-lint to ignore (`ignoreChecks` holds rule ids or prefixes) are dropped on the validator
     * side too, since cfn-lint did not report them either.
     */
    private withoutIgnoredRules(validateDiagnostics: readonly CfnValidateDiagnostic[]): Diagnostic[] {
        const ignoreChecks = this.cfnLintSettings.ignoreChecks;
        return toLspDiagnostics(validateDiagnostics).filter(
            (diagnostic) => !ignoreChecks.some((ignored) => String(diagnostic.code).startsWith(ignored)),
        );
    }

    private recordComparison(comparison: DiagnosticComparisonResult): void {
        this.telemetry.count('comparison.count', 1);
        this.recordPerRule('comparison.ruleIdMismatch', comparison.cfnLintOnlyRuleIds, { onlyIn: CFN_LINT_TOOL });
        this.recordPerRule('comparison.ruleIdMismatch', comparison.cfnValidateOnlyRuleIds, {
            onlyIn: CFN_VALIDATE_TOOL,
        });
        this.recordPerRule('comparison.locationMismatch', comparison.locationMismatchRuleIds, {});
    }

    private recordPerRule(metricName: string, ruleIds: readonly string[], attributes: Record<string, string>): void {
        const occurrences = new Map<string, number>();
        for (const ruleId of ruleIds) {
            occurrences.set(ruleId, (occurrences.get(ruleId) ?? 0) + 1);
        }
        for (const [ruleId, count] of occurrences) {
            this.telemetry.count(metricName, count, { attributes: { ...attributes, ruleId } });
        }
    }

    async close(): Promise<void> {
        this.closed = true;
        this.settingsSubscription?.unsubscribe();
        this.settingsSubscription = undefined;
        await this.engine.close();
    }
}
