export class WorkerNotInitializedError extends Error {
    constructor(message: string = 'Worker not initialized') {
        super(message);
        this.name = 'WorkerNotInitializedError';
    }
}
