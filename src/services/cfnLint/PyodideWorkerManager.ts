import path from 'path';
import { Worker } from 'worker_threads';
import { PublishDiagnosticsParams } from 'vscode-languageserver';
import { CloudFormationFileType } from '../../document/Document';
import { CfnLintInitializationSettings } from '../../settings/Settings';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';
import { retryWithExponentialBackoff } from '../../utils/Retry';
import { WorkerNotInitializedError } from './CfnLintErrors';

interface WorkerTask {
    id: string;
    action: string;
    payload: Record<string, unknown>;
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
}

interface WorkerMessage {
    id?: string;
    type?: string;
    result?: unknown;
    error?: string;
    success?: boolean;
    data?: string;
}

export class PyodideWorkerManager {
    private worker: Worker | undefined = undefined;
    private nextTaskId = 1;
    private readonly tasks = new Map<string, WorkerTask>();
    private initialized = false;
    private initializationPromise: Promise<void> | undefined = undefined;

    constructor(
        private readonly retryConfig: CfnLintInitializationSettings,
        private readonly log = LoggerFactory.getLogger(PyodideWorkerManager),
    ) {}

    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        if (this.initializationPromise) {
            return await this.initializationPromise;
        }

        this.initializationPromise = this.initializeWithRetry();
        return await this.initializationPromise;
    }

    private async initializeWithRetry(): Promise<void> {
        return await retryWithExponentialBackoff(
            async () => {
                return await this.initializeWorker();
            },
            {
                maxRetries: this.retryConfig.maxRetries,
                initialDelayMs: this.retryConfig.initialDelayMs,
                maxDelayMs: this.retryConfig.maxDelayMs,
                backoffMultiplier: this.retryConfig.backoffMultiplier,
                jitterFactor: 0.1, // Add 10% jitter to prevent synchronized retry storms
                operationName: 'Pyodide initialization',
                totalTimeoutMs: this.retryConfig.totalTimeoutMs,
            },
            this.log,
        );
    }

    private async initializeWorker(): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            try {
                // Create worker
                // Use a path relative to the current file
                const workerPath = path.join(__dirname, 'pyodide-worker.js');
                this.log.info(`Loading worker from: ${workerPath}`);
                this.worker = new Worker(workerPath);

                // Add exit event handler to detect crashes
                this.worker.on('exit', (code) => {
                    if (code !== 0) {
                        this.log.error(`Worker exited unexpectedly with code ${code}`);
                        this.initialized = false;
                        this.worker = undefined;

                        // Reject any pending tasks
                        for (const task of this.tasks.values()) {
                            task.reject(new Error(`Worker exited unexpectedly with code ${code}`));
                        }
                        this.tasks.clear();
                    }
                });

                // Set up message handler
                this.worker.on('message', this.handleWorkerMessage.bind(this));

                // Set up error handler
                this.worker.on('error', (error) => {
                    this.log.error(error, 'Worker error');
                    reject(new Error(`Worker error: ${error.message}`));
                });

                // Initialize Pyodide in the worker
                const taskId = this.nextTaskId.toString();
                this.nextTaskId++;

                const task: WorkerTask = {
                    id: taskId,
                    action: 'initialize',
                    payload: {},
                    resolve: () => {
                        this.initialized = true;
                        resolve();
                    },
                    reject: (reason: Error) => {
                        this.worker = undefined;
                        reject(reason);
                    },
                };

                this.tasks.set(taskId, task);
                this.worker.postMessage({
                    id: taskId,
                    action: 'initialize',
                    payload: {},
                });
            } catch (error) {
                this.worker = undefined;
                reject(error instanceof Error ? error : new Error(extractErrorMessage(error)));
            }
        });
    }

    private handleWorkerMessage(message: WorkerMessage): void {
        // Handle stdout/stderr messages
        if (message.type === 'stdout') {
            this.log.info({ message }, 'Pyodide stdout');
            return;
        }

        if (message.type === 'stderr') {
            this.log.error({ message }, 'Pyodide stderr');
            return;
        }

        // Handle task responses
        const id = message.id;
        if (!id) {
            return; // Ignore messages without an ID
        }

        const task = this.tasks.get(id);
        if (!task) {
            this.log.error(`Received response for unknown task: ${id}`);
            return;
        }

        this.tasks.delete(id);

        if (message.success) {
            task.resolve(message.result);
        } else {
            task.reject(new Error(message.error));
        }
    }

    public async lintTemplate(
        content: string,
        uri: string,
        fileType: CloudFormationFileType,
    ): Promise<PublishDiagnosticsParams[]> {
        return await this.executeTask<PublishDiagnosticsParams[]>('lint', { content, uri, fileType });
    }

    public async lintFile(
        path: string,
        uri: string,
        fileType: CloudFormationFileType,
    ): Promise<PublishDiagnosticsParams[]> {
        return await this.executeTask<PublishDiagnosticsParams[]>('lintFile', { path, uri, fileType });
    }

    public async mountFolder(fsDir: string, mountDir: string): Promise<void> {
        await this.executeTask<{ mounted: boolean; mountDir: string }>('mountFolder', { fsDir, mountDir });
    }

    private async executeTask<T>(action: string, payload: Record<string, unknown>): Promise<T> {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.worker) {
            throw new WorkerNotInitializedError();
        }

        return await new Promise<T>((resolve, reject) => {
            const taskId = this.nextTaskId.toString();
            this.nextTaskId++;

            const task: WorkerTask = {
                id: taskId,
                action,
                payload,
                resolve: (result: unknown) => resolve(result as T),
                reject,
            };

            this.tasks.set(taskId, task);
            if (this.worker) {
                this.worker.postMessage({ id: taskId, action, payload });
            } else {
                reject(new WorkerNotInitializedError());
            }
        });
    }

    public async shutdown(): Promise<void> {
        if (this.worker) {
            // Reject all pending tasks
            for (const task of this.tasks.values()) {
                task.reject(new Error('Worker shutdown'));
            }
            this.tasks.clear();

            // Terminate worker and wait for completion
            try {
                await this.worker.terminate();
            } catch (error) {
                this.log.error(error, 'Error terminating worker');
            }
            this.worker = undefined;
            this.initialized = false;
            this.initializationPromise = undefined;
        }
    }
}
