import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { SensitiveInfo } from './SensitiveInfo';
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
export function extractLocationFromStack(stack?: string): Record<string, string> {
    if (!stack) return {};

    if (!SensitiveInfo.didComputeSuccessfully()) {
        return {};
    }

    const matches = [...stack.matchAll(/at (.*)/g)];

    if (matches.length === 0) return {};

    const result: Record<string, string> = {};

    for (const [index, match] of matches.entries()) {
        if (!match[1]) {
            continue;
        }

        let line = match[1].trim();
        if (!line) {
            continue;
        }

        // Extract function name and path separately
        const parenMatch = line.match(/^(.+?)\s+\((.+)\)$/);
        if (parenMatch) {
            const funcName = parenMatch[1];
            const path = SensitiveInfo.sanitizePath(parenMatch[2]);
            line = `${funcName} (${path})`;
        } else {
            line = SensitiveInfo.sanitizePath(line);
        }

        result[`error.stack${index}`] = line.trim();
    }

    return result;
}
