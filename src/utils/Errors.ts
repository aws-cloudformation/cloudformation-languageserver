import { Attributes } from '@opentelemetry/api';
import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { determineSensitiveInfo } from './ErrorStackInfo';
import { toString } from './String';

const CLIENT_NETWORK_ERROR_PATTERNS = [
    'unable to get local issuer certificate',
    'self signed certificate',
    'unable to verify the first certificate',
    'certificate has expired',
    'does not match certificate',
    'WRONG_VERSION_NUMBER',
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNABORTED',
    'EBADF',
    'socket hang up',
    'network socket disconnected',
    'TOO_MANY_REDIRECTS',
    'Parse Error: Expected HTTP',
    'status code 407',
];

export function isClientNetworkError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return CLIENT_NETWORK_ERROR_PATTERNS.some((pattern) => message.toLowerCase().includes(pattern.toLowerCase()));
}

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

            return newLine.replaceAll('\\\\', '/').replaceAll('\\', '/');
        });

    if (lines.length === 0) {
        return {};
    }

    const result: Record<string, string> = {};
    result['error.message'] = sanitizeErrorMessage(lines[0]);
    result['error.stack'] = lines.slice(1).join('\n');
    return result;
}

function sanitizeErrorMessage(message: string): string {
    return message
        .replaceAll(/arn:aws[^:\s]*:\S+\d{12}\S*/gi, 'arn:aws:<REDACTED>')
        .replaceAll(/\b\d{12}\b/g, '<ACCOUNT_ID>');
}

export function errorAttributes(error: unknown, origin?: 'uncaughtException' | 'unhandledRejection'): Attributes {
    const location = error instanceof Error ? extractLocationFromStack(error.stack) : {};
    const type = error instanceof Error ? error.name : typeof error;

    return {
        'error.type': type,
        'error.origin': origin ?? 'Unknown',
        ...location,
    };
}
