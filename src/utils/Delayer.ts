interface DelayedRequest<T> {
    executor: () => Promise<T>;
    resolve: (result: T) => void;
    reject: (error: Error) => void;
    timestamp: number;
}

/**
 * A generic delayer that debounces async operations by key.
 * Only the last request within the delay window gets executed.
 * Prevents concurrent executions for the same key.
 */
export class Delayer<T> {
    private readonly pendingRequests: Map<string, DelayedRequest<T>> = new Map();
    private readonly timers: Map<string, NodeJS.Timeout> = new Map();
    private readonly runningRequests: Map<string, Promise<T>> = new Map();
    private readonly delayMs: number;

    constructor(delayMs: number = 500) {
        this.delayMs = delayMs;
    }

    /**
     * Queue a request with debouncing by key.
     * If a request with the same key is already pending, it will be cancelled.
     * If a request with the same key is already running, the new request will wait for it to complete.
     *
     * @param key Unique identifier for the request (e.g., document URI)
     * @param executor Function that returns a Promise to execute
     * @param delayMs Optional delay override for this specific request
     * @returns Promise that resolves with the result or rejects with an error
     */
    public delay(key: string, executor: () => Promise<T>, delayMs?: number): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // Cancel any existing pending request for this key
            this.cancel(key);

            // Check if there's already a running request for this key
            const runningRequest = this.runningRequests.get(key);
            if (runningRequest) {
                // There's already a request running for this key
                // Queue this new request to execute after the current one completes
                runningRequest
                    .catch(() => {
                        // Ignore errors from the previous request
                        // We only care that it completed
                    })
                    .finally(() => {
                        // The running request completed, now execute the new request
                        this.executeRequest(key, executor, resolve, reject);
                    });
                return;
            }

            // No running request, proceed with normal delay logic
            this.scheduleRequest(key, executor, resolve, reject, delayMs);
        });
    }

    /**
     * Schedule a request to be executed after the delay
     */
    private scheduleRequest(
        key: string,
        executor: () => Promise<T>,
        resolve: (result: T) => void,
        reject: (error: Error) => void,
        delayMs?: number,
    ): void {
        // Store the new request
        const request: DelayedRequest<T> = {
            executor,
            resolve,
            reject,
            timestamp: Date.now(),
        };
        this.pendingRequests.set(key, request);

        // Use provided delay or fall back to instance default
        const actualDelay = delayMs ?? this.delayMs;

        // Set up the delay timer
        const timer = setTimeout(() => {
            const pendingRequest = this.pendingRequests.get(key);
            if (pendingRequest === request) {
                // This is still the latest request, execute it
                this.pendingRequests.delete(key);
                this.timers.delete(key);
                this.executeRequest(key, executor, resolve, reject);
            }
            // If it's not the latest request, it was already cancelled
        }, actualDelay);

        this.timers.set(key, timer);
    }

    /**
     * Execute a request and track it as running
     */
    private executeRequest(
        key: string,
        executor: () => Promise<T>,
        resolve: (result: T) => void,
        reject: (error: Error) => void,
    ): void {
        // Execute the async function
        const executionPromise = executor();

        // Track this as a running request (track the original promise)
        this.runningRequests.set(key, executionPromise);

        // Handle the result
        executionPromise
            .then((result) => {
                resolve(result);
            })
            .catch((error) => {
                const errorObj = error instanceof Error ? error : new Error(String(error));
                reject(errorObj);
            })
            .finally(() => {
                // Remove from running requests when complete
                this.runningRequests.delete(key);
            });
    }

    /**
     * Cancel pending requests for a specific key.
     * Note: Running requests cannot be cancelled, but new requests won't be queued behind them.
     * The cancelled request's promise will be rejected with a cancellation error.
     *
     * @param key The key to cancel requests for
     */
    public cancel(key: string): void {
        const request = this.pendingRequests.get(key);
        const timer = this.timers.get(key);

        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }

        if (request) {
            this.pendingRequests.delete(key);
            request.reject(new Error(`Request cancelled for key: ${key}`));
        }

        // Note: We don't cancel running requests as they can't be safely cancelled
        // The running request will complete and clean itself up
    }

    /**
     * Cancel all pending requests.
     * Note: Running requests cannot be cancelled.
     * All cancelled requests' promises will be rejected with cancellation errors.
     */
    public cancelAll(): void {
        // Cancel all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();

        // Reject all pending requests
        for (const [key, request] of this.pendingRequests.entries()) {
            request.reject(new Error(`Request cancelled for key: ${key}`));
        }
        this.pendingRequests.clear();

        // Note: We don't cancel running requests as they can't be safely cancelled
        // Running requests will complete and clean themselves up
    }

    /**
     * Get the number of pending requests.
     *
     * @returns Number of requests currently waiting to be executed
     */
    public getPendingCount(): number {
        return this.pendingRequests.size;
    }

    /**
     * Get the number of running requests.
     *
     * @returns Number of requests currently being executed
     */
    public getRunningCount(): number {
        return this.runningRequests.size;
    }

    /**
     * Get the total number of active requests (pending + running).
     *
     * @returns Total number of active requests
     */
    public getActiveCount(): number {
        return this.getPendingCount() + this.getRunningCount();
    }

    /**
     * Check if there are any pending requests for a specific key.
     *
     * @param key The key to check
     * @returns True if there are pending requests for the key
     */
    public hasPending(key: string): boolean {
        return this.pendingRequests.has(key);
    }

    /**
     * Check if there are any running requests for a specific key.
     *
     * @param key The key to check
     * @returns True if there are running requests for the key
     */
    public hasRunning(key: string): boolean {
        return this.runningRequests.has(key);
    }

    /**
     * Check if there are any active requests (pending or running) for a specific key.
     *
     * @param key The key to check
     * @returns True if there are active requests for the key
     */
    public hasActive(key: string): boolean {
        return this.hasPending(key) || this.hasRunning(key);
    }

    /**
     * Get all keys that have pending requests.
     *
     * @returns Array of keys with pending requests
     */
    public getPendingKeys(): string[] {
        return [...this.pendingRequests.keys()];
    }

    /**
     * Get all keys that have running requests.
     *
     * @returns Array of keys with running requests
     */
    public getRunningKeys(): string[] {
        return [...this.runningRequests.keys()];
    }

    /**
     * Get all keys that have active requests (pending or running).
     *
     * @returns Array of keys with active requests
     */
    public getActiveKeys(): string[] {
        const pendingKeys = this.getPendingKeys();
        const runningKeys = this.getRunningKeys();
        return [...new Set([...pendingKeys, ...runningKeys])];
    }

    /**
     * Get the delay time in milliseconds.
     *
     * @returns The configured delay time
     */
    public getDelayMs(): number {
        return this.delayMs;
    }
}
