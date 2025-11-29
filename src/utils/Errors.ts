import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { determineSensitiveInfo, getErrorStack } from './ErrorStackInfo';
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

const Stack = getErrorStack();

/**
 * Best effort extraction of location of exception based on stack trace
 */
export function extractLocationFromStack(stack?: string): Record<string, string> {
    if (!stack) return {};

    const lines = stack
        .trim()
        .split('\n')
        .map((line) => {
            let newLine = line.trim();
            for (const word of determineSensitiveInfo()) {
                if (word !== 'aws' && word !== 'cloudformation-languageserver') {
                    newLine = newLine.replaceAll(word, '[*]');
                }
            }

            return newLine;
        });

    if (lines.length === 0) {
        return {};
    }

    const result: Record<string, string> = {};
    result['error.message'] = lines[0];

    for (const [idx, line] of lines.slice(1, 6).entries()) {
        const parsed = Stack.parseLine(line);

        if (!parsed) {
            continue;
        }

        result[`error.stack${idx}`] = `${parsed.function} ${parsed.file} ${parsed.line}:${parsed.column}`;
    }

    return result;
}
