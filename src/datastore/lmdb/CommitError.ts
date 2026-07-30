type CommitErrorCarrier = { commitError?: PromiseLike<unknown> };

/**
 * `rejectCommit()` creates `commitError` unsettled and only the `default:` branch of the write-thread
 * status switch ever rejects it, so paths that skip that branch leave it pending forever. Waiting
 * unbounded there would wedge the `put`/`remove`/`clear` that is awaiting it, so the diagnosis is
 * abandoned rather than allowed to block the caller.
 */
const ResolveTimeoutMs = 500;

/**
 * `lmdb-js` reports write-thread failures as `Error: Commit failed (see commitError for details)`
 * and attaches the real cause to `commitError` as an already-rejected promise
 * (`node_modules/lmdb/write.js`, `rejectCommit()`). The underlying errno is otherwise only written
 * to `console.error` inside the library, so without resolving this promise the actual cause — for
 * example "No space left on device" — never reaches telemetry.
 *
 * Attaching a handler also prevents the rejection from surfacing as an unhandled rejection.
 *
 * @returns the underlying cause, or `undefined` when the error is not an lmdb commit wrapper or the
 * promise did not settle within {@link ResolveTimeoutMs}.
 */
export async function resolveCommitError(error: unknown): Promise<unknown> {
    const commitError = (error as CommitErrorCarrier | undefined)?.commitError;
    if (typeof commitError?.then !== 'function') {
        return undefined;
    }

    const resolved = await raceWithTimeout(settleQuietly(commitError));
    return resolved === Unsettled ? undefined : resolved;
}

/**
 * Awaits either outcome without rethrowing. Both are informative: lmdb rejects with the real errno, and
 * a fulfilled value is still more than the opaque wrapper carries. Awaiting here also keeps the
 * rejection from surfacing as an unhandled one.
 */
async function settleQuietly(commitError: PromiseLike<unknown>): Promise<unknown> {
    try {
        return await commitError;
    } catch (reason: unknown) {
        return reason;
    }
}

async function raceWithTimeout(settled: Promise<unknown>): Promise<unknown> {
    let timer: NodeJS.Timeout | undefined;
    const timedOut = new Promise<typeof Unsettled>((resolve) => {
        timer = setTimeout(resolve, ResolveTimeoutMs, Unsettled);
        timer.unref();
    });

    try {
        return await Promise.race([settled, timedOut]);
    } finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}

/** Sentinel distinguishing "did not settle in time" from a genuine `undefined` cause. */
const Unsettled = Symbol('commitError.unsettled');

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
