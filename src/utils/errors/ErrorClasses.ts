export class CredentialsProviderError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'CredentialsProviderError';
        Object.setPrototypeOf(this, CredentialsProviderError.prototype);
    }
}

export class RequestCancellationError extends Error {
    constructor(key: string, options?: ErrorOptions) {
        super(`Request cancelled for key: ${key}`, options);
        this.name = 'CancellationError';
        Object.setPrototypeOf(this, RequestCancellationError.prototype);
    }
}

export class DoesNotExist extends Error {
    constructor(resource: string, options?: ErrorOptions) {
        super(`${resource} does not exist`, options);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, DoesNotExist.prototype);
    }
}

// ======= CFN LINT Errors =======
export class WorkerNotInitializedError extends Error {
    constructor(message: string = 'Worker not initialized', options?: ErrorOptions) {
        super(message, options);
        this.name = 'WorkerNotInitializedError';
        Object.setPrototypeOf(this, WorkerNotInitializedError.prototype);
    }
}

export class WorkerShutdownError extends Error {
    constructor(options?: ErrorOptions) {
        super('Worker shutdown', options);
        this.name = 'WorkerShutdownError';
        Object.setPrototypeOf(this, WorkerShutdownError.prototype);
    }
}

export class CfnLintInitializationError extends Error {
    public readonly phase: string;
    public readonly code: string;

    constructor(message: string, phase?: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'CfnLintInitializationError';
        this.phase = phase ?? 'unknown';
        this.code = `Init.${this.phase}`;
        Object.setPrototypeOf(this, CfnLintInitializationError.prototype);
    }
}

export class WorkerExitError extends Error {
    public readonly code = 'WorkerExit';

    constructor(
        public readonly exitCode: number,
        options?: ErrorOptions,
    ) {
        super(`Worker exited unexpectedly with code ${exitCode}`, options);
        this.name = 'WorkerExitError';
        Object.setPrototypeOf(this, WorkerExitError.prototype);
    }
}

export class WorkerFailureError extends Error {
    public readonly code = 'WorkerError';
    public override readonly cause?: Error;

    constructor(cause: Error, options?: ErrorOptions) {
        super(`Worker error: ${cause.message}`, { ...options, cause });
        this.name = 'WorkerFailureError';
        Object.setPrototypeOf(this, WorkerFailureError.prototype);
    }
}

export class MountError extends Error {
    public override readonly cause?: Error;

    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'MountError';
        Object.setPrototypeOf(this, MountError.prototype);
    }
}

export class DataStoreError extends Error {
    public override readonly cause?: Error;

    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'DataStoreError';
        Object.setPrototypeOf(this, DataStoreError.prototype);
    }
}

export class LMDBError extends DataStoreError {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'LMDBError';
        Object.setPrototypeOf(this, LMDBError.prototype);
    }
}

export class LMDBCrashError extends LMDBError {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'LMDBCrashError';
        Object.setPrototypeOf(this, LMDBCrashError.prototype);
    }
}

export type RetryErrorCode = 'RetryTimeout' | 'RetryExhausted';

export class RetryError extends Error {
    public override readonly cause?: Error;

    constructor(
        message: string,
        public readonly code: RetryErrorCode,
        cause?: Error,
        options?: ErrorOptions,
    ) {
        super(message, cause === undefined ? undefined : { ...options, cause });
        this.name = 'RetryError';
        Object.setPrototypeOf(this, RetryError.prototype);
    }
}
