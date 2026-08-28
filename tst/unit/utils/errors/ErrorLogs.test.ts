import { describe, expect, it } from 'vitest';
import {
    isConsoleOutputWriteError,
    isExpectedOutputError,
    isPinoStreamError,
} from '../../../../src/utils/errors/ErrorLogs';

function epipeError(stackFrame: string, syscall: string = 'write'): NodeJS.ErrnoException {
    const error = Object.assign(new Error('write EPIPE'), { code: 'EPIPE', syscall });
    error.stack = `Error: write EPIPE\n    at ${stackFrame}`;
    return error;
}

describe('ErrorLogs', () => {
    it('recognizes console output EPIPE errors', () => {
        const error = epipeError('console.value (node:internal/console/constructor:309:16)');

        expect(isConsoleOutputWriteError(error)).toBe(true);
        expect(isExpectedOutputError(error)).toBe(true);
    });

    it('does not classify network EPIPE errors as expected output errors', () => {
        const error = epipeError('Socket._write (node:net:975:8)');

        expect(isConsoleOutputWriteError(error)).toBe(false);
        expect(isExpectedOutputError(error)).toBe(false);
    });

    it('requires the write syscall for console EPIPE errors', () => {
        const error = epipeError('console.value (node:internal/console/constructor:309:16)', 'connect');

        expect(isConsoleOutputWriteError(error)).toBe(false);
    });

    it('recognizes only the known pino TypeError signature', () => {
        expect(isPinoStreamError(new TypeError("Cannot read properties of undefined (reading 'pino.msgPrefix')"))).toBe(
            true,
        );
        expect(isPinoStreamError(new Error("Cannot read properties of undefined (reading 'pino.msgPrefix')"))).toBe(
            false,
        );
        expect(isPinoStreamError(new TypeError('unrelated failure'))).toBe(false);
    });
});
