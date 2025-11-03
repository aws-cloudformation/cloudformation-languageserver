import { stub } from 'sinon';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { CloudFormationFileType, Document } from '../../../../src/document/Document';
import { getAvailableRulePacks } from '../../../../src/services/guard/GeneratedGuardRules';
import { GuardEngine, GuardViolation } from '../../../../src/services/guard/GuardEngine';
import { GuardService, ValidationTrigger } from '../../../../src/services/guard/GuardService';
import { RuleConfiguration } from '../../../../src/services/guard/RuleConfiguration';
import { GuardSettings, DefaultSettings } from '../../../../src/settings/Settings';
import { Delayer } from '../../../../src/utils/Delayer';
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
        mockGuardEngine.initialize.resolves(undefined);
        mockGuardEngine.validateTemplate.resolves([]);
        mockGuardEngine.isReady.returns(true);

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

        it('should publish empty diagnostics for GitSync deployment files', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.GitSyncDeployment,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);

            await guardService.validate('content', 'file:///deployment.json');

            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith(
                    'cfn-guard',
                    'file:///deployment.json',
                    [],
                ),
            ).toBe(true);
        });

        it('should initialize Guard components if not ready', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.Template,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);
            mockGuardEngine.isReady.returns(false);

            await guardService.validate('content', 'file:///template.yaml');

            expect(mockGuardEngine.initialize.called).toBe(true);
        });

        it('should validate template and publish diagnostics for violations', async () => {
            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.Template,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);

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

            expect(mockGuardEngine.validateTemplate.calledWith('content')).toBe(true);
            expect(
                mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith(
                    'cfn-guard',
                    'file:///template.yaml',
                    [
                        {
                            severity: 1, // Error
                            range: {
                                start: { line: 4, character: 9 }, // 0-based
                                end: { line: 4, character: 9 },
                            },
                            message: 'Test violation',
                            source: 'cfn-guard',
                            code: 'test-rule',
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

        it('should fallback to Guard line/column when context path resolution fails', async () => {
            // Reset mocks
            mockComponents.diagnosticCoordinator.publishDiagnostics.resetHistory();
            mockComponents.contextManager.getContextFromPath.resetHistory();
            mockGuardEngine.validateTemplate.resetHistory();

            const mockFile = stubInterface<Document>();
            Object.defineProperty(mockFile, 'cfnFileType', {
                value: CloudFormationFileType.Template,
                writable: true,
            });
            mockComponents.documentManager.get.returns(mockFile);

            // Mock violation with CloudFormation path
            const mockViolations: GuardViolation[] = [
                {
                    ruleName: 'S3_BUCKET_ENCRYPTION',
                    message: 'S3 bucket must have encryption enabled',
                    severity: DiagnosticSeverity.Error,
                    location: {
                        line: 10,
                        column: 5,
                        path: '/Resources/NonExistent/Properties', // Path that won't resolve
                    },
                },
            ];

            // Mock context manager to return no context (path resolution failed)
            mockComponents.contextManager.getContextFromPath.returns({
                context: undefined,
                fullyResolved: false,
            });

            mockGuardEngine.validateTemplate.returns(mockViolations);

            await guardService.validate('content', 'file:///template.yaml');

            // Verify diagnostic was published with fallback range (Guard's line/column)
            expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(true);
            const publishCall = mockComponents.diagnosticCoordinator.publishDiagnostics.getCall(0);
            expect(publishCall).toBeTruthy();

            const diagnostics = publishCall.args[2];
            expect(diagnostics).toHaveLength(1);
            // Guard uses 1-based line numbers, LSP uses 0-based
            expect(diagnostics[0].range).toEqual({
                start: { line: 9, character: 4 },
                end: { line: 9, character: 4 },
            });
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

        it('should check if service is ready', () => {
            const isReady = guardService.isReady();
            expect(mockGuardEngine.isReady.called).toBe(true);
            expect(isReady).toBe(true);
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
            expect(mockGuardEngine.dispose.called).toBe(true);
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

        it('should trigger revalidation when rulesFile setting changes', () => {
            const mockSettingsManager = createMockSettingsManager({
                diagnostics: {
                    cfnGuard: defaultSettings,
                },
            } as any);

            // Configure with initial settings
            guardService.configure(mockSettingsManager);

            // Get the callback that was registered
            const settingsCallback = mockSettingsManager.subscribe.getCall(0).args[1];

            // Call the callback with new settings that have rulesFile
            settingsCallback({
                cfnGuard: {
                    ...defaultSettings,
                    rulesFile: '/new/path/rules.guard',
                },
            } as any);

            // Verify the callback was called (revalidation would be triggered)
            expect(mockSettingsManager.subscribe.called).toBe(true);
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

            // Now validate - should use empty rules due to loading failure
            await guardService.validate('content', 'file:///test.yaml');

            // Should publish empty diagnostics since rules failed to load
            expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(true);
            const call = mockComponents.diagnosticCoordinator.publishDiagnostics.getCall(0);
            const diagnostics = call.args[2];
            expect(diagnostics.length).toBe(0); // Empty due to failed rule loading
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
});
