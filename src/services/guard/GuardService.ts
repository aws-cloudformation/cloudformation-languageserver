import { performance } from 'perf_hooks';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { SyntaxTreeManager } from '../../context/syntaxtree/SyntaxTreeManager';
import { CloudFormationFileType } from '../../document/Document';
import { DocumentManager } from '../../document/DocumentManager';
import { ServerComponents } from '../../server/ServerComponents';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../../settings/ISettingsSubscriber';
import { DefaultSettings, GuardSettings } from '../../settings/Settings';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { Count, Telemetry } from '../../telemetry/TelemetryDecorator';
import { Closeable } from '../../utils/Closeable';
import { CancellationError, Delayer } from '../../utils/Delayer';
import { extractErrorMessage } from '../../utils/Errors';
import { readFileIfExistsAsync } from '../../utils/File';
import { byteSize } from '../../utils/String';
import { DiagnosticCoordinator } from '../DiagnosticCoordinator';
import { getRulesForPack, getAvailableRulePacks, GuardRuleData } from './GeneratedGuardRules';
import { GuardEngine, GuardViolation, GuardRule } from './GuardEngine';
import { RuleConfiguration } from './RuleConfiguration';

export enum ValidationTrigger {
    OnOpen = 'onOpen',
    OnChange = 'onChange',
    OnSave = 'onSave',
}

/**
 * GuardService provides policy-as-code validation for CloudFormation templates
 * using AWS CloudFormation Guard rules. It follows the same pattern as CfnLintService
 * for consistent integration with the LSP server.
 */
/**
 * Validation queue entry for managing concurrent requests
 */
interface ValidationQueueEntry {
    uri: string;
    content: string;
    timestamp: number;
    resolve: (violations: GuardViolation[]) => void;
    reject: (error: Error) => void;
}

export class GuardService implements SettingsConfigurable, Closeable {
    private static readonly CFN_GUARD_SOURCE = 'cfn-guard';

    private settings: GuardSettings;
    private settingsSubscription?: SettingsSubscription;
    private readonly delayer: Delayer<void>;
    private readonly guardEngine: GuardEngine;
    private readonly ruleConfiguration: RuleConfiguration;
    private readonly log = LoggerFactory.getLogger(GuardService);

    // Track which packs each rule belongs to for proper violation reporting
    private readonly ruleToPacksMap = new Map<string, Set<string>>();

    // Track custom messages from rules files
    private readonly ruleCustomMessages = new Map<string, string>();

    // Cache loaded rules
    private enabledRules: GuardRule[] = [];

    // Validation queuing for concurrent requests
    private readonly validationQueue: ValidationQueueEntry[] = [];
    private readonly activeValidations = new Map<string, Promise<GuardViolation[]>>();
    private isProcessingQueue = false;

    @Telemetry() private readonly telemetry!: ScopedTelemetry;

    constructor(
        private readonly documentManager: DocumentManager,
        private readonly diagnosticCoordinator: DiagnosticCoordinator,
        private readonly syntaxTreeManager: SyntaxTreeManager,
        guardEngine?: GuardEngine,
        ruleConfiguration?: RuleConfiguration,
        delayer?: Delayer<void>,
    ) {
        this.settings = DefaultSettings.diagnostics.cfnGuard;
        this.delayer = delayer ?? new Delayer<void>(this.settings.delayMs);
        this.guardEngine = guardEngine ?? new GuardEngine();
        this.ruleConfiguration = ruleConfiguration ?? new RuleConfiguration();

        // Initialize rule configuration with current settings
        this.ruleConfiguration.updateFromSettings(this.settings);

        // Load initial rules
        this.getEnabledRulesByConfiguration()
            .then((rules) => {
                this.enabledRules = rules;
            })
            .catch((error) => {
                this.log.error(`Failed to load initial rules: ${extractErrorMessage(error)}`);
            });
    }

    /**
     * Configure the GuardService with settings manager
     * Sets up subscription to diagnostics settings changes
     */
    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscription if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        this.settings = settingsManager.getCurrentSettings().diagnostics.cfnGuard;

        // Load rules with current settings
        this.getEnabledRulesByConfiguration()
            .then((rules) => {
                this.enabledRules = rules;
            })
            .catch((error) => {
                this.log.error(`Failed to load rules during configuration: ${extractErrorMessage(error)}`);
            });

