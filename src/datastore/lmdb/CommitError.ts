type CommitErrorCarrier = { commitError?: PromiseLike<unknown> };

/**
 * `lmdb-js` reports write-thread failures as `Error: Commit failed (see commitError for details)`
 * and attaches the real cause to `commitError` as an already-rejected promise
 * (`node_modules/lmdb/write.js`, `rejectCommit()`). The underlying errno is otherwise only written
 * to `console.error` inside the library, so without resolving this promise the actual cause — for
 * example "No space left on device" — never reaches telemetry.
 *
 * Attaching a handler also prevents the rejection from surfacing as an unhandled rejection.
 *
 * @returns the underlying cause, or `undefined` when the error is not an lmdb commit wrapper.
 */
export async function resolveCommitError(error: unknown): Promise<unknown> {
    const commitError = (error as CommitErrorCarrier | undefined)?.commitError;
    if (typeof commitError?.then !== 'function') {
        return undefined;
    }

    try {
        return await commitError;
    } catch (reason: unknown) {
        return reason;
    }
}

/**
 * Moves a resolved commit cause onto the error's standard `cause` property.
 *
 * `extractRootCause` looks for `commitError instanceof Error`, which never matches because lmdb-js
 * stores a promise there, but it does read `cause`. Promoting the resolved value lets the shared
 * attribute extraction emit `error.cause.type`, `error.cause.code` and `error.cause.message` for the
 * real failure instead of only the opaque "Commit failed" wrapper.
 */
export function attachCommitCause(error: unknown, cause: unknown): void {
    if (!(error instanceof Error) || cause === undefined || error.cause !== undefined) {
        return;
    }

    error.cause = cause;
}
