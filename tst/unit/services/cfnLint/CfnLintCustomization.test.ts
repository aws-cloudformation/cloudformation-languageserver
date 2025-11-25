import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentManager } from '../../../../src/document/DocumentManager';
import { LspWorkspace } from '../../../../src/protocol/LspWorkspace';
import { CfnLintService } from '../../../../src/services/cfnLint/CfnLintService';
import { PyodideWorkerManager } from '../../../../src/services/cfnLint/PyodideWorkerManager';
import { DiagnosticCoordinator } from '../../../../src/services/DiagnosticCoordinator';
import { CfnLintSettings } from '../../../../src/settings/Settings';
import { Delayer } from '../../../../src/utils/Delayer';

describe('CfnLintService Customization', () => {
    let cfnLintService: CfnLintService;
    let mockWorkerManager: PyodideWorkerManager;
    let mockDocumentManager: DocumentManager;
    let mockWorkspace: LspWorkspace;
    let mockDiagnosticCoordinator: DiagnosticCoordinator;
    let mockDelayer: Delayer<void>;

    beforeEach(() => {
        mockDocumentManager = {} as DocumentManager;
        mockWorkspace = {} as LspWorkspace;
        mockDiagnosticCoordinator = {} as DiagnosticCoordinator;
        mockDelayer = {} as Delayer<void>;

        mockWorkerManager = {
            updateSettings: vi.fn(),
            lintTemplate: vi.fn(),
            lintFile: vi.fn(),
        } as unknown as PyodideWorkerManager;

        cfnLintService = new CfnLintService(
            mockDocumentManager,
            mockWorkspace,
            mockDiagnosticCoordinator,
            mockWorkerManager,
            mockDelayer,
        );
    });

    it('should pass settings to worker manager on settings change', () => {
        const newSettings: CfnLintSettings = {
            enabled: true,
            delayMs: 1000,
            lintOnChange: true,
            initialization: {
                maxRetries: 3,
                initialDelayMs: 1000,
                maxDelayMs: 30000,
                backoffMultiplier: 2,
                totalTimeoutMs: 120000,
            },
            ignoreChecks: ['E3012'],
            includeChecks: [],
            mandatoryChecks: [],
            includeExperimental: false,
            configureRules: ['E3012:strict=true'],
            regions: ['us-east-1'],
            customRules: [],
            appendRules: [],
            overrideSpec: '',
            registrySchemas: [],
        };

        // Simulate settings change
        (cfnLintService as any).onSettingsChanged(newSettings);

        expect(mockWorkerManager.updateSettings).toHaveBeenCalledWith(newSettings);
    });

    it('should include settings in lint template calls', async () => {
        const settings: CfnLintSettings = {
            enabled: true,
            delayMs: 1000,
            lintOnChange: true,
            initialization: {
                maxRetries: 3,
                initialDelayMs: 1000,
                maxDelayMs: 30000,
                backoffMultiplier: 2,
                totalTimeoutMs: 120000,
            },
            ignoreChecks: ['E3012'],
            includeChecks: [],
            mandatoryChecks: [],
            includeExperimental: false,
            configureRules: [],
            regions: [],
            customRules: [],
            appendRules: [],
            overrideSpec: '',
            registrySchemas: [],
        };

        const workerManager = new PyodideWorkerManager(settings.initialization, settings);

        const mockExecuteTask = vi.fn().mockResolvedValue([]);
        (workerManager as any).executeTask = mockExecuteTask;

        await workerManager.lintTemplate('template content', 'file://test.yaml', 'template' as any);

        expect(mockExecuteTask).toHaveBeenCalledWith('lint', {
            content: 'template content',
            uri: 'file://test.yaml',
            fileType: 'template',
            settings: settings,
        });
    });
});
