import path from 'path';
import { Worker } from 'worker_threads';
import type { ValidationReport } from '@aws/cloudformation-validate';
import { Closeable } from '../../utils/Closeable';
import { WorkerExitError, WorkerFailureError, WorkerShutdownError } from '../../utils/errors/ErrorClasses';
import type {
    CfnValidateOptions,
    CfnValidateRequest,
    CfnValidateResponse,
    CfnValidateWorkerFactory,
    Pending,
} from './cfn-validate-worker';

const VALIDATE_TIMEOUT_MS = 30_000;

export class CfnValidateEngine implements Closeable {
    private worker?: Worker;
    private ready?: Promise<void>;
    private rejectReady?: (error: Error) => void;
    private initialized = false;
    private failed = false;
    private pending?: Pending;
    private nextId = 0;
    private engineVersion?: string;

    constructor(private readonly createWorker: CfnValidateWorkerFactory = defaultWorker) {}

    initialize(): Promise<void> {
        this.ready ??= new Promise<void>((resolve, reject) => {
            this.rejectReady = reject;
            const worker = this.createWorker();
            this.worker = worker;
            worker.on('message', (message: CfnValidateResponse) => {
                if (this.worker !== worker) {
                    return;
                }
                if ('ready' in message) {
                    this.engineVersion = message.ready;
                    this.initialized = true;
                    resolve();
                } else if (message.id === this.pending?.id) {
                    if ('report' in message) {
                        this.takePending()?.resolve(message.report);
                    } else {
                        this.abort(worker, toError(message.error));
                    }
                }
            });
            worker.on('error', (error: Error) => this.abort(worker, new WorkerFailureError(error)));
            worker.on('exit', (code: number) => this.abort(worker, new WorkerExitError(code)));
        });
        return this.ready;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    isFailed(): boolean {
        return this.failed;
    }

    validate(content: string, path: string, options: CfnValidateOptions): Promise<ValidationReport> {
        const worker = this.worker;
        if (!worker || !this.initialized) {
            return Promise.reject(new Error('CfnValidateEngine is not initialized. Call initialize() first.'));
        }
        if (this.pending) {
            return Promise.reject(new Error('CfnValidateEngine is already validating'));
        }

        const id = ++this.nextId;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(
                () =>
                    this.abort(
                        worker,
                        new Error(`cloudformation-validate did not finish within ${VALIDATE_TIMEOUT_MS} ms`),
                    ),
                VALIDATE_TIMEOUT_MS,
            );
            this.pending = { id, resolve, reject, timer };
            const request: CfnValidateRequest = { id, content, path, severityLevel: options.severityLevel };
            worker.postMessage(request);
        });
    }

    version() {
        return this.engineVersion;
    }

    async close(): Promise<void> {
        const worker = this.discard();
        const shutdown = new WorkerShutdownError();
        this.rejectReady?.(shutdown);
        this.takePending()?.reject(shutdown);
        await worker?.terminate();
    }

    private abort(worker: Worker, error: Error): void {
        if (this.worker !== worker) {
            return;
        }
        this.failed = true;
        void this.discard()?.terminate();
        this.rejectReady?.(error);
        this.takePending()?.reject(error);
    }

    private discard(): Worker | undefined {
        const worker = this.worker;
        this.worker = undefined;
        this.initialized = false;
        return worker;
    }

    private takePending(): Pending | undefined {
        const pending = this.pending;
        if (pending) {
            clearTimeout(pending.timer);
            this.pending = undefined;
        }
        return pending;
    }
}

function toError({ name, message, stack }: { name: string; message: string; stack?: string }): Error {
    const error = new Error(message);
    error.name = name;
    if (stack !== undefined) {
        error.stack = stack;
    }
    return error;
}

function defaultWorker(): Worker {
    return new Worker(path.join(__dirname, 'cfn-validate-worker.js'), {
        resourceLimits: { maxOldGenerationSizeMb: 128 },
    });
}
