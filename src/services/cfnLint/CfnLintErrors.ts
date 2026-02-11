export class WorkerNotInitializedError extends Error {
    constructor(message: string = 'Worker not initialized') {
        super(message);
        this.name = 'WorkerNotInitializedError';
    }
}

export class MountError extends Error {
    public override readonly cause?: Error;

    constructor(message: string, cause?: Error) {
        super(message);
        this.name = 'MountError';
        this.cause = cause;
    }
}
