import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { toString } from '../String';

export function extractStatusReason(error: unknown): string | undefined {
    try {
        const message = error instanceof Error ? error.message : String(error);
        const parsed = JSON.parse(message) as { reason?: { StatusReason?: string } };
        if (parsed?.reason?.StatusReason) {
            return parsed.reason.StatusReason;
        }
    } catch {
        // Not JSON, continue with normal error handling
    }
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

export function extractRootCause(error: unknown): Error | undefined {
    if (error === null || typeof error !== 'object') {
        return undefined;
    }

    const errorAs = error as { commitError?: unknown; cause?: unknown };

    if (errorAs.commitError instanceof Error) {
        return errorAs.commitError;
    }

    if (errorAs.cause instanceof Error) {
        return errorAs.cause;
    }

    return undefined;
}

const MaxCauseDepth = 8;

export function errorCauseChain(error: unknown): unknown[] {
    const chain: unknown[] = [];
    const seen = new Set<unknown>();
    let current: unknown = error;

    while (current !== undefined && current !== null && chain.length < MaxCauseDepth) {
        if (typeof current === 'object') {
            if (seen.has(current)) {
                break;
            }
            seen.add(current);
        }

        chain.push(current);

        if (typeof current !== 'object') {
            break;
        }

        const { cause, commitError } = current as { cause?: unknown; commitError?: unknown };
        // A promise-valued `commitError` carries no synchronously readable message; only a resolved
        // one (see `attachCommitCause`) is useful here.
        current = cause ?? (commitError instanceof Error ? commitError : undefined);
    }

    return chain;
}

export function extractErrorCode(error: unknown): string | undefined {
    if (error === null || typeof error !== 'object') {
        return undefined;
    }

    const { code, Code, CODE, errno } = error as { code?: unknown; Code?: unknown; CODE?: unknown; errno?: number };

    if (typeof code === 'string') {
        return code;
    }

    if (typeof Code === 'string') {
        return Code;
    }

    if (typeof CODE === 'string') {
        return CODE;
    }

    if (typeof errno === 'number') {
        return `${errno}`;
    }

    return undefined;
}

export function extractHttpStatus(error: unknown): number | undefined {
    if (error === null || typeof error !== 'object') {
        return undefined;
    }

    const candidate = error as {
        $metadata?: { httpStatusCode?: number };
        response?: { status?: number };
        status?: number;
    };

    if (typeof candidate.$metadata?.httpStatusCode === 'number') {
        return candidate.$metadata?.httpStatusCode;
    }

    if (typeof candidate.response?.status === 'number') {
        return candidate.response?.status;
    }

    if (typeof candidate.status === 'number') {
        return candidate.status;
    }

    return undefined;
}
