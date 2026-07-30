import { describe, expect, it } from 'vitest';
import { attachCommitCause, resolveCommitError } from '../../../../src/datastore/lmdb/CommitError';
import { errorAttributes, errorType } from '../../../../src/utils/errors/ErrorStackInfo';
import { extractRootCause } from '../../../../src/utils/errors/ErrorUtils';

/**
 * Builds the error shape lmdb-js throws for a write-thread failure: an opaque wrapper whose real
 * cause is an already-rejected promise on `commitError`.
 */
function commitFailure(cause: Error): Error {
    const commitError = new Promise<never>((_resolve, reject) => {
        reject(cause);
    });
    return Object.assign(new Error('Commit failed (see commitError for details)'), { commitError });
}

describe('resolveCommitError', () => {
    it('should return the rejection reason hidden behind the commit wrapper', async () => {
        const cause = new Error('No space left on device: Attempting to write page at position 191807488');

        const resolved = await resolveCommitError(commitFailure(cause));

        expect(resolved).toBe(cause);
    });

    it('should return undefined for a store error that is not a commit wrapper', async () => {
        expect(await resolveCommitError(new Error('MDB_BAD_TXN: Transaction must abort'))).toBeUndefined();
    });

    it('should return undefined when commitError is not a promise', async () => {
        const error = Object.assign(new Error('Commit failed'), { commitError: 'ENOSPC' });

        expect(await resolveCommitError(error)).toBeUndefined();
    });

    it('should return undefined for absent errors', async () => {
        expect(await resolveCommitError(undefined)).toBeUndefined();
        expect(await resolveCommitError(null)).toBeUndefined();
    });

    it('should resolve a non-Error rejection reason', async () => {
        // lmdb-js rejects with whatever its native layer produced, which is not guaranteed to be an
        // Error, so the resolver has to cope with a bare value.
        const commitError = new Promise<never>((_resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            reject('disk full');
        });
        const error = Object.assign(new Error('Commit failed'), { commitError });

        expect(await resolveCommitError(error)).toBe('disk full');
    });

    it('should return the fulfilled value when the commit promise resolves instead of rejecting', async () => {
        const error = Object.assign(new Error('Commit failed'), { commitError: Promise.resolve('recovered') });

        expect(await resolveCommitError(error)).toBe('recovered');
    });

    it('should attach a handler so the rejected commit promise never surfaces as unhandled', async () => {
        const rejections: unknown[] = [];
        const onUnhandled = (reason: unknown) => rejections.push(reason);
        process.on('unhandledRejection', onUnhandled);

        try {
            await resolveCommitError(commitFailure(new Error('ENOSPC')));
            // Unhandled rejections are reported on a later macrotask, so let the queue drain.
            await new Promise((resolve) => setTimeout(resolve, 10));
        } finally {
            process.off('unhandledRejection', onUnhandled);
        }

        expect(rejections).toEqual([]);
    });
});

describe('attachCommitCause', () => {
    it('should expose the underlying failure through the shared error attributes', async () => {
        // The real lmdb out-of-disk error carries a numeric `code: 28`, which `extractErrorCode`
        // deliberately ignores, so the message is what carries the diagnosis here.
        const outOfDisk = Object.assign(new Error('No space left on device: writing page'), { code: 28 });
        const wrapper = commitFailure(outOfDisk);

        attachCommitCause(wrapper, await resolveCommitError(wrapper));

        // Without this promotion `extractRootCause` finds nothing: it tests `commitError instanceof
        // Error`, and lmdb-js stores a promise there.
        expect(extractRootCause(wrapper)).toBe(outOfDisk);
        expect(errorType(wrapper)['error.cause.type']).toBe('Error');
        expect(errorAttributes(wrapper)['error.cause.message']).toContain('No space left on device');
    });

    it('should expose a symbolic cause code when the underlying error carries one', async () => {
        const wrapper = commitFailure(
            Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' }),
        );

        attachCommitCause(wrapper, await resolveCommitError(wrapper));

        expect(errorType(wrapper)['error.cause.code']).toBe('ENOSPC');
    });

    it('should keep the wrapper message so both layers are reported', async () => {
        const wrapper = commitFailure(new Error('No space left on device: writing page'));

        attachCommitCause(wrapper, await resolveCommitError(wrapper));

        expect(errorAttributes(wrapper)['error.message']).toContain('Commit failed');
        expect(errorAttributes(wrapper)['error.cause.message']).toContain('No space left on device');
    });

    it('should not overwrite a cause that is already set', async () => {
        const originalCause = new Error('original');
        const wrapper = commitFailure(new Error('resolved'));
        wrapper.cause = originalCause;

        attachCommitCause(wrapper, await resolveCommitError(wrapper));

        expect(wrapper.cause).toBe(originalCause);
    });

    it('should ignore an absent cause and non-Error targets', () => {
        const wrapper = new Error('Commit failed');
        attachCommitCause(wrapper, undefined);
        expect(wrapper.cause).toBeUndefined();

        expect(() => attachCommitCause('not an error', new Error('cause'))).not.toThrow();
    });
});
