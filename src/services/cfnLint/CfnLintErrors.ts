export class WorkerNotInitializedError extends Error {
    constructor(message: string = 'Worker not initialized', options?: ErrorOptions) {
        super(message, options);
        this.name = 'WorkerNotInitializedError';
        Object.setPrototypeOf(this, WorkerNotInitializedError.prototype);
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
