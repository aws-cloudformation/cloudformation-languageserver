import os from 'os';
import { resolve, basename } from 'path';
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

const UserInfo = os.userInfo();
const SensitiveInfo = [
    UserInfo.username,
    `${UserInfo.uid}`,
    `${UserInfo.gid}`,
    UserInfo.shell,
    UserInfo.homedir,
    resolve(__dirname),
]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .sort((a, b) => b.length - a.length);

const BaseDir = basename(resolve(__dirname));

function sanitizePath(path: string): string {
    let sanitized = path;

    // Strip sensitive info first
    for (const info of SensitiveInfo) {
        sanitized = sanitized.replaceAll(info, 'REDACTED');
    }

    // Normalize path separators for consistent processing
    const normalized = sanitized.replaceAll('\\', '/');

    // Strip cloudformation-languageserver prefix
    for (const partial of ['cloudformation-languageserver', BaseDir]) {
        const idx = normalized.indexOf(partial);
        if (idx !== -1) {
            return '/' + normalized.slice(idx + partial.length + 1);
        }
    }

    // Restore original separators if no prefix found
    return sanitized;
}

/**
 * Best effort extraction of location of exception based on stack trace
 */
export function extractLocationFromStack(stack?: string): Record<string, string> {
    if (!stack) return {};

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
            const path = sanitizePath(parenMatch[2]);
            line = `${funcName} (${path})`;
        } else {
            line = sanitizePath(line);
        }

        result[`stack${index}`] = line.trim();
    }

    return result;
}
