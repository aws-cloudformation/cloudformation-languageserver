import { DateTime } from 'luxon';
import { loadPyodide } from 'pyodide';
import * as sinon from 'sinon';
import { StubbedInstance, stubInterface, stubObject } from 'ts-sinon';
import { describe, expect, beforeEach, afterEach, vi, Mock, test } from 'vitest';
import { WorkspaceFolder, DiagnosticSeverity } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { CloudFormationFileType, Document } from '../../../../src/document/Document';
import { WorkerNotInitializedError } from '../../../../src/services/cfnLint/CfnLintErrors';
import { CfnLintService, LintTrigger, sleep } from '../../../../src/services/cfnLint/CfnLintService';
import { PyodideWorkerManager } from '../../../../src/services/cfnLint/PyodideWorkerManager';
import { SettingsState } from '../../../../src/settings/Settings';
import { Delayer } from '../../../../src/utils/Delayer';
import { createMockComponents, createMockSettingsManager } from '../../../utils/MockServerComponents';

// Helper functions for special test cases that need different configurations
const createServiceWithFileType = (fileType: CloudFormationFileType) => {
    const components = createMockComponents();
    components.diagnostics.publishDiagnostics.resolves();
    const mockFile = stubInterface<Document>();
    (mockFile as any).cfnFileType = fileType;
    components.documentManager.get.returns(mockFile);

    const workerManager = stubInterface<PyodideWorkerManager>();
    workerManager.initialize.resolves();
    workerManager.lintTemplate.resolves([]);

    const delayer = new Delayer<void>(1000);
    const mockDelayer = stubObject<Delayer<void>>(delayer);
    mockDelayer.delay.callsFake((key, callback) => callback());

    return { service: CfnLintService.create(components, workerManager, mockDelayer), components };
};

const createTestServiceWithState = (
    options: {
        includeDelayer?: boolean;
        status?: number | string;
        initializationPromise?: Promise<void>;
    } = {},
) => {
    const components = createMockComponents();
    components.diagnostics.publishDiagnostics.resolves();

    const workerManager = stubInterface<PyodideWorkerManager>();
    workerManager.initialize.resolves();
    workerManager.lintTemplate.resolves([]);

    let service: CfnLintService;

    if (options.includeDelayer) {
        const delayer = new Delayer<void>(1000);
        const mockDelayer = stubObject<Delayer<void>>(delayer);
        mockDelayer.delay.callsFake((key, callback) => callback());
        service = CfnLintService.create(components, workerManager, mockDelayer);
    } else {
        service = CfnLintService.create(components, workerManager);
    }

    // Set status if provided
    if (options.status !== undefined) {
        (service as any).status = options.status;
    }

    // Set initialization promise if provided
    if (Object.prototype.hasOwnProperty.call(options, 'initializationPromise')) {
        (service as any).initializationPromise = options.initializationPromise;
    }

    return { service, components, workerManager };
};

const createGitSyncService = (lintFileResult: any[] = []) => {
    const mockSettings = createMockSettingsManager();
    const gitSyncWorkerManager = stubObject<PyodideWorkerManager>(
        new PyodideWorkerManager(mockSettings.getCurrentSettings().diagnostics.cfnLint.initialization),
    );
    gitSyncWorkerManager.initialize.resolves();
    gitSyncWorkerManager.lintFile.resolves(lintFileResult);

    const gitSyncComponents = createMockComponents();
    gitSyncComponents.diagnostics.publishDiagnostics.resolves();
    const mockFile = stubInterface<Document>();
    (mockFile as any).cfnFileType = CloudFormationFileType.GitSyncDeployment;
    gitSyncComponents.documentManager.get.returns(mockFile);

    const delayer = new Delayer<void>(1000);
    const mockDelayer = stubObject<Delayer<void>>(delayer);
    mockDelayer.delay.callsFake((key, callback) => callback());

    return {
        service: CfnLintService.create(gitSyncComponents, gitSyncWorkerManager, mockDelayer),
        components: gitSyncComponents,
    };
};

// Mock the pyodide module
vi.mock('pyodide', () => ({
    loadPyodide: vi.fn(),
}));

// Mock the vscode-uri module
vi.mock('vscode-uri', () => ({
    URI: {
        parse: vi.fn().mockImplementation((uri: string) => ({
            fsPath: uri.replace('file://', '/path/to'),
        })),
        file: vi.fn().mockImplementation((path: string) => path),
    },
}));

// Mock luxon DateTime
vi.mock('luxon', () => {
    const mockNow = vi.fn();
    const mockPlus = vi.fn();
    const mockDiff = vi.fn();
    const mockAs = vi.fn();

    mockDiff.mockReturnValue({ as: mockAs });
    mockAs.mockReturnValue(100);

    const mockDateTime = {
        now: mockNow,
    };

    // Setup default mock values
    const mockTimeValue = {
        plus: mockPlus,
        diff: mockDiff,
        valueOf: () => 1000,
        toFixed: () => '100',
    };

    mockNow.mockReturnValue(mockTimeValue);
    mockPlus.mockReturnValue({
        valueOf: () => 2000,
        toFixed: () => '100',
    });

    return { DateTime: mockDateTime };
});

