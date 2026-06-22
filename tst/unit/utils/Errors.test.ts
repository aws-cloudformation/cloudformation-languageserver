import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { describe, expect, test } from 'vitest';
import {
    DoesNotExist,
    extractErrorCode,
    extractErrorMessage,
    extractHttpStatus,
    extractRootCause,
    extractStatusReason,
    handleLspError,
    isClientNetworkError,
} from '../../../src/utils/Errors';

describe('Errors', () => {
    describe('isClientNetworkError', () => {
        test('returns true for SSL certificate errors', () => {
            expect(isClientNetworkError(new Error('unable to get local issuer certificate'))).toBe(true);
            expect(isClientNetworkError(new Error('self signed certificate in certificate chain'))).toBe(true);
            expect(isClientNetworkError(new Error('unable to verify the first certificate'))).toBe(true);
            expect(isClientNetworkError(new Error('certificate has expired'))).toBe(true);
            expect(isClientNetworkError(new Error('Hostname does not match certificate altnames'))).toBe(true);
            expect(isClientNetworkError(new Error('WRONG_VERSION_NUMBER'))).toBe(true);
        });

        test('returns true for network connectivity errors', () => {
            expect(isClientNetworkError(new Error('read ECONNRESET'))).toBe(true);
            expect(isClientNetworkError(new Error('connect ETIMEDOUT'))).toBe(true);
            expect(isClientNetworkError(new Error('connect ECONNREFUSED'))).toBe(true);
            expect(isClientNetworkError(new Error('getaddrinfo ENOTFOUND'))).toBe(true);
            expect(isClientNetworkError(new Error('getaddrinfo EAI_AGAIN'))).toBe(true);
            expect(isClientNetworkError(new Error('read ECONNABORTED'))).toBe(true);
            expect(isClientNetworkError(new Error('socket hang up'))).toBe(true);
            expect(isClientNetworkError(new Error('network socket disconnected'))).toBe(true);
            expect(isClientNetworkError(new Error('TOO_MANY_REDIRECTS'))).toBe(true);
            expect(isClientNetworkError(new Error('Parse Error: Expected HTTP/'))).toBe(true);
        });

        test('returns true for proxy authentication errors', () => {
            expect(isClientNetworkError(new Error('Request failed with status code 407'))).toBe(true);
        });

        test('returns false for server-side errors', () => {
            expect(isClientNetworkError(new Error('Request failed with status code 500'))).toBe(false);
            expect(isClientNetworkError(new Error('Request failed with status code 503'))).toBe(false);
            expect(isClientNetworkError(new Error('Internal server error'))).toBe(false);
        });

        test('returns false for non-network errors', () => {
            expect(isClientNetworkError(new Error('Unexpected token'))).toBe(false);
            expect(isClientNetworkError(new Error('Cannot read property of undefined'))).toBe(false);
        });

        test('inspects error code in addition to message', () => {
            const redirectError = Object.assign(new Error('Maximum number of redirects exceeded'), {
                code: 'ERR_FR_TOO_MANY_REDIRECTS',
            });
            expect(isClientNetworkError(redirectError)).toBe(true);

            const resetByCode = Object.assign(new Error('something went wrong'), { code: 'ECONNRESET' });
            expect(isClientNetworkError(resetByCode)).toBe(true);
        });

        test('does not misclassify a server error that lacks a client-side code or name', () => {
            const serverError = Object.assign(new Error('Request failed with status code 503'), {
                code: 'ERR_BAD_RESPONSE',
                name: 'AxiosError',
            });
            expect(isClientNetworkError(serverError)).toBe(false);
        });

        test('handles non-Error values', () => {
            expect(isClientNetworkError('ECONNRESET')).toBe(true);
            expect(isClientNetworkError('random string')).toBe(false);
            expect(isClientNetworkError(null)).toBe(false);
            expect(isClientNetworkError(undefined)).toBe(false);
        });

        test('ignores non-string code and name fields, still inspects the message', () => {
            // Branch: object error where `code` and `name` are present but not strings —
            // the function should ignore them and rely on the message.
            const matchingMessage = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1'), { code: 42, name: 99 });
            expect(isClientNetworkError(matchingMessage)).toBe(true);

            const nonMatchingMessage = Object.assign(new Error('something completely unrelated'), { code: 1, name: 2 });
            expect(isClientNetworkError(nonMatchingMessage)).toBe(false);
        });
    });

    describe('extractStatusReason', () => {
        test('returns the StatusReason from a JSON-encoded error message', () => {
            const error = new Error(JSON.stringify({ reason: { StatusReason: 'Stack rolled back' } }));
            expect(extractStatusReason(error)).toBe('Stack rolled back');
        });

        test('accepts a non-Error string-coerced value as input', () => {
            const message = JSON.stringify({ reason: { StatusReason: 'invalid template' } });
            expect(extractStatusReason(message)).toBe('invalid template');
        });

        test('returns undefined when JSON has no reason field', () => {
            const error = new Error(JSON.stringify({ other: 'value' }));
            expect(extractStatusReason(error)).toBeUndefined();
        });

        test('returns undefined when JSON has reason but no StatusReason', () => {
            const error = new Error(JSON.stringify({ reason: { something: 'else' } }));
            expect(extractStatusReason(error)).toBeUndefined();
        });

        test('returns undefined when StatusReason is the empty string (falsy)', () => {
            const error = new Error(JSON.stringify({ reason: { StatusReason: '' } }));
            expect(extractStatusReason(error)).toBeUndefined();
        });

        test('returns undefined for non-JSON error messages', () => {
            const error = new Error('plain text message');
            expect(extractStatusReason(error)).toBeUndefined();
        });

        test('returns undefined for non-Error / non-JSON inputs', () => {
            expect(extractStatusReason('not json')).toBeUndefined();
            expect(extractStatusReason(null)).toBeUndefined();
            expect(extractStatusReason(undefined)).toBeUndefined();
            expect(extractStatusReason(42)).toBeUndefined();
        });
    });

    describe('extractErrorMessage', () => {
        test('returns the bare message for a base Error', () => {
            expect(extractErrorMessage(new Error('boom'))).toBe('boom');
        });

        test('prefixes the name for a non-base Error subclass', () => {
            expect(extractErrorMessage(new TypeError('not a function'))).toBe('TypeError: not a function');
        });

        test('prefixes a custom error name', () => {
            const error = new Error('oops');
            error.name = 'CustomError';
            expect(extractErrorMessage(error)).toBe('CustomError: oops');
        });

        test('stringifies a plain string non-Error', () => {
            expect(extractErrorMessage('plain string')).toBe('plain string');
        });

        test('stringifies a number', () => {
            expect(extractErrorMessage(42)).toBe('42');
        });

        test('stringifies null', () => {
            expect(extractErrorMessage(null)).toBe('null');
        });

        test('stringifies undefined', () => {
            expect(extractErrorMessage(undefined)).toBe('undefined');
        });

        test('formats a plain object via toString', () => {
            const result = extractErrorMessage({ code: 'NotFound' });
            // toString() pretty-prints objects — assert on the salient content rather than exact whitespace.
            expect(result).toContain('code');
            expect(result).toContain('NotFound');
        });
    });

    describe('handleLspError', () => {
        test('rethrows an existing ResponseError unchanged', () => {
            const original = new ResponseError(ErrorCodes.InvalidRequest, 'bad request');
            expect(() => handleLspError(original, 'context')).toThrow(original);
        });

        test('maps a TypeError to InvalidParams', () => {
            const typeError = new TypeError('expected a string');

            try {
                handleLspError(typeError, 'someOperation');
                expect.fail('handleLspError should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(ResponseError);
                const responseError = err as ResponseError<unknown>;
                expect(responseError.code).toBe(ErrorCodes.InvalidParams);
                expect(responseError.message).toBe('expected a string');
            }
        });

        test('wraps a generic Error as InternalError with the supplied context message', () => {
            const error = new Error('disk full');

            try {
                handleLspError(error, 'Failed to write template');
                expect.fail('handleLspError should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(ResponseError);
                const responseError = err as ResponseError<unknown>;
                expect(responseError.code).toBe(ErrorCodes.InternalError);
                expect(responseError.message).toBe('Failed to write template: disk full');
            }
        });

        test('wraps a non-Error value as InternalError using extractErrorMessage', () => {
            try {
                handleLspError('string error', 'something failed');
                expect.fail('handleLspError should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(ResponseError);
                const responseError = err as ResponseError<unknown>;
                expect(responseError.code).toBe(ErrorCodes.InternalError);
                expect(responseError.message).toBe('something failed: string error');
            }
        });
    });

    describe('extractRootCause', () => {
        test('returns the lmdb-style commitError when present', () => {
            const cause = new Error('inner');
            const wrapper = Object.assign(new Error('outer'), { commitError: cause });
            expect(extractRootCause(wrapper)).toBe(cause);
        });

        test('returns the ES2022 cause when present', () => {
            const cause = new Error('inner');
            const wrapper = new Error('outer', { cause });
            expect(extractRootCause(wrapper)).toBe(cause);
        });

        test('prefers commitError over cause when both are set', () => {
            const commitCause = new Error('commit');
            const otherCause = new Error('other');
            const wrapper = Object.assign(new Error('outer', { cause: otherCause }), { commitError: commitCause });
            expect(extractRootCause(wrapper)).toBe(commitCause);
        });

        test('returns undefined when commitError is not an Error instance', () => {
            const wrapper = Object.assign(new Error('outer'), { commitError: 'not an error' });
            expect(extractRootCause(wrapper)).toBeUndefined();
        });

        test('returns undefined when cause is not an Error instance', () => {
            const wrapper = Object.assign(new Error('outer'), { cause: 'not an error' });
            expect(extractRootCause(wrapper)).toBeUndefined();
        });

        test('returns undefined for null', () => {
            expect(extractRootCause(null)).toBeUndefined();
        });

        test('returns undefined for non-object values', () => {
            expect(extractRootCause('string')).toBeUndefined();
            expect(extractRootCause(42)).toBeUndefined();
            expect(extractRootCause(undefined)).toBeUndefined();
        });

        test('returns undefined for objects with no cause fields', () => {
            expect(extractRootCause({})).toBeUndefined();
            expect(extractRootCause(new Error('lonely'))).toBeUndefined();
        });
    });

    describe('extractErrorCode', () => {
        test('returns the lowercase code field', () => {
            expect(extractErrorCode(Object.assign(new Error('x'), { code: 'ECONNRESET' }))).toBe('ECONNRESET');
        });

        test('returns the AWS SDK Code field when code is missing', () => {
            expect(extractErrorCode(Object.assign(new Error('x'), { Code: 'AccessDenied' }))).toBe('AccessDenied');
        });

        test('returns the upper-case CODE field as a last string fallback', () => {
            expect(extractErrorCode(Object.assign(new Error('x'), { CODE: 'WEIRD_FORMAT' }))).toBe('WEIRD_FORMAT');
        });

        test('falls back to errno stringified', () => {
            expect(extractErrorCode(Object.assign(new Error('x'), { errno: -2 }))).toBe('-2');
        });

        test('prefers code over Code, CODE, and errno', () => {
            const error = Object.assign(new Error('x'), {
                code: 'first',
                Code: 'second',
                CODE: 'third',
                errno: 4,
            });
            expect(extractErrorCode(error)).toBe('first');
        });

        test('returns undefined when no code-like field is present', () => {
            expect(extractErrorCode(new Error('x'))).toBeUndefined();
        });

        test('returns undefined for null', () => {
            expect(extractErrorCode(null)).toBeUndefined();
        });

        test('returns undefined for non-object values', () => {
            expect(extractErrorCode('string')).toBeUndefined();
            expect(extractErrorCode(42)).toBeUndefined();
            expect(extractErrorCode(undefined)).toBeUndefined();
        });

        test('ignores non-string code values', () => {
            // Only strings (and numeric errno) are surfaced.
            expect(extractErrorCode(Object.assign(new Error('x'), { code: 123 }))).toBeUndefined();
        });
    });

    describe('extractHttpStatus', () => {
        test('returns AWS SDK $metadata.httpStatusCode when present', () => {
            const error = Object.assign(new Error('x'), { $metadata: { httpStatusCode: 403 } });
            expect(extractHttpStatus(error)).toBe(403);
        });

        test('returns axios-style response.status when $metadata is missing', () => {
            const error = Object.assign(new Error('x'), { response: { status: 503 } });
            expect(extractHttpStatus(error)).toBe(503);
        });

        test('returns plain status when neither $metadata nor response is present', () => {
            const error = Object.assign(new Error('x'), { status: 404 });
            expect(extractHttpStatus(error)).toBe(404);
        });

        test('prefers $metadata over response and status', () => {
            const error = Object.assign(new Error('x'), {
                $metadata: { httpStatusCode: 401 },
                response: { status: 500 },
                status: 200,
            });
            expect(extractHttpStatus(error)).toBe(401);
        });

        test('prefers response over status when $metadata is missing', () => {
            const error = Object.assign(new Error('x'), { response: { status: 502 }, status: 200 });
            expect(extractHttpStatus(error)).toBe(502);
        });

        test('returns undefined when no http status is present', () => {
            expect(extractHttpStatus(new Error('x'))).toBeUndefined();
        });

        test('returns undefined when status fields are not numbers', () => {
            const error = Object.assign(new Error('x'), {
                $metadata: { httpStatusCode: '500' },
                response: { status: '500' },
                status: '500',
            });
            expect(extractHttpStatus(error)).toBeUndefined();
        });

        test('returns undefined for null', () => {
            expect(extractHttpStatus(null)).toBeUndefined();
        });

        test('returns undefined for primitive values', () => {
            expect(extractHttpStatus('string')).toBeUndefined();
            expect(extractHttpStatus(42)).toBeUndefined();
            expect(extractHttpStatus(undefined)).toBeUndefined();
        });
    });

    describe('DoesNotExist', () => {
        test('formats the message with the supplied resource name', () => {
            const error = new DoesNotExist('Stack arn');
            expect(error.message).toBe('Stack arn does not exist');
        });

        test('sets the error name to DoesNotExist', () => {
            expect(new DoesNotExist('thing').name).toBe('DoesNotExist');
        });

        test('survives instanceof Error', () => {
            expect(new DoesNotExist('thing')).toBeInstanceOf(Error);
        });

        test('survives instanceof DoesNotExist (prototype chain preserved)', () => {
            expect(new DoesNotExist('thing')).toBeInstanceOf(DoesNotExist);
        });

        test('preserves the cause from ErrorOptions', () => {
            const cause = new Error('underlying io error');
            const error = new DoesNotExist('Stack arn', { cause });
            expect(error.cause).toBe(cause);
        });

        test('is throwable and catchable as an Error', () => {
            try {
                throw new DoesNotExist('Resource X');
            } catch (err) {
                expect(err).toBeInstanceOf(DoesNotExist);
                expect(err).toBeInstanceOf(Error);
                expect((err as Error).message).toBe('Resource X does not exist');
            }
        });
    });
});