        // Subscribe to diagnostics settings changes
        this.settingsSubscription = settingsManager.subscribe('diagnostics', (newDiagnosticsSettings) => {
            this.onSettingsChanged(newDiagnosticsSettings.cfnGuard);
        });
    }

    /**
     * Handle settings changes
     */
    private onSettingsChanged(newSettings: GuardSettings): void {
        const previousSettings = this.settings;
        this.settings = newSettings;

        this.ruleConfiguration.updateFromSettings(newSettings);
        const packListChanged =
            previousSettings.enabledRulePacks.length !== newSettings.enabledRulePacks.length ||
            !previousSettings.enabledRulePacks.every((pack, index) => pack === newSettings.enabledRulePacks[index]);

        const rulesFileChanged = previousSettings.rulesFile !== newSettings.rulesFile;

        if (packListChanged || rulesFileChanged) {
            // Clear maps only when rule configuration actually changes
            this.ruleToPacksMap.clear();
            this.ruleCustomMessages.clear();
            // Preload rules with new settings
            this.getEnabledRulesByConfiguration()
                .then((rules) => {
                    this.enabledRules = rules;
                })
                .catch((error) => {
                    this.log.error(`Failed to preload rules after settings change: ${extractErrorMessage(error)}`);
                });
            this.revalidateAllDocuments();
        }
    }

    /**
     * Re-validate all open documents
     * Note: This is a simplified implementation that doesn't access all documents
     * since DocumentManager doesn't expose a getAllDocuments method.
     * In practice, document validation is triggered by document events.
     */
    private revalidateAllDocuments(): void {
        // Note: We don't have access to all open documents from DocumentManager
        // Document validation will be triggered by normal document events (onChange, onSave, etc.)
    }

    /**
     * Validate a CloudFormation template using Guard rules
     *
     * @param content The template content as a string
     * @param uri The document URI
     * @param forceUseContent If true, always use the provided content (for consistency with CfnLintService)
     */
    @Count({ name: 'validate' })
    async validate(content: string, uri: string, _forceUseContent?: boolean): Promise<void> {
        const fileType = this.documentManager.get(uri)?.cfnFileType;

        if (
            !fileType ||
            fileType === CloudFormationFileType.Other ||
            fileType === CloudFormationFileType.Unknown ||
            fileType === CloudFormationFileType.Empty
        ) {
            this.telemetry.count(`validate.file.${fileType}`, 1);
            // Not a CloudFormation file, publish empty diagnostics to clear any previous issues
            this.publishDiagnostics(uri, []);
            return;
        }

        // Guard doesn't support GitSync deployment files (similar to cfn-lint handling)
        if (fileType === CloudFormationFileType.GitSyncDeployment) {
            this.telemetry.count(`validate.file.${CloudFormationFileType.GitSyncDeployment}`, 1);
            this.publishDiagnostics(uri, []);
            return;
        }

        this.telemetry.count(`validate.file.${CloudFormationFileType.Template}`, 1);

        const startTime = performance.now();
        try {
            // Validate rule configuration against available packs
            const availablePacks = getAvailableRulePacks();
            const validationErrors = this.validateRuleConfiguration(availablePacks);
            if (validationErrors.length > 0) {
                this.log.warn(`Rule configuration errors: ${validationErrors.join(', ')}`);
                // Continue with validation but log the issues
            }

            // Wait for rules to be loaded if they're still loading
            await this.ensureRulesLoaded();

            if (this.enabledRules.length === 0) {
                this.publishDiagnostics(uri, []);
                return;
            }

            // Execute Guard validation with queuing for concurrent requests
            const violations = await this.queueValidation(uri, content, this.enabledRules);

            // Convert violations to LSP diagnostics
            const diagnostics = this.convertViolationsToDiagnostics(uri, violations);

            // Publish diagnostics
            this.publishDiagnostics(uri, diagnostics);
        } catch (error) {
            const errorMessage = extractErrorMessage(error);

            // Check if this is a parsing error - these are common with malformed templates
            // and should be handled more gracefully
            if (errorMessage.includes('Parser Error') || errorMessage.includes('parsing data file')) {
                // Publish empty diagnostics to clear any previous Guard diagnostics
                this.publishDiagnostics(uri, []);
                return;
            }

            // For other errors (WASM issues, timeouts, etc.), log as error and show diagnostic
            this.publishErrorDiagnostics(uri, errorMessage);
        } finally {
            this.telemetry.histogram('validate.duration', (performance.now() - startTime) / byteSize(content), {
                unit: 'ms/byte',
            });
        }
    }

    /**
     * Convert Guard violations to LSP diagnostics
     */
    private convertViolationsToDiagnostics(uri: string, violations: GuardViolation[]): Diagnostic[] {
        // Group violations by location and message to consolidate rules with same fix
        const violationGroups = new Map<
            string,
            {
                violations: GuardViolation[];
                ruleNames: Set<string>;
                message: string;
                location: { line: number; column: number; path?: string };
                severity: DiagnosticSeverity;
            }
        >();

        for (const violation of violations) {
            // Get custom message if available, otherwise use violation message
            const customMessage = this.ruleCustomMessages.get(violation.ruleName);
            const message = customMessage ?? violation.message;

            // Create group key based on location and message
            const groupKey = `${violation.location.line}:${violation.location.column}:${message}`;

            if (!violationGroups.has(groupKey)) {
                violationGroups.set(groupKey, {
                    violations: [],
                    ruleNames: new Set(),
                    message,
                    location: violation.location,
                    severity: violation.severity,
                });
            }

            const group = violationGroups.get(groupKey);
            if (group) {
                group.violations.push(violation);
                group.ruleNames.add(violation.ruleName);
            }
        }

        // Convert groups to diagnostics
        const diagnostics: Diagnostic[] = [];

        for (const group of violationGroups.values()) {
            // Combine rule names with commas
            const combinedRuleName = [...group.ruleNames].sort().join(', ');

            // Try to get precise location from CloudFormation path if available
            const range = this.getViolationRange(uri, group.violations[0]);

            const diagnostic: Diagnostic = {
                severity: group.severity,
                range,
                message: group.message,
                source: GuardService.CFN_GUARD_SOURCE,
                code: combinedRuleName,
            };

            const firstViolation = group.violations[0];
            if (firstViolation.location.path || firstViolation.context) {
                diagnostic.data = {
                    path: firstViolation.location.path,
                    context: firstViolation.context,
                };
            }

            diagnostics.push(diagnostic);
        }

        return diagnostics;
    }

    /**
     * Get precise range for a violation using CloudFormation path resolution
     */
    private getViolationRange(uri: string, violation: GuardViolation): Range {
        // If we have a CloudFormation path, try to resolve it to precise location
        if (violation.location.path && uri) {
            // Try to get just the key part of the key/value pair using syntax tree directly
            const keyRange = this.diagnosticCoordinator.getKeyRangeFromPath(uri, violation.location.path);
            if (keyRange) {
                return keyRange;
            }
        }

        // Fallback to Guard's provided line/column
        const startLine = Math.max(0, violation.location.line - 1);
        const startCharacter = Math.max(0, violation.location.column - 1);

        // Create single-point range as fallback
        return {
            start: { line: startLine, character: startCharacter },
            end: { line: startLine, character: startCharacter },
        };
    }

    /**
     * Validate a document with debouncing and proper trigger handling
     *
     * @param content The document content as a string
     * @param uri The document URI (used as the debouncing key)
     * @param trigger The trigger that initiated this validation request
     * @param forceUseContent If true, always use the provided content (default: false)
     */
    async validateDelayed(
        content: string,
        uri: string,
        trigger: ValidationTrigger,
        forceUseContent: boolean = false,
    ): Promise<void> {
        if (!this.settings.enabled) {
            return;
        }

        switch (trigger) {
            case ValidationTrigger.OnOpen:
            case ValidationTrigger.OnSave: {
                // OnOpen and OnSave are controlled only by guard.enabled
                break;
            }
            case ValidationTrigger.OnChange: {
                if (!this.settings.validateOnChange) {
                    return;
                }
                break;
            }
            default: {
                this.log.warn(`Unknown validation trigger: ${trigger as string}`);
                return;
            }
        }

        // Use delayer for debouncing with proper cancellation handling
        try {
            if (trigger === ValidationTrigger.OnSave) {
                // For save operations: execute immediately (0ms delay)
                await this.delayer.delay(uri, () => this.validate(content, uri, forceUseContent), 0);
            } else {
                // For other triggers: use normal delayed execution
                await this.delayer.delay(uri, () => this.validate(content, uri, forceUseContent));
            }
        } catch (error) {
            // Suppress cancellation errors as they are expected behavior
            if (error instanceof CancellationError) {
                return;
            }
            // For other errors, re-throw to be handled by caller
            throw error;
        }
    }

    /**
     * Publish diagnostics through the diagnostic coordinator
     */
    private publishDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
        this.diagnosticCoordinator
            .publishDiagnostics(GuardService.CFN_GUARD_SOURCE, uri, diagnostics)
            .catch((reason) => {
                this.log.error(`Error publishing Guard diagnostics: ${extractErrorMessage(reason)}`);
            });
    }

    /**
     * Publish error diagnostics when validation fails
     */
    private publishErrorDiagnostics(uri: string, errorMessage: string): void {
        let friendlyMessage = errorMessage;
        if (errorMessage.includes('WASM')) {
            friendlyMessage = 'Guard validation engine failed to initialize. Please check your configuration.';
        } else if (errorMessage.includes('timeout')) {
            friendlyMessage = 'Guard validation timed out. Consider reducing template size or increasing timeout.';
        } else if (errorMessage.includes('rule')) {
            friendlyMessage = 'Guard rule validation failed. Please check your rule configuration.';
        }

        this.publishDiagnostics(uri, [
            {
                severity: 1, // Error severity
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                },
                message: `Guard Validation Error: ${friendlyMessage}`,
                source: GuardService.CFN_GUARD_SOURCE,
                code: 'GUARD_ERROR',
            },
        ]);
    }

    /**
     * Cancel any pending delayed validation requests for a specific URI
     */
    public cancelDelayedValidation(uri: string): void {
        this.delayer.cancel(uri);
    }

    /**
     * Cancel all pending delayed validation requests
     */
    public cancelAllDelayedValidation(): void {
        this.delayer.cancelAll();
    }

    /**
     * Queue validation request to manage concurrent executions
     */
    private async queueValidation(uri: string, content: string, rules: GuardRule[]): Promise<GuardViolation[]> {
        const existingValidation = this.activeValidations.get(uri);
        if (existingValidation) {
            // Cancel the existing validation and start a new one
            this.activeValidations.delete(uri);
        }

        // If we're under the concurrent limit, execute immediately
        if (this.activeValidations.size < this.settings.maxConcurrentValidations) {
            return await this.executeValidation(uri, content, rules);
        }

        // Otherwise, queue the request
        return await new Promise<GuardViolation[]>((resolve, reject) => {
            const existingIndex = this.validationQueue.findIndex((entry) => entry.uri === uri);
            if (existingIndex !== -1) {
                const existingEntry = this.validationQueue[existingIndex];
                this.validationQueue.splice(existingIndex, 1);
                existingEntry.reject(new Error('Validation cancelled - newer request queued'));
            }

            if (this.validationQueue.length >= this.settings.maxQueueSize) {
                reject(new Error('Validation queue is full. Please try again later.'));
                return;
            }

            this.validationQueue.push({
                uri,
                content,
                timestamp: Date.now(),
                resolve,
                reject,
            });

            // Process queue if not already processing
            void this.processValidationQueue();
        });
    }

    /**
     * Execute validation and track it as active
     */
    private async executeValidation(uri: string, content: string, rules: GuardRule[]): Promise<GuardViolation[]> {
        const defaultSeverity = this.getDefaultSeverity();
        const validationPromise = Promise.resolve(this.guardEngine.validateTemplate(content, rules, defaultSeverity));

        // Track as active validation
        this.activeValidations.set(uri, validationPromise);

        try {
            const result = await validationPromise;
            return result;
        } finally {
            this.activeValidations.delete(uri);

            // Process any queued validations
            void this.processValidationQueue();
        }
    }

    /**
     * Process the validation queue
     */
    private processValidationQueue(): void {
        if (this.isProcessingQueue || this.validationQueue.length === 0) {
            return;
        }

        if (this.activeValidations.size >= this.settings.maxConcurrentValidations) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            while (
                this.validationQueue.length > 0 &&
                this.activeValidations.size < this.settings.maxConcurrentValidations
            ) {
                const entry = this.validationQueue.shift();
                if (!entry) break;

                const age = Date.now() - entry.timestamp;
                if (age > 30_000) {
                    entry.reject(new Error('Validation request expired'));
                    continue;
                }

                // Execute the validation
                this.executeValidation(entry.uri, entry.content, this.enabledRules)
                    .then(entry.resolve)
                    .catch(entry.reject);
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * Get the number of pending delayed validation requests
     */
    public getPendingValidationCount(): number {
        return this.delayer.getPendingCount();
    }

    /**
     * Get the number of queued validation requests
     */
    public getQueuedValidationCount(): number {
        return this.validationQueue.length;
    }

    /**
     * Get the number of active validation requests
     */
    public getActiveValidationCount(): number {
        return this.activeValidations.size;
    }

    /**
     * Validate rule configuration against available packs
     */
    private validateRuleConfiguration(availablePackNames: string[]): string[] {
        const errors: string[] = [];
        const availablePackSet = new Set(availablePackNames);

        for (const enabledPack of this.settings.enabledRulePacks) {
            if (!availablePackSet.has(enabledPack)) {
                errors.push(`Rule pack '${enabledPack}' is enabled but not available`);
            }
        }

        return errors;
    }

    /**
     * Ensure rules are loaded before validation
     */
    private async ensureRulesLoaded(): Promise<void> {
        if (this.enabledRules.length === 0) {
            this.enabledRules = await this.getEnabledRulesByConfiguration();
        }
    }

    /**
     * Get enabled rules based on current configuration
     */
    private async getEnabledRulesByConfiguration(): Promise<GuardRule[]> {
        const enabledRules: GuardRule[] = [];

        // If rulesFile is specified, load rules from file
        if (this.settings.rulesFile) {
            try {
                const customRules = await this.loadRulesFromFile(this.settings.rulesFile);
                enabledRules.push(...customRules);
                this.log.info(`Loaded ${customRules.length} rules from custom file: ${this.settings.rulesFile}`);
            } catch (error) {
                this.log.error(
                    `Failed to load rules from file '${this.settings.rulesFile}': ${extractErrorMessage(error)}`,
                );
                throw error;
            }
        } else {
            // Use rule packs if no custom rules file is specified
            const enabledPackNames = this.settings.enabledRulePacks;
            this.log.info(`Loading rules from ${enabledPackNames.length} rule packs: ${enabledPackNames.join(', ')}`);

            for (const packName of enabledPackNames) {
                try {
                    const packRules = getRulesForPack(packName);
                    for (const ruleData of packRules) {
                        // Track which packs this rule belongs to
                        if (!this.ruleToPacksMap.has(ruleData.name)) {
                            this.ruleToPacksMap.set(ruleData.name, new Set());
                        }
                        this.ruleToPacksMap.get(ruleData.name)?.add(packName);

                        // Store custom message if available
                        if (ruleData.message) {
                            this.ruleCustomMessages.set(ruleData.name, ruleData.message);
                        }

                        enabledRules.push(this.convertRuleDataToGuardRule(ruleData));
                    }
                } catch (error) {
                    this.log.error(`Failed to get rules for pack '${packName}': ${extractErrorMessage(error)}`);
                }
            }
        }

        return enabledRules;
    }

    /**
     * Load Guard rules from a file
     */
    private async loadRulesFromFile(filePath: string): Promise<GuardRule[]> {
        try {
            const fileContent = await readFileIfExistsAsync(filePath, 'utf8');
            return this.parseRulesFromContent(fileContent, filePath);
        } catch (error) {
            throw new Error(`Failed to read rules file '${filePath}': ${extractErrorMessage(error)}`);
        }
    }

    /**
     * Parse Guard rules from file content
     */
    private parseRulesFromContent(content: string, filePath: string): GuardRule[] {
        // Extract rule names and messages for metadata but keep entire content together
        const ruleNames: string[] = [];

        // Extract rule names
        const ruleMatches = content.matchAll(/^rule\s+([A-Za-z_][A-Za-z0-9_]*)/gm);
        for (const match of ruleMatches) {
            ruleNames.push(match[1]);
        }

        // Extract messages from rule blocks and store them
        const ruleBlockMatches = content.matchAll(
            // eslint-disable-next-line security/detect-unsafe-regex
            /^rule\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:when\s+[^{]+)?\s*\{([\s\S]*?)^\}/gm,
        );
        for (const match of ruleBlockMatches) {
            const ruleName = match[1];
            const ruleContent = match[0];
            const extractedMessage = GuardEngine.extractRuleMessage(ruleContent);
            if (extractedMessage) {
                this.ruleCustomMessages.set(ruleName, extractedMessage);
            }
        }

        if (ruleNames.length === 0) {
            this.log.warn(`No valid rules found in file '${filePath}'`);
        }

        // Return single rule with entire content to preserve variable definitions
        return [
            {
                name:
                    ruleNames.length > 0
                        ? ruleNames.join(',')
                        : `rules-from-${
                              filePath
                                  .split('/')
                                  .pop()
                                  ?.replace(/\.[^.]*$/, '') ?? 'file'
                          }`,
                content: content,
                description: `Rules: ${ruleNames.join(', ')} from ${filePath}`,
                severity: this.getDefaultSeverity(),
                tags: ['custom', 'file'],
                pack: 'custom',
                message: undefined,
            },
        ];
    }

    /**
     * Parse a single rule block
     */
    private parseRuleBlock(ruleName: string, fullRuleContent: string): GuardRule | null {
        // Extract message from rule content if available
        const extractedMessage = GuardEngine.extractRuleMessage(fullRuleContent);

        const description = `Custom rule ${ruleName}`;
        const message = extractedMessage ?? undefined; // Let Guard engine handle default messaging

        return {
            name: ruleName,
            content: fullRuleContent,
            description,
            severity: this.getDefaultSeverity(),
            tags: ['custom', 'file'],
            pack: 'custom',
            message,
        };
    }

    /**
     * Convert GuardRuleData to GuardRule format expected by GuardEngine
     */
    private convertRuleDataToGuardRule(ruleData: GuardRuleData): GuardRule {
        return {
            name: ruleData.name,
            content: ruleData.content,
            description: ruleData.description,
            severity: DiagnosticSeverity.Error, // All generated rules are errors
            tags: ['aws', 'cloudformation'], // All generated rules have these tags
            pack: 'generated', // All rules are from generated data
            message: ruleData.message,
        };
    }

    /**
     * Convert severity string to DiagnosticSeverity enum
     */
    private convertSeverityStringToDiagnosticSeverity(severity: string): DiagnosticSeverity {
        switch (severity.toUpperCase()) {
            case 'ERROR': {
                return DiagnosticSeverity.Error;
            }
            case 'WARNING': {
                return DiagnosticSeverity.Warning;
            }
            case 'INFO': {
                return DiagnosticSeverity.Information;
            }
            case 'HINT': {
                return DiagnosticSeverity.Hint;
            }
            default: {
                return DiagnosticSeverity.Error;
            }
        }
    }

    /**
     * Shutdown the Guard service and clean up resources
     */
    close(): void {
        // Unsubscribe from settings changes
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }

        // Cancel all pending delayed requests
        this.delayer.cancelAll();

        // Clear validation queue
        for (const entry of this.validationQueue) {
            entry.reject(new Error('GuardService is shutting down'));
        }
        this.validationQueue.length = 0;

        // Clear active validations (don't wait for them to complete)
        this.activeValidations.clear();
    }

    /**
     * Convert settings severity string to DiagnosticSeverity enum
     */
    private getDefaultSeverity(): DiagnosticSeverity {
        switch (this.settings.defaultSeverity) {
            case 'error': {
                return DiagnosticSeverity.Error;
            }
            case 'warning': {
                return DiagnosticSeverity.Warning;
            }
            case 'information': {
                return DiagnosticSeverity.Information;
            }
            case 'hint': {
                return DiagnosticSeverity.Hint;
            }
            default: {
                return DiagnosticSeverity.Information;
            }
        }
    }

    /**
     * Factory method to create GuardService with dependencies
     */
    static create(
        components: ServerComponents,
        guardEngine?: GuardEngine,
        ruleConfiguration?: RuleConfiguration,
        delayer?: Delayer<void>,
    ): GuardService {
        return new GuardService(
            components.documentManager,
            components.diagnosticCoordinator,
            components.syntaxTreeManager,
            guardEngine,
            ruleConfiguration,
            delayer,
        );
    }
}
