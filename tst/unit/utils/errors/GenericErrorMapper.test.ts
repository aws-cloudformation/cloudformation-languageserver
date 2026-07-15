import { describe, expect, it } from 'vitest';
import {
    classifyGenericError,
    isClientNetworkError,
    isClientTlsError,
} from '../../../../src/utils/errors/GenericErrorMapper';
import {
    CfnLintInitializationError,
    MountError,
    RequestCancellationError,
    WorkerNotInitializedError,
} from '../../../../src/utils/errors/ErrorClasses';

describe('GenericErrorMapper', () => {
    describe('classifyGenericError', () => {
        it.each([
            ['ENOTFOUND', 'network'],
            ['ECONNRESET', 'network'],
            ['ENETDOWN', 'network'],
            ['EADDRNOTAVAIL', 'network'],
            ['ERR_SOCKET_CONNECTION_TIMEOUT', 'network'],
            ['UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'tls'],
            ['SELF_SIGNED_CERT_IN_CHAIN', 'tls'],
            ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'tls'],
            ['CERT_HAS_EXPIRED', 'tls'],
            ['ERR_TLS_CERT_ALTNAME_INVALID', 'tls'],
            ['ENOENT', 'filesystem'],
            ['EACCES', 'filesystem'],
            ['EPERM', 'filesystem'],
            ['EBADF', 'filesystem'],
            ['ERR_INVALID_ARG_TYPE', 'validation'],
            ['ERR_INVALID_ARG_VALUE', 'validation'],
            ['ERR_INVALID_URL', 'validation'],
            ['ERR_SOCKET_BAD_PORT', 'validation'],
        ])('should classify code %s as %s', (code, category) => {
            const error = Object.assign(new Error('operation failed'), { code });

            expect(classifyGenericError(error)).toBe(category);
        });

        it('should classify TLS errors from their message when no code is available', () => {
            const error = new Error('unable to get local issuer certificate');

            expect(classifyGenericError(error)).toBe('tls');
        });

        it.each([400, 404, 500, 503])('should classify generic HTTP %i responses as http', (status) => {
            const error = Object.assign(new Error('request failed'), { response: { status } });

            expect(classifyGenericError(error)).toBe('http');
        });

        it('should classify request cancellation errors', () => {
            expect(classifyGenericError(new RequestCancellationError('refresh'))).toBe('cancellation');
        });

        it.each([
            new CfnLintInitializationError('worker failed'),
            new MountError('mount failed'),
            new WorkerNotInitializedError(),
        ])('should classify cfn-lint errors', (error) => {
            expect(classifyGenericError(error)).toBe('cfn_lint');
        });

        it.each(['MDB_CORRUPTED', 'MDB_MAP_FULL', 'MDB_PAGE_NOTFOUND'])(
            'should classify LMDB code %s as lmdb',
            (code) => {
                const error = Object.assign(new Error('database operation failed'), { code });

                expect(classifyGenericError(error)).toBe('lmdb');
            },
        );

        it('should classify LMDB failures from their message when no code is available', () => {
            expect(classifyGenericError(new Error('MDB_PANIC: unrecoverable'))).toBe('lmdb');
        });

        it.each([new Error('plain failure'), 'string failure', null, undefined])(
            'should leave unrecognized errors uncategorized',
            (error) => {
                expect(classifyGenericError(error)).toBeUndefined();
            },
        );
    });

    describe('isClientNetworkError', () => {
        it.each([
            'read ECONNRESET',
            'connect ETIMEDOUT',
            'connect ECONNREFUSED',
            'getaddrinfo ENOTFOUND',
            'getaddrinfo EAI_AGAIN',
            'read ECONNABORTED',
            'socket hang up',
            'network socket disconnected',
            'TOO_MANY_REDIRECTS',
            'Parse Error: Expected HTTP/',
            'Request failed with status code 407',
        ])('should recognize network message %s', (message) => {
            expect(isClientNetworkError(new Error(message))).toBe(true);
        });

        it('should inspect error codes in addition to messages', () => {
            const resetError = Object.assign(new Error('operation failed'), { code: 'ECONNRESET' });

            expect(isClientNetworkError(resetError)).toBe(true);
        });

        it('should include TLS errors as client network errors', () => {
            expect(isClientNetworkError(new Error('unable to get local issuer certificate'))).toBe(true);
        });

        it.each(['Request failed with status code 500', 'Internal server error', 'Unexpected token'])(
            'should not classify non-network message %s',
            (message) => {
                expect(isClientNetworkError(new Error(message))).toBe(false);
            },
        );

        it('should handle non-Error values and ignore non-string fields', () => {
            expect(isClientNetworkError('ECONNRESET')).toBe(true);
            expect(isClientNetworkError('random string')).toBe(false);
            expect(isClientNetworkError(null)).toBe(false);
            expect(isClientNetworkError(undefined)).toBe(false);
            expect(
                isClientNetworkError(
                    Object.assign(new Error('connect ECONNREFUSED 127.0.0.1'), { code: 42, name: 99 }),
                ),
            ).toBe(true);
            expect(isClientNetworkError(Object.assign(new Error('unrelated'), { code: 1, name: 2 }))).toBe(false);
        });
    });

    describe('isClientTlsError', () => {
        it('should recognize TLS codes and message patterns', () => {
            expect(
                isClientTlsError(
                    Object.assign(new Error('certificate verification failed'), {
                        code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
                    }),
                ),
            ).toBe(true);
            expect(isClientTlsError(new Error('self signed certificate in certificate chain'))).toBe(true);
        });

        it('should reject non-TLS network and generic errors', () => {
            expect(isClientTlsError(Object.assign(new Error('connection reset'), { code: 'ECONNRESET' }))).toBe(false);
            expect(isClientTlsError(new Error('plain failure'))).toBe(false);
        });
    });
});
