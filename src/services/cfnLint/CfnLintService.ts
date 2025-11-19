import { performance } from 'perf_hooks';
import { DateTime } from 'luxon';
import { Diagnostic, WorkspaceFolder } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { CloudFormationFileType } from '../../document/Document';
import { DocumentManager } from '../../document/DocumentManager';
import { LspWorkspace } from '../../protocol/LspWorkspace';
import { CfnLspServerComponentsType } from '../../server/ServerComponents';
import { SettingsConfigurable, ISettingsSubscriber, SettingsSubscription } from '../../settings/ISettingsSubscriber';
import { DefaultSettings, CfnLintSettings } from '../../settings/Settings';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { Count, Telemetry } from '../../telemetry/TelemetryDecorator';
import { Closeable } from '../../utils/Closeable';
import { CancellationError, Delayer } from '../../utils/Delayer';
import { extractErrorMessage } from '../../utils/Errors';
import { byteSize } from '../../utils/String';
import { DiagnosticCoordinator } from '../DiagnosticCoordinator';
import { WorkerNotInitializedError } from './CfnLintErrors';
import { PyodideWorkerManager } from './PyodideWorkerManager';

export enum LintTrigger {
    OnOpen = 'onOpen',
    OnChange = 'onChange',
    OnSave = 'onSave',
}

enum STATUS {
    Uninitialized = 0,
    Initializing = 1,
    Initialized = 2,
}

/**
 * Sleep utility function for async delays
 * @param ms Number of milliseconds to sleep
 * @returns Promise that resolves after the specified delay
 */
export function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        // The setTimeout call is wrapped in a function body,
        // preventing an explicit return from the executor.
        setTimeout(resolve, ms);
    });
}

export class CfnLintService implements SettingsConfigurable, Closeable {
    private static readonly CFN_LINT_SOURCE = 'cfn-lint';

    private status: STATUS = STATUS.Uninitialized;
    private readonly delayer: Delayer<void>;
    private settings: CfnLintSettings;
    private settingsSubscription?: SettingsSubscription;
    private initializationPromise?: Promise<void>;
    private readonly workerManager: PyodideWorkerManager;
    private readonly log = LoggerFactory.getLogger(CfnLintService);
    private readonly mountedFolders = new Map<string, WorkspaceFolder>();

    @Telemetry() private readonly telemetry!: ScopedTelemetry;

    private logError(operation: string, error: unknown): void {
        this.log.error(error, `Error ${operation}`);
    }

    // Request queue for handling requests during initialization
    private readonly requestQueue = new Map<
        string,
        {
            content: string;
            forceUseContent: boolean;
            timestamp: number;
            resolve: () => void;
            reject: (reason: unknown) => void;
        }
    >();

    constructor(
        private readonly documentManager: DocumentManager,
        private readonly workspace: LspWorkspace,
        private readonly diagnosticCoordinator: DiagnosticCoordinator,
        workerManager?: PyodideWorkerManager,
        delayer?: Delayer<void>,
    ) {
        this.settings = DefaultSettings.diagnostics.cfnLint;
        this.delayer = delayer ?? new Delayer<void>(this.settings.delayMs);
        this.workerManager = workerManager ?? new PyodideWorkerManager(this.settings.initialization);
    }

    configure(settingsManager: ISettingsSubscriber): void {
        // Clean up existing subscription if present
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        // Set initial settings
        this.settings = settingsManager.getCurrentSettings().diagnostics.cfnLint;

        // Subscribe to diagnostics settings changes
        this.settingsSubscription = settingsManager.subscribe('diagnostics', (newDiagnosticsSettings) => {
            this.onSettingsChanged(newDiagnosticsSettings.cfnLint);
        });
    }

    private onSettingsChanged(newSettings: CfnLintSettings): void {
        this.settings = newSettings;
        // Note: Delayer delay is immutable, set at construction time
        // The new delayMs will be used for future operations that check this.settings.delayMs
    }

