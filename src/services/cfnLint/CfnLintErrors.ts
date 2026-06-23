export class WorkerNotInitializedError extends Error {
    constructor(message: string = 'Worker not initialized', options?: ErrorOptions) {
        super(message, options);
        this.name = 'WorkerNotInitializedError';
        Object.setPrototypeOf(this, WorkerNotInitializedError.prototype);
    }
}

export class InitializationError extends Error {
    public readonly phase: string;

    constructor(message: string, phase?: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'InitializationError';
        this.phase = phase ?? 'unknown';
        Object.setPrototypeOf(this, InitializationError.prototype);
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