describe('CfnLintService', () => {
    let service: CfnLintService;
    let mockPyodide: any;
    let mockComponents: ReturnType<typeof createMockComponents>;
    let mockWorkspaceFolder: StubbedInstance<WorkspaceFolder>;
    let mockDelayer: StubbedInstance<Delayer<void>>;
    let mockWorkerManager: StubbedInstance<PyodideWorkerManager>;

    // Define test data
    const mockTemplate = 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket';
    const mockTemplateWithTripleQuotes = 'Resources:\n  MyBucket:\n    Type: """AWS::S3::Bucket"""';
    const mockJsonTemplate = '{"Resources":{"MyBucket":{"Type":"AWS::S3::Bucket"}}}';
    const mockUri = 'file:///workspace/project/template.yaml';
    const mockJsonUri = 'file:///workspace/project/template.json';
    const mockDeploymentFile = '{"template-file-path": "/path/to/template.yaml"}';

    const mockDiagnostics = [
        {
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: 1, character: 2 },
                end: { line: 1, character: 10 },
            },
            message: 'Test diagnostic',
            source: 'cfn-lint',
            code: 'E1001',
            codeDescription: {
                href: 'https://github.com/aws-cloudformation/cfn-lint/blob/main/docs/rules.md#E1001',
            },
        },
    ];

    beforeEach(() => {
        // Create mock Pyodide instance
        mockPyodide = {
            loadPackage: vi.fn().mockResolvedValue(undefined),
            runPythonAsync: vi.fn().mockResolvedValue({
                toJs: vi.fn().mockReturnValue([
                    {
                        uri: mockUri,
                        diagnostics: mockDiagnostics,
                    },
                ]),
            }),
            runPython: vi.fn().mockReturnValue({
                toJs: vi.fn().mockReturnValue([
                    {
                        uri: mockUri,
                        diagnostics: mockDiagnostics,
                    },
                ]),
            }),
            toPy: vi.fn((str) => str),
            FS: {
                mkdirTree: vi.fn(),
                rmdir: vi.fn(),
            },
            mountNodeFS: vi.fn(),
        };

        // Mock loadPyodide to return our mock instance
        (loadPyodide as Mock).mockResolvedValue(mockPyodide);

        // Create mock workspace folder
        mockWorkspaceFolder = {
            uri: 'file:///workspace/project',
            name: 'project',
        };

        // Use createMockComponents for consistent mocking
        mockComponents = createMockComponents();

        // Set up the publishDiagnostics mock to return a Promise
        mockComponents.diagnostics.publishDiagnostics.resolves();

        // Set up document manager to return template file type
        const mockFile = stubInterface<Document>();
        (mockFile as any).cfnFileType = CloudFormationFileType.Template;
        mockComponents.documentManager.get.returns(mockFile);

        // Create mock instances first
        const delayer = new Delayer<void>(1000);

        // Then create sinon stubs using stubObject
        mockWorkerManager = stubInterface<PyodideWorkerManager>();
        mockWorkerManager.initialize.resolves();
        mockWorkerManager.lintTemplate.resolves([
            {
                uri: mockUri,
                diagnostics: mockDiagnostics,
            },
        ]);
        mockWorkerManager.lintFile.resolves([
            {
                uri: mockUri,
                diagnostics: mockDiagnostics,
            },
        ]);
        mockWorkerManager.mountFolder.resolves();
        mockWorkerManager.shutdown.resolves();

        mockDelayer = stubObject<Delayer<void>>(delayer);
        mockDelayer.delay.callsFake((key, callback) => callback());

        // Create service with injected mocks
        service = CfnLintService.create(mockComponents, mockWorkerManager, mockDelayer);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initialize', () => {
        test('should initialize Pyodide and install cfn-lint', async () => {
            await service.initialize();

            expect(mockWorkerManager.initialize.called).toBe(true);
            expect(service.isInitialized()).toBe(true);
        });

        test('should not reinitialize if already initialized', async () => {
            await service.initialize();
            // Reset call history
            mockWorkerManager.initialize.resetHistory();

            await service.initialize();

            expect(mockWorkerManager.initialize.called).toBe(false);
        });

        test('should handle initialization failure', async () => {
            mockWorkerManager.initialize.rejects(new Error('Failed to initialize Pyodide worker'));

            await expect(service.initialize()).rejects.toThrow('Failed to initialize Pyodide worker');
            expect(service.isInitialized()).toBe(false);
        });
    });

    describe('mountFolder', () => {
        test('should mount folder correctly', async () => {
            await service.initialize();
            await service.mountFolder(mockWorkspaceFolder);

            expect(URI.parse).toHaveBeenCalledWith(mockWorkspaceFolder.uri);
            expect(mockWorkerManager.mountFolder.calledWith('/path/to/workspace/project', '/project')).toBe(true);
        });

        test('should throw error if not initialized', async () => {
            await expect(service.mountFolder(mockWorkspaceFolder)).rejects.toThrow(
                'CfnLintService not initialized. Call initialize() first.',
            );
        });

        test('should handle mounting errors', async () => {
            await service.initialize();
            mockWorkerManager.mountFolder.rejects(new Error('Failed to mount directory'));

            await expect(service.mountFolder(mockWorkspaceFolder)).rejects.toThrow('Failed to mount directory');
        });

        test('should not mount folder twice', async () => {
            await service.initialize();

            // Mount folder first time
            await service.mountFolder(mockWorkspaceFolder);
            expect(mockWorkerManager.mountFolder.callCount).toBe(1);

            // Mount same folder again - should not call worker
            await service.mountFolder(mockWorkspaceFolder);
            expect(mockWorkerManager.mountFolder.callCount).toBe(1);
        });

        test('should remount folders after worker recovery', async () => {
            await service.initialize();
            await service.mountFolder(mockWorkspaceFolder);
            expect(mockWorkerManager.mountFolder.callCount).toBe(1);

            // Simulate worker crash - this sets status to uninitialized
            mockWorkerManager.lintTemplate.rejects(new Error('Worker crashed'));
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnSave);

            // Reset mock to succeed and trigger recovery
            mockWorkerManager.lintTemplate.resolves([]);
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnSave);

            // Should have remounted during recovery
            expect(mockWorkerManager.mountFolder.callCount).toBe(2);
        });
    });

    describe('lint', () => {
        beforeEach(async () => {
            await service.initialize();
        });

        test('should skip linting for unknown file types', async () => {
            const { service: unknownService, components: unknownComponents } = createServiceWithFileType(
                CloudFormationFileType.Unknown,
            );

            await unknownService.initialize();
            await unknownService.lint(mockTemplate, mockUri);

            expect(unknownComponents.diagnosticCoordinator.publishDiagnostics.calledWith('cfn-lint', mockUri, [])).toBe(
                true,
            );
        });

        test('should skip linting for GitSync deployment files without workspace context', async () => {
            const { service: gitSyncService, components: gitSyncComponents } = createServiceWithFileType(
                CloudFormationFileType.GitSyncDeployment,
            );

            // Mock no workspace folder
            gitSyncComponents.workspace.getWorkspaceFolder.returns(undefined);

            await gitSyncService.initialize();
            await gitSyncService.lint(mockTemplate, mockUri);

            expect(gitSyncComponents.diagnosticCoordinator.publishDiagnostics.calledWith('cfn-lint', mockUri, [])).toBe(
                true,
            );
        });

        test('should lint standalone template correctly', async () => {
            mockComponents.workspace.getWorkspaceFolder.returns(undefined);

            await service.lint(mockTemplate, mockUri);

            expect(mockComponents.workspace.getWorkspaceFolder.calledWith(mockUri)).toBe(true);
            expect(
                mockWorkerManager.lintTemplate.calledWith(mockTemplate, mockUri, CloudFormationFileType.Template),
            ).toBe(true);
            expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(true);
        });

        test('should lint workspace template correctly', async () => {
            mockComponents.workspace.getWorkspaceFolder.returns(mockWorkspaceFolder);

            await service.lint(mockTemplate, mockUri);

            expect(mockComponents.workspace.getWorkspaceFolder.calledWith(mockUri)).toBe(true);
            expect(mockWorkerManager.mountFolder.calledWith('/path/to/workspace/project', '/project')).toBe(true);
            expect(
                mockWorkerManager.lintFile.calledWith(
                    '/project/template.yaml',
                    mockUri,
                    CloudFormationFileType.Template,
                ),
            ).toBe(true);
            expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(true);
        });

        test('should handle templates with triple quotes', async () => {
            mockComponents.workspace.getWorkspaceFolder.returns(undefined);

            await service.lint(mockTemplateWithTripleQuotes, mockUri);

            expect(
                mockWorkerManager.lintTemplate.calledWith(
                    mockTemplateWithTripleQuotes,
                    mockUri,
                    CloudFormationFileType.Template,
                ),
            ).toBe(true);
        });

        test('should handle worker crash during standalone linting', async () => {
            mockComponents.workspace.getWorkspaceFolder.returns(undefined);
            mockWorkerManager.lintTemplate.rejects(new Error('Worker exited unexpectedly with code 1'));

            await service.lint(mockTemplate, mockUri);

            // Should publish empty diagnostics and not crash
            expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(true);
            // Service should be marked as uninitialized for recovery
            expect(service.isInitialized()).toBe(false);
        });

        test('should handle worker crash during workspace file linting', async () => {
            mockComponents.workspace.getWorkspaceFolder.returns(mockWorkspaceFolder);
            mockWorkerManager.lintFile.rejects(new Error('Worker exited unexpectedly with code 1'));

            await service.lint(mockTemplate, mockUri);

            // Should publish empty diagnostics and not crash
            expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(true);
            // Service should be marked as uninitialized for recovery
            expect(service.isInitialized()).toBe(false);
        });

        test('should handle JSON templates', async () => {
            mockComponents.workspace.getWorkspaceFolder.returns(undefined);

            await service.lint(mockJsonTemplate, mockJsonUri);

            expect(
                mockWorkerManager.lintTemplate.calledWith(
                    mockJsonTemplate,
                    mockJsonUri,
                    CloudFormationFileType.Template,
                ),
            ).toBe(true);
        });

        test('should handle GitSync deployment files with undefined result', async () => {
            const { service: gitSyncService, components: gitSyncComponents } = createGitSyncService([]);

            // Initialize the service
            await gitSyncService.initialize();

            await gitSyncService.lint(mockDeploymentFile, mockUri);

            // Verify that empty diagnostics are published for the current file
            expect(gitSyncComponents.diagnosticCoordinator.publishDiagnostics.calledWith('cfn-lint', mockUri, [])).toBe(
                true,
            );
        });

        test('should extract template path from GitSync deployment file', async () => {
            mockComponents.workspace.getWorkspaceFolder.returns(mockWorkspaceFolder);

            // Create a new service instance with the mock context manager
            const mockSettings = createMockSettingsManager();
            const gitSyncWorkerManager = stubObject<PyodideWorkerManager>(
                new PyodideWorkerManager(mockSettings.getCurrentSettings().diagnostics.cfnLint.initialization),
            );
            gitSyncWorkerManager.initialize.resolves();
            gitSyncWorkerManager.lintFile.resolves([]); // Empty results to trigger the GitSync logic

            const gitSyncComponents = createMockComponents();
            gitSyncComponents.diagnostics.publishDiagnostics.resolves();
            const mockFile = stubInterface<Document>();
            (mockFile as any).cfnFileType = CloudFormationFileType.GitSyncDeployment;
            gitSyncComponents.documentManager.get.returns(mockFile);
            const gitSyncService = CfnLintService.create(gitSyncComponents, gitSyncWorkerManager, mockDelayer);

            // Initialize the service
            await gitSyncService.initialize();

            // Lint the deployment file
            await gitSyncService.lint(mockDeploymentFile, mockUri);

            // Should publish diagnostics for both the deployment file and the extracted template
            expect(gitSyncComponents.diagnosticCoordinator.publishDiagnostics.callCount).toBe(1);
        });

        test('should handle Python execution errors gracefully', async () => {
            mockComponents.workspace.getWorkspaceFolder.returns(undefined);
            mockWorkerManager.lintTemplate.rejects(new Error('Python execution failed'));

            await service.lint(mockTemplate, mockUri);

            // Should publish error diagnostic
            const diagnosticsArg = mockComponents.diagnosticCoordinator.publishDiagnostics.firstCall.args;
            expect(diagnosticsArg[0]).toBe('cfn-lint'); // source
            expect(diagnosticsArg[1]).toBe(mockUri); // uri
            expect(diagnosticsArg[2].length).toBeGreaterThan(0); // diagnostics array
            expect(diagnosticsArg[2][0].severity).toBe(1);
            expect(diagnosticsArg[2][0].message).toContain('Python execution failed');
        });

        test('should log but not publish diagnostic for Worker not initialized error in lint', async () => {
            mockComponents.workspace.getWorkspaceFolder.returns(undefined);
            mockWorkerManager.lintTemplate.rejects(new WorkerNotInitializedError());

            await service.lint(mockTemplate, mockUri);

            // Should not publish any diagnostics for worker initialization errors
            expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(false);
        });

        test('should handle waitForInitialization failure', async () => {
            // Create a spy on waitForInitialization to make it fail
            const waitSpy = vi
                .spyOn(service as any, 'waitForInitialization')
                .mockRejectedValueOnce(new Error('Initialization timeout'));

            await expect(service.lint(mockTemplate, mockUri)).rejects.toThrow('Initialization timeout');

            waitSpy.mockRestore();
        });
    });

    describe('delayed linting', () => {
        test('should provide delayed linting functionality', async () => {
            await service.initialize();
            mockComponents.workspace.getWorkspaceFolder.returns(undefined);

            // Replace the lint method with a function that tracks calls
            const lintStub = sinon.stub(service, 'lint').resolves();

            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnChange);

            expect(mockDelayer.delay.called).toBe(true);
            expect(lintStub.calledWith(mockTemplate, mockUri)).toBe(true);
        });

        test('should queue requests when not initialized', async () => {
            // Create a new service instance that's not initialized
            mockComponents.diagnostics.publishDiagnostics.resolves();
            const mockSettings = createMockSettingsManager();
            const uninitializedWorkerManager = stubObject<PyodideWorkerManager>(
                new PyodideWorkerManager(mockSettings.getCurrentSettings().diagnostics.cfnLint.initialization),
            );
            const uninitializedDelayer = stubObject<Delayer<void>>(new Delayer<void>(1000));

            const uninitializedService = CfnLintService.create(
                createMockComponents(),
                uninitializedWorkerManager,
                uninitializedDelayer,
            );

            // Mock ensureInitialized to resolve immediately
            const ensureSpy = vi
                .spyOn(uninitializedService as any, 'ensureInitialized')
                .mockResolvedValueOnce(undefined);

            // Call lintDelayed (should queue the request)
            const lintPromise = uninitializedService.lintDelayed(mockTemplate, mockUri, LintTrigger.OnChange);

            // Verify request was queued
            expect((uninitializedService as any).requestQueue.size).toBe(1);
            expect((uninitializedService as any).requestQueue.has(mockUri)).toBe(true);

            // Verify ensureInitialized was called
            expect(ensureSpy).toHaveBeenCalledTimes(1);

            // Manually resolve the queued request
            const queuedRequest = (uninitializedService as any).requestQueue.get(mockUri);
            queuedRequest.resolve();

            // Wait for the lintDelayed promise to resolve
            await lintPromise;

            ensureSpy.mockRestore();
        });

        test('should process requests through delayer when initialized', async () => {
            await service.initialize();

            const lintStub = sinon.stub(service, 'lint').resolves();

            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnChange);

            expect(mockDelayer.delay.called).toBe(true);
            expect(lintStub.calledWith(mockTemplate, mockUri)).toBe(true);
        });

        test('should cancel delayed linting for specific URI', () => {
            service.cancelDelayedLinting(mockUri);

            expect(mockDelayer.cancel.calledWith(mockUri)).toBe(true);
        });

        test('should cancel all delayed linting', () => {
            service.cancelAllDelayedLinting();

            expect(mockDelayer.cancelAll.called).toBe(true);
        });

        test('should track pending lint count', () => {
            mockDelayer.getPendingCount.returns(5);

            const count = service.getPendingLintCount();

            expect(mockDelayer.getPendingCount.called).toBe(true);
            expect(count).toBe(5);
        });
    });

    describe('sleep utility function', () => {
        test('should resolve after specified delay', async () => {
            vi.useFakeTimers();

            const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
            const sleepPromise = sleep(100);

            // Verify that setTimeout was called with the correct delay
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);

            // Fast-forward time
            vi.advanceTimersByTime(100);

            // Verify that the promise resolves
            await expect(sleepPromise).resolves.toBeUndefined();

            setTimeoutSpy.mockRestore();
            vi.useRealTimers();
        });
    });

    describe('isInitialized', () => {
        test('should return false when not initialized', () => {
            expect(service.isInitialized()).toBe(false);
        });
        describe('ensureInitialized', () => {
            test('should return immediately if already initialized', async () => {
                await service.initialize();

                const initializeSpy = vi.spyOn(service as any, 'initialize');
                const pollSpy = vi.spyOn(service as any, 'pollForInitialization');

                await (service as any).ensureInitialized();

                expect(initializeSpy).not.toHaveBeenCalled();
                expect(pollSpy).not.toHaveBeenCalled();

                initializeSpy.mockRestore();
                pollSpy.mockRestore();
            });

            test('should start initialization if uninitialized', async () => {
                // Create a new service instance that's not initialized
                const { service: uninitializedService } = createTestServiceWithState();

                // Mock initialize to resolve immediately
                const initializeSpy = vi
                    .spyOn(uninitializedService as any, 'initialize')
                    .mockResolvedValueOnce(undefined);
                const processSpy = vi
                    .spyOn(uninitializedService as any, 'processQueuedRequests')
                    .mockImplementationOnce(() => {});

                await (uninitializedService as any).ensureInitialized();

                expect(initializeSpy).toHaveBeenCalledTimes(1);
                expect(processSpy).toHaveBeenCalledTimes(1);

                initializeSpy.mockRestore();
                processSpy.mockRestore();
            });

            test('should wait for existing initialization if initializing', async () => {
                // Create a new service instance that's initializing
                const { service: initializingService } = createTestServiceWithState({
                    status: 1, // STATUS.Initializing
                    initializationPromise: Promise.resolve(),
                });

                const initializeSpy = vi.spyOn(initializingService as any, 'initialize');
                const processSpy = vi
                    .spyOn(initializingService as any, 'processQueuedRequests')
                    .mockImplementationOnce(() => {});

                await (initializingService as any).ensureInitialized();

                expect(initializeSpy).not.toHaveBeenCalled();
                expect(processSpy).toHaveBeenCalledTimes(1);

                initializeSpy.mockRestore();
                processSpy.mockRestore();
            });

            test('should create polling promise if initializing without promise', async () => {
                // Create a new service instance that's initializing
                const { service: initializingService } = createTestServiceWithState({
                    status: 1, // STATUS.Initializing
                    initializationPromise: undefined,
                });

                // Mock pollForInitialization to resolve immediately
                const pollSpy = vi
                    .spyOn(initializingService as any, 'pollForInitialization')
                    .mockResolvedValueOnce(undefined);
                const processSpy = vi
                    .spyOn(initializingService as any, 'processQueuedRequests')
                    .mockImplementationOnce(() => {});

                await (initializingService as any).ensureInitialized();

                expect(pollSpy).toHaveBeenCalledTimes(1);
                expect(processSpy).toHaveBeenCalledTimes(1);

                pollSpy.mockRestore();
                processSpy.mockRestore();
            });

            test('should handle initialization failure', async () => {
                // Create a new service instance that's not initialized
                const { service: uninitializedService } = createTestServiceWithState();

                // Mock initialize to reject
                const initializeSpy = vi
                    .spyOn(uninitializedService as any, 'initialize')
                    .mockRejectedValueOnce(new Error('Initialization failed'));

                await expect(async () => {
                    await (uninitializedService as any).ensureInitialized();
                }).rejects.toThrow('Initialization failed');

                initializeSpy.mockRestore();
            });

            test('should handle timeout', async () => {
                // Create a new service instance that's not initialized
                const { service: uninitializedService } = createTestServiceWithState();

                // Mock initialize to never resolve (simulating a hang)
                const initializeSpy = vi
                    .spyOn(uninitializedService as any, 'initialize')
                    .mockImplementation(() => new Promise(() => {})); // Never resolves

                // Use a very short timeout
                await expect(async () => {
                    await (uninitializedService as any).ensureInitialized(10);
                }).rejects.toThrow('Initialization timeout');

                initializeSpy.mockRestore();
            });
        });
        test('should return true after initialization', async () => {
            await service.initialize();
            expect(service.isInitialized()).toBe(true);
        });
    });

    describe('close', () => {
        test('should clean up resources when initialized', async () => {
            await service.initialize();
            expect(service.isInitialized()).toBe(true);

            await service.close();

            expect(service.isInitialized()).toBe(false);
            expect(mockWorkerManager.shutdown.called).toBe(true);
        });

        test('should do nothing when not initialized', async () => {
            expect(service.isInitialized()).toBe(false);

            await service.close();

            expect(service.isInitialized()).toBe(false);
        });
    });

    describe('helper methods', () => {
        beforeEach(async () => {
            await service.initialize();
        });

        describe('extractTemplatePathFromDeploymentFile', () => {
            test('should extract path from valid JSON', () => {
                const deploymentFile = '{"template-file-path": "/path/to/template.yaml"}';
                const result = (service as any).extractTemplatePathFromDeploymentFile(deploymentFile);
                expect(result).toBe('/path/to/template.yaml');
            });

            test('should return undefined for JSON without template path', () => {
                const deploymentFile = '{"other-key": "value"}';
                const result = (service as any).extractTemplatePathFromDeploymentFile(deploymentFile);
                expect(result).toBeUndefined();
            });

            test('should handle invalid JSON gracefully', () => {
                const deploymentFile = 'not valid json';
                const result = (service as any).extractTemplatePathFromDeploymentFile(deploymentFile);
                expect(result).toBeUndefined();
            });
        });

        describe('publishDiagnostics', () => {
            test('should call lsp.publishDiagnostics with correct parameters', () => {
                const uri = 'file:///test.yaml';
                const diagnostics = [
                    {
                        severity: DiagnosticSeverity.Warning,
                        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                        message: 'Test diagnostic',
                        source: 'cfn-lint',
                        code: 'TEST',
                    },
                ];

                (service as any).publishDiagnostics(uri, diagnostics);

                expect(
                    mockComponents.diagnosticCoordinator.publishDiagnostics.calledWith('cfn-lint', uri, diagnostics),
                ).toBe(true);
            });

            test('should handle errors when publishing diagnostics', async () => {
                const uri = 'file:///test.yaml';
                const diagnostics = [
                    {
                        severity: DiagnosticSeverity.Error,
                        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                    },
                ];

                // Mock publishDiagnostics to reject
                mockComponents.diagnosticCoordinator.publishDiagnostics.rejects(new Error('Publishing failed'));

                // This should not throw
                await (service as any).publishDiagnostics(uri, diagnostics);

                // Verify error was logged
                expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(true);
            });
        });

        describe('lintStandaloneFile', () => {
            test('should handle successful linting', async () => {
                const workerManager = (service as any).workerManager;

                await (service as any).lintStandaloneFile(mockTemplate, mockUri, CloudFormationFileType.Template);

                expect(
                    workerManager.lintTemplate.calledWith(mockTemplate, mockUri, CloudFormationFileType.Template),
                ).toBe(true);
                expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(true);
            });

            test('should handle linting errors', async () => {
                const workerManager = (service as any).workerManager;
                // Use sinon's rejects method instead of mockRejectedValueOnce
                workerManager.lintTemplate.rejects(new Error('Python execution failed'));

                await (service as any).lintStandaloneFile(mockTemplate, mockUri, CloudFormationFileType.Template);

                const diagnosticsArg = mockComponents.diagnosticCoordinator.publishDiagnostics.firstCall.args;
                expect(diagnosticsArg[0]).toBe('cfn-lint'); // source
                expect(diagnosticsArg[1]).toBe(mockUri); // uri
                expect(diagnosticsArg[2].length).toBe(1); // diagnostics array
                expect(diagnosticsArg[2][0].severity).toBe(1);
                expect(diagnosticsArg[2][0].message).toBe('CFN Lint Error: Python execution failed');
            });

            test('should log but not publish diagnostic for Worker not initialized error', async () => {
                const workerManager = (service as any).workerManager;
                // Use sinon's rejects method to simulate worker not initialized error
                workerManager.lintTemplate.rejects(new WorkerNotInitializedError());

                await (service as any).lintStandaloneFile(mockTemplate, mockUri, CloudFormationFileType.Template);

                // Should not publish any diagnostics for worker initialization errors
                expect(mockComponents.diagnosticCoordinator.publishDiagnostics.called).toBe(false);
            });

            test('should throw if service is not initialized', async () => {
                // Set the main service to uninitialized state
                (service as any).status = 0; // STATUS.Uninitialized

                // Test the lint method which has the initialization check
                await expect(service.lint(mockTemplate, mockUri)).rejects.toThrow(
                    'CfnLintService is not initialized and not being initialized',
                );
            });
        });

        describe('waitForInitialization', () => {
            test('should resolve immediately if already initialized', async () => {
                // Service is already initialized in beforeEach
                const spy = vi.spyOn(globalThis, 'setTimeout');

                await (service as any).waitForInitialization();

                // Should not have called setTimeout (no waiting)
                expect(spy).not.toHaveBeenCalled();

                spy.mockRestore();
            });

            test('should throw if service is uninitialized', async () => {
                // Set the main service to uninitialized state
                (service as any).status = 0; // STATUS.Uninitialized

                await expect(async () => {
                    await (service as any).waitForInitialization();
                }).rejects.toThrow('CfnLintService is not initialized and not being initialized');
            });

            test('should wait and resolve when initialization completes', async () => {
                // Create a new service instance that's initializing
                mockComponents.diagnostics.publishDiagnostics.resolves();
                const initializingService = CfnLintService.create(createMockComponents(), mockWorkerManager);

                // Set status to initializing
                (initializingService as any).status = 1; // STATUS.Initializing

                // Mock DateTime.now to simulate time passing
                const mockStartTime = {
                    plus: vi.fn(),
                    valueOf: () => 1000,
                };
                const mockTimeoutTime = {
                    valueOf: () => 2000,
                };

                // First call: still initializing
                const mockCurrentTime1 = {
                    valueOf: () => 1500,
                };
                // Second call: initialization complete
                const mockCurrentTime2 = {
                    valueOf: () => 1600,
                };

                mockStartTime.plus.mockReturnValue(mockTimeoutTime);

                // Mock DateTime.now to return different values on each call
                (DateTime.now as Mock)
                    .mockReturnValueOnce(mockStartTime) // Initial call
                    .mockReturnValueOnce(mockCurrentTime1) // First check
                    .mockReturnValueOnce(mockCurrentTime2); // Second check

                // Setup a promise that will complete the initialization after a delay
                setTimeout(() => {
                    (initializingService as any).status = 2; // STATUS.Initialized
                    (initializingService as any).pyodide = mockPyodide;
                }, 10);

                await (initializingService as any).waitForInitialization(100, 5, 10);

                // Should have completed successfully
                expect(initializingService.isInitialized()).toBe(true);
            }, 10000); // Increase timeout to 10 seconds

            test('should throw on timeout', async () => {
                // Create a new service instance that's initializing
                mockComponents.diagnostics.publishDiagnostics.resolves();
                const initializingService = CfnLintService.create(createMockComponents(), mockWorkerManager);

                // Set status to initializing
                (initializingService as any).status = 1; // STATUS.Initializing

                // Mock DateTime.now to simulate time passing beyond timeout
                const mockStartTime = {
                    plus: vi.fn(),
                    diff: vi.fn(),
                    valueOf: () => 1000,
                };
                const mockTimeoutTime = {
                    valueOf: () => 1100, // Short timeout
                };
                const mockCurrentTime = {
                    diff: vi.fn(),
                    valueOf: () => 1200, // Beyond timeout
                };

                mockStartTime.plus.mockReturnValue(mockTimeoutTime);
                mockStartTime.diff.mockReturnValue({ as: vi.fn().mockReturnValue(100) });
                mockCurrentTime.diff.mockReturnValue({ as: vi.fn().mockReturnValue(200) });

                (DateTime.now as Mock)
                    .mockReturnValueOnce(mockStartTime)
                    .mockReturnValueOnce(mockCurrentTime)
                    .mockReturnValueOnce(mockCurrentTime);

                await expect(async () => {
                    await (initializingService as any).waitForInitialization(100, 5, 10);
                }).rejects.toThrow('CfnLintService initialization timeout');
            });
        });

        describe('pollForInitialization', () => {
            test('should resolve when initialization completes', async () => {
                // Create a new service instance that's initializing
                mockComponents.diagnostics.publishDiagnostics.resolves();
                const initializingService = CfnLintService.create(createMockComponents(), mockWorkerManager);

                // Set status to initializing
                (initializingService as any).status = 1; // STATUS.Initializing

                // Mock DateTime.now to simulate time passing
                const mockStartTime = {
                    plus: vi.fn(),
                    valueOf: () => 1000,
                };
                const mockTimeoutTime = {
                    valueOf: () => 2000,
                };
                const mockCurrentTime = {
                    valueOf: () => 1500,
                };

                mockStartTime.plus.mockReturnValue(mockTimeoutTime);

                (DateTime.now as Mock).mockReturnValueOnce(mockStartTime).mockReturnValueOnce(mockCurrentTime);

                // Setup a promise that will complete the initialization after a delay
                setTimeout(() => {
                    (initializingService as any).status = 2; // STATUS.Initialized
                }, 10);

                await (initializingService as any).pollForInitialization(100);

                // Should have completed successfully
                expect(initializingService.isInitialized()).toBe(true);
            });

            test('should throw on timeout', async () => {
                // Create a new service instance that's initializing
                mockComponents.diagnostics.publishDiagnostics.resolves();
                const initializingService = CfnLintService.create(createMockComponents(), mockWorkerManager);

                // Set status to initializing
                (initializingService as any).status = 1; // STATUS.Initializing

                // Mock DateTime.now to simulate time passing beyond timeout
                const mockStartTime = {
                    plus: vi.fn(),
                    diff: vi.fn(),
                    valueOf: () => 1000,
                };
                const mockTimeoutTime = {
                    valueOf: () => 1100, // Short timeout
                };
                const mockCurrentTime = {
                    diff: vi.fn(),
                    valueOf: () => 1200, // Beyond timeout
                };

                mockStartTime.plus.mockReturnValue(mockTimeoutTime);
                mockStartTime.diff.mockReturnValue({ as: vi.fn().mockReturnValue(100) });

                (DateTime.now as Mock)
                    .mockReturnValueOnce(mockStartTime)
                    .mockReturnValueOnce(mockCurrentTime)
                    .mockReturnValueOnce(mockCurrentTime);

                await expect(async () => {
                    await (initializingService as any).pollForInitialization(100);
                }).rejects.toThrow('Initialization polling timeout');
            });

            test('should throw if initialization fails', async () => {
                // Create a new service instance that's initializing
                mockComponents.diagnostics.publishDiagnostics.resolves();
                const initializingService = CfnLintService.create(createMockComponents(), mockWorkerManager);

                // Set status to initializing
                (initializingService as any).status = 1; // STATUS.Initializing

                // Mock DateTime.now to simulate time passing
                const mockStartTime = {
                    plus: vi.fn(),
                    valueOf: () => 1000,
                };
                const mockTimeoutTime = {
                    valueOf: () => 2000,
                };
                const mockCurrentTime = {
                    valueOf: () => 1500,
                };

                mockStartTime.plus.mockReturnValue(mockTimeoutTime);

                (DateTime.now as Mock).mockReturnValueOnce(mockStartTime).mockReturnValueOnce(mockCurrentTime);

                // Setup a promise that will fail the initialization after a delay
                setTimeout(() => {
                    (initializingService as any).status = 0; // STATUS.Uninitialized (failed)
                }, 10);

                await expect(async () => {
                    await (initializingService as any).pollForInitialization(100);
                }).rejects.toThrow('Initialization failed');
            });
        });

        describe('processQueuedRequests', () => {
            test('should do nothing if queue is empty', () => {
                // Ensure queue is empty
                (service as any).requestQueue = new Map();

                const delaySpy = vi.spyOn((service as any).delayer, 'delay');

                (service as any).processQueuedRequests();

                expect(delaySpy).not.toHaveBeenCalled();

                delaySpy.mockRestore();
            });

            test('should process queued requests', async () => {
                // Mock the workerManager
                const mockWorkerManager = stubInterface<PyodideWorkerManager>();
                mockWorkerManager.initialize.resolves();
                mockWorkerManager.lintTemplate.resolves([]);

                // Create a new service instance
                const testService = CfnLintService.create(createMockComponents(), mockWorkerManager);
                (testService as any).workerManager = mockWorkerManager;

                // Set the service status to initialized (skip the initialize call)
                (testService as any).status = 'initialized';

                // Create mock requests
                const mockRequest1 = {
                    content: 'content1',
                    timestamp: Date.now(),
                    resolve: sinon.stub(),
                    reject: sinon.stub(),
                };

                const mockRequest2 = {
                    content: 'content2',
                    timestamp: Date.now(),
                    resolve: sinon.stub(),
                    reject: sinon.stub(),
                };

                // Add requests to queue
                (testService as any).requestQueue = new Map([
                    ['uri1', mockRequest1],
                    ['uri2', mockRequest2],
                ]);

                // Store original methods
                const originalDelay = (testService as any).delayer.delay;
                const originalLint = testService.lint;

                // Replace the lint method with a function that tracks calls
                const lintStub = sinon.stub(testService, 'lint').resolves();

                // Replace delayer.delay with a function that executes the callback immediately
                (testService as any).delayer.delay = (key: string, callback: () => Promise<void>) => {
                    return callback();
                };

                (testService as any).processQueuedRequests();

                // Wait for promises to resolve
                await new Promise((resolve) => setTimeout(resolve, 0));

                // Should have called lint for each request
                expect(lintStub.callCount).toBe(2);
                expect(lintStub.calledWith('content1', 'uri1')).toBe(true);
                expect(lintStub.calledWith('content2', 'uri2')).toBe(true);

                // Should have resolved each request
                expect(mockRequest1.resolve.called).toBe(true);
                expect(mockRequest2.resolve.called).toBe(true);

                // Should have cleared the queue
                expect((testService as any).requestQueue.size).toBe(0);

                // Restore original methods
                (testService as any).delayer.delay = originalDelay;
                testService.lint = originalLint;

                // Restore original methods
                (testService as any).delayer.delay = originalDelay;
                testService.lint = originalLint;

                // Should have resolved each request
                expect(mockRequest1.resolve.callCount).toBe(1);
                expect(mockRequest2.resolve.callCount).toBe(1);

                // Should have cleared the queue
                expect((testService as any).requestQueue.size).toBe(0);
            }, 10000); // Increase timeout to 10 seconds

            test('should preserve forceUseContent parameter in queued requests', async () => {
                // Mock the workerManager
                const mockWorkerManager = stubInterface<PyodideWorkerManager>();
                mockWorkerManager.initialize.resolves();
                mockWorkerManager.lintTemplate.resolves([]);

                // Create a new service instance
                const testService = CfnLintService.create(createMockComponents(), mockWorkerManager);
                (testService as any).workerManager = mockWorkerManager;

                // Set the service status to initialized (skip the initialize call)
                (testService as any).status = 'initialized';

                // Create mock requests with different forceUseContent values
                const mockRequest1 = {
                    content: 'content1',
                    forceUseContent: true,
                    timestamp: Date.now(),
                    resolve: sinon.stub(),
                    reject: sinon.stub(),
                };

                const mockRequest2 = {
                    content: 'content2',
                    forceUseContent: false,
                    timestamp: Date.now(),
                    resolve: sinon.stub(),
                    reject: sinon.stub(),
                };

                // Add requests to queue
                (testService as any).requestQueue = new Map([
                    ['uri1', mockRequest1],
                    ['uri2', mockRequest2],
                ]);

                // Store original methods
                const originalDelay = (testService as any).delayer.delay;
                const originalLint = testService.lint;

                // Replace the lint method with a function that tracks calls
                const lintStub = sinon.stub(testService, 'lint').resolves();

                // Replace delayer.delay with a function that executes the callback immediately
                (testService as any).delayer.delay = (key: string, callback: () => Promise<void>) => {
                    return callback();
                };

                (testService as any).processQueuedRequests();

                // Wait for promises to resolve
                await new Promise((resolve) => setTimeout(resolve, 0));

                // Should have called lint for each request with the correct forceUseContent parameter
                expect(lintStub.callCount).toBe(2);
                expect(lintStub.calledWith('content1', 'uri1', true)).toBe(true);
                expect(lintStub.calledWith('content2', 'uri2', false)).toBe(true);

                // Should have resolved each request
                expect(mockRequest1.resolve.called).toBe(true);
                expect(mockRequest2.resolve.called).toBe(true);

                // Should have cleared the queue
                expect((testService as any).requestQueue.size).toBe(0);

                // Restore original methods
                (testService as any).delayer.delay = originalDelay;
                testService.lint = originalLint;
            }, 10000); // Increase timeout to 10 seconds

            test('should handle errors in queued requests', async () => {
                // Mock the workerManager
                const mockWorkerManager = stubInterface<PyodideWorkerManager>();
                mockWorkerManager.initialize.resolves();
                mockWorkerManager.lintTemplate.rejects(new Error('Linting failed'));

                // Create a new service instance
                const testService = CfnLintService.create(createMockComponents(), mockWorkerManager);
                (testService as any).workerManager = mockWorkerManager;

                // Set the service status to initialized (skip the initialize call)
                (testService as any).status = 'initialized';

                // Create mock request with spies
                const mockRequest = {
                    content: 'content',
                    timestamp: Date.now(),
                    resolve: sinon.stub(),
                    reject: sinon.stub(),
                };

                // Add request to queue
                (testService as any).requestQueue = new Map([['uri', mockRequest]]);

                // Store original methods
                const originalDelay = (testService as any).delayer.delay;
                const originalLint = testService.lint;

                // Replace the lint method with a function that tracks calls
                sinon.stub(testService, 'lint').rejects(new Error('Processing failed'));

                // Replace delayer.delay with a function that executes the callback immediately
                (testService as any).delayer.delay = (key: string, callback: () => Promise<void>) => {
                    return callback();
                };

                (testService as any).processQueuedRequests();

                // Wait for promises to resolve
                await new Promise((resolve) => setTimeout(resolve, 0));

                // Should have rejected the request
                expect(mockRequest.reject.called).toBe(true);
                expect(mockRequest.reject.calledWith(sinon.match.instanceOf(Error))).toBe(true);

                // Should have cleared the queue
                expect((testService as any).requestQueue.size).toBe(0);

                // Restore original methods
                (testService as any).delayer.delay = originalDelay;
                testService.lint = originalLint;
            }, 10000); // Increase timeout to 10 seconds
        });
    });

    describe('trigger settings', () => {
        test('should respect lintOnChange setting', async () => {
            const service = CfnLintService.create(createMockComponents(), mockWorkerManager);
            await service.initialize();

            // Create base settings and disable lintOnChange
            const baseSettings = new SettingsState().toSettings();
            const settingsWithDisabledOnChange = {
                ...baseSettings,
                diagnostics: {
                    ...baseSettings.diagnostics,
                    cfnLint: {
                        ...baseSettings.diagnostics.cfnLint,
                        lintOnChange: false,
                    },
                },
            };
            const mockSettingsManager = createMockSettingsManager(settingsWithDisabledOnChange);
            service.configure(mockSettingsManager);

            const lintStub = sinon.stub(service, 'lint').resolves();

            // Should not lint when lintOnChange is disabled
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnChange);
            expect(lintStub.called).toBe(false);

            // Should still lint for other triggers
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnOpen);
            expect(lintStub.called).toBe(true);
        });

        test('should lint on open and save when cfnlint is enabled', async () => {
            const service = CfnLintService.create(createMockComponents(), mockWorkerManager);
            await service.initialize();

            // Use default settings where cfnlint is enabled
            const lintStub = sinon.stub(service, 'lint').resolves();

            // Should lint on open when cfnlint is enabled
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnOpen);
            expect(lintStub.calledOnce).toBe(true);

            lintStub.resetHistory();

            // Should lint on save when cfnlint is enabled
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnSave);
            expect(lintStub.calledOnce).toBe(true);
        });

        test('should not lint on open and save when cfnlint is disabled', async () => {
            const service = CfnLintService.create(createMockComponents(), mockWorkerManager);
            await service.initialize();

            // Create settings with cfnlint disabled
            const baseSettings = new SettingsState().toSettings();
            const settingsWithDisabledCfnLint = {
                ...baseSettings,
                diagnostics: {
                    ...baseSettings.diagnostics,
                    cfnLint: {
                        ...baseSettings.diagnostics.cfnLint,
                        enabled: false,
                    },
                },
            };
            const mockSettingsManager = createMockSettingsManager(settingsWithDisabledCfnLint);
            service.configure(mockSettingsManager);

            const lintStub = sinon.stub(service, 'lint').resolves();

            // Should not lint on open when cfnlint is disabled
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnOpen);
            expect(lintStub.called).toBe(false);

            // Should not lint on save when cfnlint is disabled
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnSave);
            expect(lintStub.called).toBe(false);
        });

        test('should clear queue and execute immediately for OnSave trigger', async () => {
            const mockDelayer = stubObject<Delayer<void>>(new Delayer<void>(1000));
            mockDelayer.delay.callsFake((key, callback, _delayMs) => callback());
            mockDelayer.cancel.returns();

            const service = CfnLintService.create(createMockComponents(), mockWorkerManager, mockDelayer);
            await service.initialize();

            const lintStub = sinon.stub(service, 'lint').resolves();

            // Test OnSave behavior
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnSave);

            // The delayer.delay method handles cancellation internally, so we don't expect explicit cancel calls
            // Should call delayer.delay with 0ms delay for OnSave
            const delayCall = mockDelayer.delay.getCall(0);
            expect(delayCall.args[0]).toBe(mockUri);
            expect(typeof delayCall.args[1]).toBe('function');
            expect(delayCall.args[2]).toBe(0);
            // Should call lint (through the delayer callback)
            expect(lintStub.calledWith(mockTemplate, mockUri)).toBe(true);

            lintStub.resetHistory();
            mockDelayer.delay.resetHistory();

            // Test OnChange behavior for comparison
            await service.lintDelayed(mockTemplate, mockUri, LintTrigger.OnChange);
            // Should call delayer.delay without custom delay (uses default)
            const changeDelayCall = mockDelayer.delay.getCall(0); // First call after reset
            expect(changeDelayCall.args[0]).toBe(mockUri);
            expect(typeof changeDelayCall.args[1]).toBe('function');
            expect(changeDelayCall.args[2]).toBe(undefined); // No custom delay provided
            // Should still call lint (through the delayer callback)
            expect(lintStub.calledWith(mockTemplate, mockUri)).toBe(true);
        });
    });
});