    /**
     * Initialize the cfn-lint service with Pyodide.
     * This method:
     * 1. Loads the Pyodide Python runtime in a worker thread
     * 2. Installs required packages (micropip, ssl)
     * 3. Installs cfn-lint via micropip
     * 4. Sets up Python functions for linting templates
     *
     * @throws Error if initialization fails at any step
     */
    public async initialize(): Promise<void> {
        if (this.status !== STATUS.Uninitialized) {
            return;
        }

        this.status = STATUS.Initializing;

        try {
            // Initialize the worker manager
            await this.workerManager.initialize();

            // Remount previously mounted folders after worker recovery
            if (this.mountedFolders.size > 0) {
                for (const [mountDir, folder] of this.mountedFolders) {
                    try {
                        const fsDir = URI.parse(folder.uri).fsPath;
                        await this.workerManager.mountFolder(fsDir, mountDir);
                    } catch (error) {
                        this.logError(`remounting folder ${mountDir}`, error);
                    }
                }
            }

            this.status = STATUS.Initialized;
            this.telemetry.count('initialized', 1);
        } catch (error) {
            this.status = STATUS.Uninitialized;
            this.telemetry.count('uninitialized', 1);
            throw new Error(`Failed to initialize Pyodide worker: ${extractErrorMessage(error)}`);
        }
    }

    /**
     * Mount a workspace folder to the Pyodide filesystem.
     * This allows cfn-lint to access files in the workspace for linting.
     *
     * @param folder The workspace folder to mount
     * @throws Error if the service is not initialized or mounting fails
     */
    public async mountFolder(folder: WorkspaceFolder): Promise<void> {
        if (this.status === STATUS.Uninitialized) {
            throw new Error('CfnLintService not initialized. Call initialize() first.');
        }

        const fsDir = URI.parse(folder.uri).fsPath;
        const mountDir = '/'.concat(folder.name);

        // Check if already mounted
        if (this.mountedFolders.has(mountDir)) {
            return;
        }

        try {
            await this.workerManager.mountFolder(fsDir, mountDir);
            this.mountedFolders.set(mountDir, folder);
            this.telemetry.count('mount.success', 1);
        } catch (error) {
            this.logError('mounting folder', error);
            this.telemetry.count('mount.fault', 1);
            throw error; // Re-throw to notify caller
        }
    }

    /**
     * Wait for the service to be initialized with exponential backoff
     * @param maxWaitTimeMs Maximum time to wait in milliseconds (default: 2 minutes)
     * @param initialDelayMs Initial delay between checks in milliseconds (default: 100ms)
     * @param maxDelayMs Maximum delay between checks in milliseconds (default: 5 seconds)
     * @returns Promise that resolves when initialized or rejects on timeout
     */
    private async waitForInitialization(
        maxWaitTimeMs: number = 120_000, // 2 minutes
        initialDelayMs: number = 100,
        maxDelayMs: number = 5000,
    ): Promise<void> {
        // Check if already initialized
        if (this.status === STATUS.Initialized) {
            return; // Service is ready
        }

        if (this.status === STATUS.Uninitialized) {
            throw new Error('CfnLintService is not initialized and not being initialized.');
        }

        const startTime = DateTime.now();
        const timeoutTime = startTime.plus({ milliseconds: maxWaitTimeMs });
        let currentDelay = initialDelayMs;

        while (DateTime.now() < timeoutTime) {
            // @ts-expect-error: This comparison is intentional to check if initialization completed while waiting
            if (this.status === STATUS.Initialized) {
                return; // Service is ready
            }

            // Wait before next check
            await sleep(currentDelay);

            // Exponential backoff with max delay cap
            currentDelay = Math.min(currentDelay * 1.5, maxDelayMs);
        }

        const elapsedMs = DateTime.now().diff(startTime).as('milliseconds');
        throw new Error(`CfnLintService initialization timeout after ${elapsedMs.toFixed(0)}ms`);
    }

