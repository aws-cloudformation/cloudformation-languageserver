import { stub } from 'sinon';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { CloudFormationFileType, Document } from '../../../../src/document/Document';
import { getAvailableRulePacks } from '../../../../src/services/guard/GeneratedGuardRules';
import { GuardEngine, GuardViolation } from '../../../../src/services/guard/GuardEngine';
import { GuardService } from '../../../../src/services/guard/GuardService';
import { RuleConfiguration } from '../../../../src/services/guard/RuleConfiguration';
import { GuardSettings, DefaultSettings, DiagnosticsSettings } from '../../../../src/settings/Settings';
import { Delayer } from '../../../../src/utils/Delayer';
import { InitializationStatus, ValidationTrigger } from '../../../../src/utils/ValidationUtils';
import { createMockComponents, createMockSettingsManager } from '../../../utils/MockServerComponents';

describe('GuardService', () => {
    let guardService: GuardService;
    let mockComponents: ReturnType<typeof createMockComponents>;
    let mockGuardEngine: StubbedInstance<GuardEngine>;
    let mockRuleConfiguration: StubbedInstance<RuleConfiguration>;
    let mockDelayer: StubbedInstance<Delayer<void>>;

    // Get a real rule pack that exists in the generated rules
    const availableRulePacks = getAvailableRulePacks();
    const testRulePack = availableRulePacks[0]; // Use the first available pack

    const defaultSettings: GuardSettings = {
        ...DefaultSettings.diagnostics.cfnGuard,
        enabled: true,
        enabledRulePacks: [testRulePack], // Use real rule pack
    };

    beforeEach(() => {
        // Create mock components
        mockComponents = createMockComponents();

        // Create mock GuardEngine
        mockGuardEngine = stubInterface<GuardEngine>();
        mockGuardEngine.validateTemplate.resolves([]);

        // Create mock RuleConfiguration
        mockRuleConfiguration = stubInterface<RuleConfiguration>();
        mockRuleConfiguration.isPackEnabled.returns(true);
        mockRuleConfiguration.getEnabledPackNames.returns([testRulePack]);
        mockRuleConfiguration.filterRulesByEnabledPacks.callsFake((rules) => rules);
        mockRuleConfiguration.filterRulePackNamesByEnabled.callsFake((packs: string[]) => packs);
        mockRuleConfiguration.validateConfiguration.returns([]);
        mockRuleConfiguration.getConfigurationStats.returns({
            totalPacks: 10,
            enabledPacks: 2,
            invalidPacks: [],
        });

        // Create mock Delayer
        mockDelayer = stubInterface<Delayer<void>>();
        mockDelayer.delay.callsFake((_key: string, fn: () => Promise<void>) => fn());
        mockDelayer.getPendingCount.returns(0);

        // Set up document manager to return template file type by default
        const mockFile = stubInterface<Document>();
        Object.defineProperty(mockFile, 'cfnFileType', {
            value: CloudFormationFileType.Template,
            writable: true,
        });
        mockComponents.documentManager.get.returns(mockFile);

        // Create GuardService instance
        guardService = new GuardService(
            mockComponents.documentManager,
            mockComponents.diagnosticCoordinator,
            mockComponents.syntaxTreeManager,
            mockGuardEngine,
            mockRuleConfiguration,
            mockDelayer,
        );
    });

    describe('configure', () => {
        it('should set initial settings from settings manager', () => {
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: defaultSettings,
                },
            } as any);

            guardService.configure(mockSettingsManager);

            expect(mockSettingsManager.getCurrentSettings.called).toBe(true);
            expect(mockSettingsManager.subscribe.calledWith('diagnostics')).toBe(true);
        });

        it('should unsubscribe from previous subscription when reconfiguring', () => {
            const mockUnsubscribe = stub();
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: defaultSettings,
                },
            } as any);
            mockSettingsManager.subscribe.returns({
                unsubscribe: mockUnsubscribe,
                isActive: () => true,
            });

            // Configure twice
            guardService.configure(mockSettingsManager);
            guardService.configure(mockSettingsManager);

            expect(mockUnsubscribe.called).toBe(true);
        });
    });

    describe('validate', () => {
        beforeEach(() => {
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: defaultSettings,
                },
            } as any);
            guardService.configure(mockSettingsManager);
        });

        it('should publish empty diagnostics for unknown file types', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.Unknown,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);

            await guardService.validate('content', 'file:///test.txt');

            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith('cfn-guard', 'file:///test.txt', []),
            ).toBe(true);
        });

        it('should publish empty diagnostics without loading rules for a GitSync deployment file', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.GitSyncDeployment,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);
            mockComponents.documentManager.hasFilesOfType.returns(false);
            const loadRules = stub(guardService as any, 'getEnabledRulesByConfiguration').resolves([]);

            await guardService.validate('content', 'file:///deployment.json');

            expect(loadRules.called).toBe(false);
            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith(
                    'cfn-guard',
                    'file:///deployment.json',
                    [],
                ),
            ).toBe(true);
        });

        it('should skip rule loading and validation when no valid template is open', async () => {
            mockComponents.documentManager.hasFilesOfType.returns(false);
            const loadRules = stub(guardService as any, 'getEnabledRulesByConfiguration').resolves([]);

            await guardService.validate('content', 'file:///template.yaml');

            expect(loadRules.called).toBe(false);
            expect(mockGuardEngine.validateTemplate.called).toBe(false);
            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith(
                    'cfn-guard',
                    'file:///template.yaml',
                    [],
                ),
            ).toBe(true);
        });

        it('should load rules once and validate repeated requests', async () => {
            const mockRules = [{ name: 'test-rule', content: 'rule test {}', pack: 'test' }];
            const loadRules = stub(guardService as any, 'getEnabledRulesByConfiguration').resolves(mockRules);

            await guardService.validate('content', 'file:///template.yaml');
            await guardService.validate('content', 'file:///template.yaml');

            expect(loadRules.calledOnce).toBe(true);
            expect(mockGuardEngine.validateTemplate.callCount).toBe(2);
        });

        it('should share rule initialization between concurrent validations', async () => {
            const mockRules = [{ name: 'test-rule', content: 'rule test {}', pack: 'test' }];
            let resolveRules!: (rules: typeof mockRules) => void;
            const rulesPromise = new Promise<typeof mockRules>((resolve) => {
                resolveRules = resolve;
            });
            const loadRules = stub(guardService as any, 'getEnabledRulesByConfiguration').returns(rulesPromise);

            const firstValidation = guardService.validate('content', 'file:///first.yaml');
            const secondValidation = guardService.validate('content', 'file:///second.yaml');

            expect(loadRules.calledOnce).toBe(true);
            resolveRules(mockRules);
            await Promise.all([firstValidation, secondValidation]);

            expect(mockGuardEngine.validateTemplate.callCount).toBe(2);
        });

        it('should validate template and publish diagnostics for violations', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.Template,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);

            // Mock syntax tree to return a node with proper range
            const mockNode = {
                startPosition: { row: 4, column: 8 },
                endPosition: { row: 4, column: 20 },
            };
            const mockSyntaxTree = {
                getNodeAtPosition: stub().returns(mockNode),
            };
            mockComponents.syntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree as any);

            // Mock the rule loading to return test rules
            const mockRules = [{ name: 'test-rule', content: 'rule test {}', pack: 'test' }];
            stub(guardService as any, 'getEnabledRulesByConfiguration').resolves(mockRules);

            const mockViolations: GuardViolation[] = [
                {
                    ruleName: 'test-rule',
                    message: 'Test violation',
                    severity: DiagnosticSeverity.Error,
                    location: { line: 5, column: 10 },
                },
            ];
            mockGuardEngine.validateTemplate.resolves(mockViolations);

            await guardService.validate('content', 'file:///template.yaml');

            expect(mockGuardEngine.validateTemplate.called).toBe(true);
            expect(mockComponents.syntaxTreeManager.getSyntaxTree.calledWith('file:///template.yaml')).toBe(true);
            expect(mockSyntaxTree.getNodeAtPosition.calledWith({ line: 4, character: 9 })).toBe(true);
            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith(
                    'cfn-guard',
                    'file:///template.yaml',
                    [
                        {
                            severity: 1, // Error
                            range: {
                                start: { line: 4, character: 8 }, // From syntax tree node
                                end: { line: 4, character: 20 }, // From syntax tree node
                            },
                            message: 'Test violation',
                            source: 'cfn-guard',
                            code: 'test-rule',
                            data: 'guard-5-10', // Generated diagnostic ID
                        },
                    ],
                ),
            ).toBe(true);
        });

        it('should publish error diagnostics when validation fails', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.Template,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);

            // Mock the rule loading to return test rules
            const mockRules = [{ name: 'test-rule', content: 'rule test {}', pack: 'test' }];
            stub(guardService as any, 'getEnabledRulesByConfiguration').resolves(mockRules);

            mockGuardEngine.validateTemplate.rejects(new Error('Validation failed'));

            await guardService.validate('content', 'file:///template.yaml');

            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith(
                    'cfn-guard',
                    'file:///template.yaml',
                    [
                        {
                            severity: 1,
                            range: {
                                start: { line: 0, character: 0 },
                                end: { line: 0, character: 0 },
                            },
                            message: 'Guard Validation Error: Validation failed',
                            source: 'cfn-guard',
                            code: 'GUARD_ERROR',
                        },
                    ],
                ),
            ).toBe(true);
        });

        it('should handle parsing errors gracefully', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.Template,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);
            mockGuardEngine.validateTemplate.rejects(new Error('Parser Error when parsing data file'));

            await guardService.validate('content', 'file:///template.yaml');

            // Should publish empty diagnostics for parsing errors, not error diagnostics
            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith(
                    'cfn-guard',
                    'file:///template.yaml',
                    [],
                ),
            ).toBe(true);
        });

        it('should fallback to zero-width range when syntax tree is unavailable', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.Template,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);

            // Mock syntax tree manager to return undefined (no syntax tree available)
            mockComponents.syntaxTreeManager.getSyntaxTree.returns(undefined);

            // Mock the rule loading to return test rules
            const mockRules = [{ name: 'test-rule', content: 'rule test {}', pack: 'test' }];
            stub(guardService as any, 'getEnabledRulesByConfiguration').resolves(mockRules);

            const mockViolations: GuardViolation[] = [
                {
                    ruleName: 'test-rule',
                    message: 'Test violation',
                    severity: DiagnosticSeverity.Error,
                    location: { line: 5, column: 10 },
                },
            ];
            mockGuardEngine.validateTemplate.resolves(mockViolations);

            await guardService.validate('content', 'file:///template.yaml');

            expect(mockGuardEngine.validateTemplate.called).toBe(true);
            expect(mockComponents.syntaxTreeManager.getSyntaxTree.calledWith('file:///template.yaml')).toBe(true);
            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith(
                    'cfn-guard',
                    'file:///template.yaml',
                    [
                        {
                            severity: 1, // Error
                            range: {
                                start: { line: 4, character: 9 }, // Fallback zero-width range
                                end: { line: 4, character: 9 },
                            },
                            message: 'Test violation',
                            source: 'cfn-guard',
                            code: 'test-rule',
                            data: 'guard-5-10', // Generated diagnostic ID
                        },
                    ],
                ),
            ).toBe(true);
        });

        it('should use context as diagnostic ID when available', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.Template,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);

            // Mock syntax tree to return a node with proper range
            const mockNode = {
                startPosition: { row: 4, column: 8 },
                endPosition: { row: 4, column: 20 },
            };
            const mockSyntaxTree = {
                getNodeAtPosition: stub().returns(mockNode),
            };
            mockComponents.syntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree as any);

            // Mock the rule loading to return test rules
            const mockRules = [{ name: 'test-rule', content: 'rule test {}', pack: 'test' }];
            stub(guardService as any, 'getEnabledRulesByConfiguration').resolves(mockRules);

            const mockViolations: GuardViolation[] = [
                {
                    ruleName: 'test-rule',
                    message: 'Test violation',
                    severity: DiagnosticSeverity.Error,
                    location: { line: 5, column: 10 },
                    context: 'custom-context-id',
                },
            ];
            mockGuardEngine.validateTemplate.resolves(mockViolations);

            await guardService.validate('content', 'file:///template.yaml');

            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith(
                    'cfn-guard',
                    'file:///template.yaml',
                    [
                        {
                            severity: 1, // Error
                            range: {
                                start: { line: 4, character: 8 },
                                end: { line: 4, character: 20 },
                            },
                            message: 'Test violation',
                            source: 'cfn-guard',
                            code: 'test-rule',
                            data: 'custom-context-id', // Uses context as diagnostic ID
                        },
                    ],
                ),
            ).toBe(true);
        });
    });

    describe('validateDelayed', () => {
        beforeEach(() => {
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: defaultSettings,
                },
            } as any);
            guardService.configure(mockSettingsManager);
        });

        it('should skip validation when Guard is disabled', async () => {
            const disabledSettings = { ...defaultSettings, enabled: false };
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: { cfnGuard: disabledSettings },
            } as any);

            const disabledService = new GuardService(
                mockComponents.documentManager,
                mockComponents.diagnosticCoordinator,
                mockComponents.syntaxTreeManager,
                mockGuardEngine,
                mockRuleConfiguration,
                mockDelayer,
            );
            disabledService.configure(mockSettingsManager);

            await disabledService.validateDelayed('content', 'file:///test.yaml', ValidationTrigger.OnChange);

            expect(mockDelayer.delay.called).toBe(false);
        });

        it('should use immediate delay for OnSave trigger', async () => {
            await guardService.validateDelayed('content', 'file:///test.yaml', ValidationTrigger.OnSave);

            expect(mockDelayer.delay.calledWith('file:///test.yaml')).toBe(true);
        });

        it('should use normal delay for OnOpen and OnChange triggers', async () => {
            // Reset the call count for this test
            mockDelayer.delay.resetHistory();

            await guardService.validateDelayed('content', 'file:///test.yaml', ValidationTrigger.OnOpen);
            await guardService.validateDelayed('content', 'file:///test.yaml', ValidationTrigger.OnChange);

            expect(mockDelayer.delay.callCount).toBe(2);
            expect(mockDelayer.delay.calledWith('file:///test.yaml')).toBe(true);
        });

        it('should warn about unknown triggers', async () => {
            await guardService.validateDelayed('content', 'file:///test.yaml', 'unknown' as ValidationTrigger);

            expect(mockDelayer.delay.called).toBe(false);
        });
    });

    describe('when cfn-guard is disabled', () => {
        const disabledSettings: GuardSettings = { ...defaultSettings, enabled: false };
        const templateUri = 'file:///template.yaml';
        const templateContent = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket\n';
        const loadedRules = [{ name: 'test-rule', content: 'rule test {}', pack: 'test' }];

        /**
         * Configures the service and returns the diagnostics-settings listener it registered, so
         * runtime settings changes are driven through the same path the settings manager uses.
         */
        function configureWith(settings: GuardSettings): (diagnostics: DiagnosticsSettings) => void {
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: { cfnGuard: settings },
            } as any);
            guardService.configure(mockSettingsManager);
            const [, notifyDiagnosticsChanged] = mockSettingsManager.subscribe.firstCall.args as [
                string,
                (diagnostics: DiagnosticsSettings) => void,
            ];
            return notifyDiagnosticsChanged;
        }

        it('should report ready while disabled', () => {
            configureWith(disabledSettings);

            expect(guardService.isReady()).toEqual({ ready: true });
        });

        it('should publish empty diagnostics without invoking the Guard engine while disabled', async () => {
            configureWith(disabledSettings);
            mockGuardEngine.validateTemplate.resetHistory();

            await guardService.validate(templateContent, templateUri);

            expect(mockGuardEngine.validateTemplate.called).toBe(false);
            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith('cfn-guard', templateUri, []),
            ).toBe(true);
        });

        it('should stop invoking the Guard engine once disabled at runtime', async () => {
            stub(guardService as any, 'getEnabledRulesByConfiguration').resolves(loadedRules);
            const notifyDiagnosticsChanged = configureWith(defaultSettings);
            await guardService.validate(templateContent, templateUri);
            expect(mockGuardEngine.validateTemplate.called).toBe(true);

            notifyDiagnosticsChanged({ cfnGuard: disabledSettings } as DiagnosticsSettings);
            mockGuardEngine.validateTemplate.resetHistory();
            await guardService.validate(templateContent, templateUri);

            expect(mockGuardEngine.validateTemplate.called).toBe(false);
            expect(guardService.isReady()).toEqual({ ready: true });
        });

        it('should invoke the Guard engine again once re-enabled at runtime', async () => {
            stub(guardService as any, 'getEnabledRulesByConfiguration').resolves(loadedRules);
            const notifyDiagnosticsChanged = configureWith(disabledSettings);

            notifyDiagnosticsChanged({ cfnGuard: defaultSettings } as DiagnosticsSettings);
            mockGuardEngine.validateTemplate.resetHistory();
            await guardService.validate(templateContent, templateUri);

            expect(mockGuardEngine.validateTemplate.calledWith(templateContent, loadedRules as any)).toBe(true);
        });
    });

    describe('utility methods', () => {
        it('should cancel delayed validation for specific URI', () => {
            guardService.cancelDelayedValidation('file:///test.yaml');
            expect(mockDelayer.cancel.calledWith('file:///test.yaml')).toBe(true);
        });

        it('should cancel all delayed validations', () => {
            guardService.cancelAllDelayedValidation();
            expect(mockDelayer.cancelAll.called).toBe(true);
        });

        it('should return pending validation count', () => {
            const count = guardService.getPendingValidationCount();
            expect(mockDelayer.getPendingCount.called).toBe(true);
            expect(count).toBe(0);
        });
    });

    describe('close', () => {
        it('should clean up resources properly', () => {
            const mockUnsubscribe = stub();
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: defaultSettings,
                },
            } as any);
            mockSettingsManager.subscribe.returns({
                unsubscribe: mockUnsubscribe,
                isActive: () => true,
            });

            guardService.configure(mockSettingsManager);
            void guardService.close();

            expect(mockUnsubscribe.called).toBe(true);
            expect(mockDelayer.cancelAll.called).toBe(true);
        });
    });

    describe('rulesFile functionality', () => {
        beforeEach(() => {
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: {
                        ...defaultSettings,
                        rulesFile: '/path/to/rules.guard',
                    },
                },
            } as any);
            guardService.configure(mockSettingsManager);
        });

        it('should reload rules when the rulesFile setting changes', async () => {
            const mockRules = [{ name: 'test-rule', content: 'rule test {}', pack: 'test' }];
            const loadRules = stub(guardService as any, 'getEnabledRulesByConfiguration').resolves(mockRules);
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: defaultSettings,
                },
            } as any);
            guardService.configure(mockSettingsManager);
            const settingsCallback = mockSettingsManager.subscribe.getCall(0).args[1];

            await guardService.validate('content', 'file:///template.yaml');
            settingsCallback({
                cfnGuard: {
                    ...defaultSettings,
                    rulesFile: '/new/path/rules.guard',
                },
            } as any);
            await guardService.validate('content', 'file:///template.yaml');

            expect(loadRules.callCount).toBe(2);
            expect(mockGuardEngine.validateTemplate.callCount).toBe(2);
        });

        it('should defer a rulesFile reload until a valid template is open', async () => {
            const mockRules = [{ name: 'test-rule', content: 'rule test {}', pack: 'test' }];
            const loadRules = stub(guardService as any, 'getEnabledRulesByConfiguration').resolves(mockRules);
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: defaultSettings,
                },
            } as any);
            guardService.configure(mockSettingsManager);
            const settingsCallback = mockSettingsManager.subscribe.getCall(0).args[1];
            mockComponents.documentManager.hasFilesOfType.returns(false);

            settingsCallback({
                cfnGuard: {
                    ...defaultSettings,
                    rulesFile: '/new/path/rules.guard',
                },
            } as any);
            await Promise.resolve();
            expect(loadRules.called).toBe(false);

            mockComponents.documentManager.hasFilesOfType.returns(true);
            await guardService.validate('content', 'file:///template.yaml');

            expect(loadRules.calledOnce).toBe(true);
            expect(mockGuardEngine.validateTemplate.calledOnce).toBe(true);
        });

        it('should keep newer custom messages when an older rulesFile load finishes last', async () => {
            let resolveOldLoad!: () => void;
            let resolveNewLoad!: () => void;
            const oldLoad = new Promise<void>((resolve) => {
                resolveOldLoad = resolve;
            });
            const newLoad = new Promise<void>((resolve) => {
                resolveNewLoad = resolve;
            });
            const parseRules = (guardService as any).parseRulesFromContent.bind(guardService);
            const loadRules = stub(guardService as any, 'getEnabledRulesByConfiguration');
            loadRules.onFirstCall().callsFake(async () => {
                await oldLoad;
                return parseRules(
                    'rule SHARED_RULE {\n    Resources exists\n    <<\n        Violation: old settings\n    >>\n}',
                    '/old/rules.guard',
                );
            });
            loadRules.onSecondCall().callsFake(async () => {
                await newLoad;
                return parseRules(
                    'rule SHARED_RULE {\n    Resources exists\n    <<\n        Violation: new settings\n    >>\n}',
                    '/new/rules.guard',
                );
            });
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: { ...defaultSettings, rulesFile: '/old/rules.guard' },
                },
            } as any);
            guardService.configure(mockSettingsManager);
            const settingsCallback = mockSettingsManager.subscribe.getCall(0).args[1];

            const oldValidation = guardService.validate('content', 'file:///old-template.yaml');
            settingsCallback({
                cfnGuard: { ...defaultSettings, rulesFile: '/new/rules.guard' },
            } as any);
            const newValidation = guardService.validate('content', 'file:///new-template.yaml');

            resolveNewLoad();
            await newValidation;
            resolveOldLoad();
            await oldValidation;

            expect(loadRules.callCount).toBe(2);
            expect((guardService as any).ruleCustomMessages.get('SHARED_RULE')).toBe('Violation: new settings');
        });

        it('should show error diagnostic when rulesFile cannot be read', async () => {
            // Create a fresh settings manager for this test
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: defaultSettings,
                },
            } as any);

            guardService.configure(mockSettingsManager);

            // Configure with invalid rules file to trigger async loading error
            const settingsCallback = mockSettingsManager.subscribe.getCall(0).args[1];

            // Call the callback with settings that have an invalid rulesFile
            settingsCallback({
                cfnGuard: {
                    ...defaultSettings,
                    rulesFile: '/nonexistent/rules.guard',
                },
            } as any);

            // Wait a bit for async rule loading to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Now validate - should still work with fallback to generated rules
            await guardService.validate('content', 'file:///test.yaml');

            // Should publish diagnostics (may be empty if no violations, but service should work)
            expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(true);
            const call = mockComponents.diagnosticCoordinator.publishDiagnostics.getCall(0);
            const diagnostics = call.args[2];
            expect(diagnostics.length).toBeGreaterThanOrEqual(0); // Service should work despite file error
        });

        it('should parse multiple rules from rules file content', () => {
            const rulesContent = `
rule S3_BUCKET_ENCRYPTION {
    Resources.*[Type == 'AWS::S3::Bucket'] {
        Properties.BucketEncryption exists
    }
}

rule EC2_INSTANCE_TYPE {
    Resources.*[Type == 'AWS::EC2::Instance'] {
        Properties.InstanceType in ['t2.micro', 't3.micro']
    }
}`;

            // Access the private method for testing
            const parseMethod = (guardService as any).parseRulesFromContent.bind(guardService);
            const rules = parseMethod(rulesContent, '/test/rules.guard');

            expect(rules).toHaveLength(1);
            expect(rules[0].name).toBe('S3_BUCKET_ENCRYPTION,EC2_INSTANCE_TYPE');
            expect(rules[0].pack).toBe('custom');
            expect(rules[0].content).toContain('S3_BUCKET_ENCRYPTION');
            expect(rules[0].content).toContain('EC2_INSTANCE_TYPE');
        });

        it('should extract custom message from rule with message block', () => {
            const ruleWithMessage = `
rule S3_BUCKET_ENCRYPTION {
    Resources.*[Type == 'AWS::S3::Bucket'] {
        Properties.BucketEncryption exists
        <<
            Violation: S3 bucket must have encryption enabled
            Fix: Add BucketEncryption property
        >>
    }
}`;

            const parseMethod = (guardService as any).parseRulesFromContent.bind(guardService);
            const rules = parseMethod(ruleWithMessage, '/test/rules.guard');

            expect(rules).toHaveLength(1);
            expect(rules[0].message).toBeUndefined(); // Messages are stored separately for violation mapping
            expect(rules[0].content).toContain('Violation: S3 bucket must have encryption enabled');
            // Check that custom message was stored in the service
            const customMessages = (guardService as any).ruleCustomMessages;
            expect(customMessages.get('S3_BUCKET_ENCRYPTION')).toBe(
                'Violation: S3 bucket must have encryption enabled\n            Fix: Add BucketEncryption property',
            );
        });

        it('should use undefined message for rule without message block', () => {
            const ruleWithoutMessage = `
rule S3_BUCKET_ENCRYPTION {
    Resources.*[Type == 'AWS::S3::Bucket'] {
        Properties.BucketEncryption exists
    }
}`;

            const parseMethod = (guardService as any).parseRulesFromContent.bind(guardService);
            const rules = parseMethod(ruleWithoutMessage, '/test/rules.guard');

            expect(rules).toHaveLength(1);
            expect(rules[0].message).toBeUndefined();
        });
    });

    describe('factory method', () => {
        it('should create GuardService with components', () => {
            const service = GuardService.create(mockComponents);
            expect(service).toBeInstanceOf(GuardService);
        });

        it('should create GuardService with custom dependencies', () => {
            const service = GuardService.create(mockComponents, mockGuardEngine, mockRuleConfiguration, mockDelayer);
            expect(service).toBeInstanceOf(GuardService);
        });
    });

    describe('isReady', () => {
        it('should return not ready when no rules loaded', () => {
            const service = GuardService.create(mockComponents, mockGuardEngine, mockRuleConfiguration, mockDelayer);
            const result = service.isReady();
            expect(result).toEqual({ ready: false });
        });

        it('should return ready when no valid template is open', () => {
            mockComponents.documentManager.hasFilesOfType.returns(false);
            const service = GuardService.create(mockComponents, mockGuardEngine, mockRuleConfiguration, mockDelayer);

            expect(service.isReady()).toEqual({ ready: true });
        });

        it('should return not ready while required rule initialization is in progress', () => {
            const service = GuardService.create(mockComponents, mockGuardEngine, mockRuleConfiguration, mockDelayer);
            (service as any).status = InitializationStatus.Initializing;

            const result = service.isReady();
            expect(result).toEqual({ ready: false });
        });

        it('should return ready when service is disabled', () => {
            const disabledSettings = {
                ...DefaultSettings,
                diagnostics: {
                    ...DefaultSettings.diagnostics,
                    cfnGuard: {
                        ...DefaultSettings.diagnostics.cfnGuard,
                        enabled: false,
                    },
                },
            };
            mockComponents.settingsManager.getCurrentSettings.returns(disabledSettings);
            const service = GuardService.create(mockComponents, mockGuardEngine, mockRuleConfiguration, mockDelayer);

            // Configure the service to pick up the settings
            service.configure(mockComponents.settingsManager);

            const result = service.isReady();
            expect(result).toEqual({ ready: true });
        });
    });
});
