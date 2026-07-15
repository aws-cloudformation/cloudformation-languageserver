import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { describe, expect, test } from 'vitest';
import {
    extractErrorCode,
    extractErrorMessage,
    extractHttpStatus,
    extractRootCause,
    extractStatusReason,
    handleLspError,
} from '../../../../src/utils/errors/ErrorUtils';

describe('ErrorUtils', () => {
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
});