    /**
     * Publish diagnostics to the LSP client via DiagnosticCoordinator
     *
     * @param uri The document URI
     * @param diagnostics The diagnostics to publish
     */
    private publishDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
        this.diagnosticCoordinator
            .publishDiagnostics(CfnLintService.CFN_LINT_SOURCE, uri, diagnostics)
            .catch((reason) => {
                this.logError('publishing diagnostics', reason);
            });
    }

    /**
     * Publish error diagnostics when linting fails
     *
     * @param uri The document URI
     * @param error The error that occurred
     */
    private publishErrorDiagnostics(uri: string, error: unknown): void {
        // Don't publish diagnostics for worker initialization errors, just log them
        if (error instanceof WorkerNotInitializedError) {
            this.log.warn('cfn-lint worker not initialized');
            return;
        }

        const errorMessage = extractErrorMessage(error);
        this.publishDiagnostics(uri, [
            {
                severity: 1, // Error severity
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                },
                message: `CFN Lint Error: ${errorMessage}`,
                source: CfnLintService.CFN_LINT_SOURCE,
                code: 'LINT_ERROR',
            },
        ]);
    }

    /**
     * Lint a standalone file (not in workspace) as a string
     *
     * @param content The document content
     * @param uri The document URI
     * @param fileType The CloudFormation file type
     */
    @Count({ name: 'lint.standaloneFile' })
    private async lintStandaloneFile(content: string, uri: string, fileType: CloudFormationFileType): Promise<void> {
        const startTime = performance.now();
        try {
            // Use worker to lint template
            const diagnosticPayloads = await this.workerManager.lintTemplate(content, uri, fileType);

            if (!diagnosticPayloads || diagnosticPayloads.length === 0) {
                // If no diagnostics were returned, publish empty diagnostics to clear any previous issues
                this.publishDiagnostics(uri, []);
            } else {
                // Publish each diagnostic payload
                for (const payload of diagnosticPayloads) {
                    await this.diagnosticCoordinator
                        .publishDiagnostics(CfnLintService.CFN_LINT_SOURCE, payload.uri, payload.diagnostics)
                        .catch((reason) => {
                            this.logError('publishing diagnostics', reason);
                        });
                }
            }
        } catch (error) {
            this.status = STATUS.Uninitialized;
            this.logError(`linting ${fileType} by string`, error);
            this.publishErrorDiagnostics(uri, error);
        } finally {
            this.telemetry.histogram(
                'lint.standaloneFile.duration',
                (performance.now() - startTime) / byteSize(content),
                {
                    unit: 'ms/byte',
                },
            );
        }
    }

    /**
     * Extract template file path from a GitSync deployment file
     *
     * @param content The deployment file content
     * @returns The template file path if found, undefined otherwise
     */
    private extractTemplatePathFromDeploymentFile(content: string): string | undefined {
        try {
            const deploymentFile = JSON.parse(content) as Record<string, unknown>;
            return typeof deploymentFile?.['template-file-path'] === 'string'
                ? deploymentFile['template-file-path']
                : undefined;
        } catch (error) {
            this.logError('parsing deployment file', error);
            return undefined;
        }
    }

    /**
     * Lint a workspace file using cfn-lint
     *
     * @param uri The document URI
     * @param folder The workspace folder
     * @param fileType The CloudFormation file type
     * @param content The document content (used for GitSync deployment files)
     */
    @Count({ name: 'lint.workspaceFile' })
    private async lintWorkspaceFile(
        uri: string,
        folder: WorkspaceFolder,
        fileType: CloudFormationFileType,
        content: string,
    ): Promise<void> {
        const startTime = performance.now();
        try {
            // Ensure folder is mounted before linting
            await this.mountFolder(folder);

            const relativePath = uri.replace(folder.uri, '/'.concat(folder.name));

            // Use worker to lint file
            const diagnosticPayloads = await this.workerManager.lintFile(relativePath, uri, fileType);

            if (!diagnosticPayloads || diagnosticPayloads.length === 0) {
                // Handle empty result case
                if (fileType === CloudFormationFileType.GitSyncDeployment) {
                    // For GitSync deployment files, extract template path and publish empty diagnostics
                    const templatePath = this.extractTemplatePathFromDeploymentFile(content);
                    if (templatePath) {
                        // Publish empty diagnostics for the template file
                        const templateUri = URI.file(templatePath).toString();
                        this.publishDiagnostics(templateUri, []);
                    } else {
                        this.log.warn(`Did not find template path in deployment file: ${templatePath}`);
                    }
                }
                // Publish empty diagnostics for the current file
                this.publishDiagnostics(uri, []);
            } else {
                // Publish each diagnostic payload
                for (const payload of diagnosticPayloads) {
                    await this.diagnosticCoordinator
                        .publishDiagnostics(CfnLintService.CFN_LINT_SOURCE, payload.uri, payload.diagnostics)
                        .catch((reason) => {
                            this.logError('publishing diagnostics', reason);
                        });
                }
            }
        } catch (error) {
            this.status = STATUS.Uninitialized;
            this.logError(`linting ${fileType} by file`, error);
            this.publishErrorDiagnostics(uri, error);
        } finally {
            this.telemetry.histogram(
                'lint.workspaceFile.duration',
                (performance.now() - startTime) / byteSize(content),
                {
                    unit: 'ms/byte',
                },
            );
        }
    }

    /**
     * Lint a document using cfn-lint.
     *
     * This method determines the file type and processes accordingly:
     * - CloudFormation templates: Standard cfn-lint processing
     * - GitSync deployment files: cfn-lint with deployment file support
     * - Other files: Returns empty diagnostics (not processed)
     *
     * This method waits for initialization to complete before processing.
     * It handles both standalone files (linted as strings) and workspace
     * files (linted as files with proper workspace context).
     *
     * If linting fails, returns diagnostics with error information instead of throwing.
     *
     * @param content The document content as a string
     * @param uri The document URI
     * @param forceUseContent If true, always use the provided content even for workspace files
     * @returns Promise that resolves when linting is complete
     * @throws Error if initialization fails or times out
     */
    public async lint(content: string, uri: string, forceUseContent: boolean = false): Promise<void> {
        // Check if this file should be processed by cfn-lint
        const fileType = this.documentManager.get(uri)?.cfnFileType;

        if (
            !fileType ||
            fileType === CloudFormationFileType.Other ||
            fileType === CloudFormationFileType.Unknown ||
            fileType === CloudFormationFileType.Empty
        ) {
            this.telemetry.count(`lint.file.skipped`, 1);
            this.publishDiagnostics(uri, []);
            return;
        }

        // Wait for initialization with timeout and exponential backoff
        try {
            await this.waitForInitialization();
        } catch (error) {
            this.telemetry.count('lint.uninitialized', 1);
            this.logError('waiting for CfnLintService initialization', error);
            throw error;
        }

        // Redundant check but clears up TypeScript errors
        if (this.status === STATUS.Uninitialized) {
            this.telemetry.count('lint.uninitialized', 1);
            throw new Error('CfnLintService not initialized. Call initialize() first.');
        }

        const folder = this.workspace.getWorkspaceFolder(uri);
        if (folder === undefined || folder === null || forceUseContent) {
            // GitSync deployment files require workspace context to resolve relative template paths
            if (fileType === CloudFormationFileType.GitSyncDeployment) {
                this.telemetry.count(`lint.file.${CloudFormationFileType.GitSyncDeployment}`, 1);

                this.logError(
                    `processing GitSync deployment file ${uri}`,
                    new Error('cannot be processed outside of a workspace context'),
                );
                this.publishDiagnostics(uri, []);
                return;
            }

            this.telemetry.count(`lint.file.${CloudFormationFileType.Template}`, 1);
            // Standalone file (not in workspace) or forced to use content - lint as string
            await this.lintStandaloneFile(content, uri, fileType);
        } else {
            // Workspace file - lint using file path
            await this.lintWorkspaceFile(uri, folder, fileType, content);
        }
    }

    /**
     * Ensure the service is initialized, starting initialization if needed.
     *
     * This method handles different initialization states:
     * - If already initialized: returns immediately
     * - If uninitialized: starts initialization process
     * - If initializing: waits for existing initialization to complete
     *
     * Uses Promise.race() to implement timeout protection against hanging initialization.
     *
     * @param timeoutMs Maximum time to wait for initialization in milliseconds (default: 2 minutes)
     * @throws Error if initialization fails or times out
     */
    private async ensureInitialized(timeoutMs: number = 120_000): Promise<void> {
        if (this.status === STATUS.Initialized) {
            return;
        }

        if (this.status === STATUS.Uninitialized) {
            this.initializationPromise = this.initialize();
        } else if (this.status === STATUS.Initializing) {
            // If initialization is in progress but we don't have a promise, create one
            this.initializationPromise ??= this.pollForInitialization();
        }

        // Wait for initialization to complete with timeout
        if (this.initializationPromise) {
            try {
                // Create a timeout promise with cleanup
                let timeoutId: NodeJS.Timeout | undefined;
                const timeoutPromise = new Promise<never>((_resolve, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new Error(`Initialization timeout after ${timeoutMs}ms`));
                    }, timeoutMs);
                });

                // Race between initialization and timeout
                try {
                    await Promise.race([this.initializationPromise, timeoutPromise]);
                } finally {
                    // Always clear the timeout to prevent hanging handles
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                }
                this.processQueuedRequests();
            } catch (error) {
                this.logError('during initialization', error);
                // Re-throw to let callers know initialization failed
                throw error;
            }
        }
    }

    /**
     * Poll for initialization to complete by checking the status with timeout protection.
     *
     * This method is used when initialization is already in progress but we don't have
     * a promise to wait on. It polls the status every 50ms until initialization completes
     * or times out.
     *
     * @param timeoutMs Maximum time to wait for initialization in milliseconds (default: 2 minutes)
     * @throws Error if initialization times out or fails
     */
    private async pollForInitialization(timeoutMs: number = 120_000): Promise<void> {
        const startTime = DateTime.now();
        const timeoutTime = startTime.plus({ milliseconds: timeoutMs });

        while (this.status === STATUS.Initializing && DateTime.now() < timeoutTime) {
            await sleep(50); // Wait 50ms between checks
        }

        // Check if we timed out
        if (DateTime.now() >= timeoutTime && this.status === STATUS.Initializing) {
            const elapsedMs = DateTime.now().diff(startTime).as('milliseconds');
            throw new Error(`Initialization polling timeout after ${elapsedMs.toFixed(0)}ms`);
        }

        if (this.status !== STATUS.Initialized) {
            throw new Error(`Initialization failed, status: ${STATUS[this.status]}`);
        }
    }

    /**
     * Process all queued requests after initialization completes
     */
    private processQueuedRequests(): void {
        if (this.requestQueue.size === 0) {
            return;
        }

        // Process each queued request through the delayer
        for (const [uri, request] of this.requestQueue.entries()) {
            // Use delayer for queued requests too, to maintain debouncing behavior
            this.delayer
                .delay(uri, () => this.lint(request.content, uri, request.forceUseContent))
                .then(() => {
                    request.resolve();
                })
                .catch((reason: unknown) => {
                    this.logError(`processing queued request for ${uri}`, reason);
                    request.reject(reason);
                });
        }

        // Clear the queue
        this.requestQueue.clear();
    }

    /**
     * Lint a document with debouncing and initialization handling.
     *
     * This method provides several key features:
     * - If the service is not initialized, it queues the request and triggers initialization
     * - If the service is ready, it processes the request immediately with debouncing
     * - Multiple rapid calls with the same URI will be debounced (last request wins)
     * - Queued requests are processed automatically after initialization completes
     * - Respects trigger-specific settings (lintOnChange for OnChange trigger)
     *
     * @param content The document content as a string
     * @param uri The document URI (used as the debouncing key)
     * @param trigger The trigger that initiated this linting request
     * @param forceUseContent If true, always use the provided content even for workspace files (default: false)
     * @returns Promise that resolves when linting is complete
     */
    public async lintDelayed(
        content: string,
        uri: string,
        trigger: LintTrigger,
        forceUseContent: boolean = false,
    ): Promise<void> {
        if (!this.settings.enabled) {
            return;
        }

        // Check trigger-specific settings
        switch (trigger) {
            case LintTrigger.OnOpen:
            case LintTrigger.OnSave: {
                // OnOpen and OnSave are controlled only by cfnlint.enabled
                // No additional configuration needed
                break;
            }
            case LintTrigger.OnChange: {
                if (!this.settings.lintOnChange) {
                    return;
                }
                break;
            }
            default: {
                this.log.warn(`Unknown lint trigger: ${trigger as string}`);
                return;
            }
        }

        if (this.status !== STATUS.Initialized) {
            // Create a promise that will be resolved when the queued request is processed
            return await new Promise<void>((resolve, reject) => {
                // Queue the request (overwrites previous request for same URI - "last request wins")
                this.requestQueue.set(uri, {
                    content,
                    forceUseContent,
                    timestamp: Date.now(),
                    resolve,
                    reject,
                });

                // Trigger initialization if needed (but don't await it here)
                this.ensureInitialized().catch((error) => {
                    this.logError('ensuring initialization', error);
                });
            });
        }

        // Service is ready, process based on trigger type
        try {
            if (trigger === LintTrigger.OnSave) {
                // For save operations: execute immediately (0ms delay)
                await this.delayer.delay(uri, () => this.lint(content, uri, forceUseContent), 0);
            } else {
                // For other triggers: use normal delayed execution
                await this.delayer.delay(uri, () => this.lint(content, uri, forceUseContent));
            }
        } catch (error) {
            // Suppress cancellation errors as they are expected behavior
            if (error instanceof CancellationError) {
                return;
            }
            throw error;
        }
    }

    /**
     * Cancel any pending delayed lint requests for a specific URI.
     *
     * @param uri The document URI to cancel requests for
     */
    public cancelDelayedLinting(uri: string): void {
        this.delayer.cancel(uri);
    }

    /**
     * Cancel all pending delayed lint requests.
     */
    public cancelAllDelayedLinting(): void {
        this.delayer.cancelAll();
    }

    /**
     * Get the number of pending delayed lint requests.
     *
     * @returns Number of pending requests
     */
    public getPendingLintCount(): number {
        return this.delayer.getPendingCount();
    }

    /**
     * Check if the cfn-lint service is fully initialized and ready to use.
     *
     * @returns true if the service is initialized and ready, false otherwise
     */
    public isInitialized(): boolean {
        return this.status === STATUS.Initialized;
    }

    /**
     * Shutdown the cfn-lint service and clean up resources.
     *
     * This method:
     * - Cancels all pending delayed lint requests
     * - Releases Pyodide resources
     * - Resets the service status to uninitialized
     */
    public async close(): Promise<void> {
        // Unsubscribe from settings changes
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }

        // Cancel all pending delayed requests
        this.delayer.cancelAll();

        if (this.status !== STATUS.Uninitialized) {
            // Shutdown worker manager
            await this.workerManager.shutdown();
            this.status = STATUS.Uninitialized;
        }
    }

    static create(
        components: CfnLspServerComponentsType,
        workerManager?: PyodideWorkerManager,
        delayer?: Delayer<void>,
    ) {
        return new CfnLintService(
            components.documentManager,
            components.workspace,
            components.diagnosticCoordinator,
            workerManager,
            delayer,
        );
    }
}
