import { ErrorCodes, ResponseError } from 'vscode-languageserver';
import { toString } from '../String';

export const CLIENT_NETWORK_ERROR_CODES: ReadonlySet<string> = new Set([
    'ECONNRESET', // Peer reset the connection mid-stream
    'ETIMEDOUT', // Operation exceeded its timeout
    'ECONNREFUSED', // Server actively refused (port closed / not listening)
    'ENOTFOUND', // DNS resolution failed
    'EAI_AGAIN', // Transient DNS resolver failure (retry-eligible)
    'ECONNABORTED', // Local socket aborted (often an axios timeout)
    'EPIPE', // Wrote to a socket the peer already closed
    'EHOSTUNREACH', // No route to host (firewall / unreachable)
    'ENETUNREACH', // Network unreachable (offline / interface down)
    'NGHTTP2_REFUSED_STREAM', // HTTP/2 server refused a new stream (transient)
]);

const CLIENT_NETWORK_ERROR_MESSAGE_PATTERNS = [
    'unable to get local issuer certificate', // Cert chain root not in client trust store
    'self signed certificate', // Peer presented a self-signed certificate
    'unable to verify the first certificate', // Incomplete server cert chain
    'certificate has expired', // Server cert past validity window
    'does not match certificate', // Hostname / SAN mismatch
    'WRONG_VERSION_NUMBER', // TLS version mismatch (often plaintext on a TLS port)
    'socket hang up', // Peer closed connection before responding
    'network socket disconnected', // Underlying socket dropped mid-request
    'TOO_MANY_REDIRECTS', // Client exceeded redirect limit (e.g. ERR_FR_TOO_MANY_REDIRECTS)
    'Parse Error: Expected HTTP', // Non-HTTP response on HTTP port (proxy / wrong protocol)
    'status code 407', // Proxy Authentication Required
];

export function isClientNetworkError(error: unknown): boolean {
    const parts: string[] = [extractErrorMessage(error)];

    if (typeof error === 'object' && error !== null) {
        const { code, name } = error as { code?: unknown; name?: unknown };
        if (typeof code === 'string') {
            parts.push(code);
        }
        if (typeof name === 'string') {
            parts.push(name);
        }
    }

    const haystack = parts.join(' ').toLowerCase();

    // Match canonical codes (errno-style) and free-form message patterns
    for (const code of CLIENT_NETWORK_ERROR_CODES) {
        if (haystack.includes(code.toLowerCase())) {
            return true;
        }
    }

    return CLIENT_NETWORK_ERROR_MESSAGE_PATTERNS.some((pattern) => {
        return haystack.includes(pattern.toLowerCase());
    });
}

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
