import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { toString } from './String';

export function extractErrorMessage(error: unknown) {
    if (error instanceof Error) {
        const prefix = error.name === 'Error' ? '' : `${error.name}: `;
        return `${prefix}${error.message}`;
    }

    return toString(error);
}

export function handleLspError(error: unknown, contextMessage: string): never {
    if (error instanceof ResponseError) {
        throw error;
    }
    if (error instanceof TypeError) {
        throw new ResponseError(ErrorCodes.InvalidParams, error.message);
    }
    throw new ResponseError(ErrorCodes.InternalError, `${contextMessage}: ${extractErrorMessage(error)}`);
}

/**
 * Best effort extraction of location of exception based on stack trace
 */
export function extractLocationFromStack(stack?: string): {
    'error.file'?: string;
    'error.line'?: number;
    'error.column'?: number;
} {
    if (!stack) return {};

    // Match first line with file location: at ... (/path/to/file.ts:line:column)
    const match = stack.match(/at .+\((.+):(\d+):(\d+)\)|at (.+):(\d+):(\d+)/);
    if (!match) return {};

    const fullPath = match[1] || match[4];
    const line = parseInt(match[2] || match[5], 10); // eslint-disable-line unicorn/prefer-number-properties
    const column = parseInt(match[3] || match[6], 10); // eslint-disable-line unicorn/prefer-number-properties

    // Extract only filename without path
    const filename = fullPath?.split('/').pop()?.split('\\').pop();

    return {
        'error.file': filename,
        'error.line': line,
        'error.column': column,
    };
}

export class RequestCancelledError extends Error {
    constructor(key: string) {
        super(`Request cancelled for key: ${key}`);
    }
}
