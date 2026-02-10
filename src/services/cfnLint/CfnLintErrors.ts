export class WorkerNotInitializedError extends Error {
    constructor(message: string = 'Worker not initialized') {
        super(message);
        this.name = 'WorkerNotInitializedError';
    }
}

export class MountError extends Error {
    constructor(
        message: string,
        public readonly cause?: Error,
    ) {
        super(message);
        this.name = 'MountError';
    }
}
