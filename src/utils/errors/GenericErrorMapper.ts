import { CfnLintInitializationError, MountError, WorkerNotInitializedError } from './ErrorClasses';
import { extractErrorCode, extractErrorMessage, extractHttpStatus } from './ErrorUtils';

const CANCELLATION_ERROR_IDENTIFIERS = new Set([
    'ABORT_ERR', // Web/Node AbortSignal terminated the operation
    'AbortError', // Standard DOM/Node error name for an aborted operation
    'CanceledError', // Axios error name for a canceled request
    'CancellationError', // RequestCancellationError name for superseded LSP work
    'CancelledError', // Alternate dependency spelling of a cancellation error
    'ERR_CANCELED', // Axios cancellation error code
    'ERR_CANCELLED', // Alternate dependency spelling of a cancellation code
]);

const FILESYSTEM_ERROR_CODES = new Set([
    'EACCES', // Permission denied while accessing a path
    'EBADF', // Operation used an invalid or closed file descriptor
    'EBUSY', // File or directory is busy, locked, or in use
    'EEXIST', // Create operation targeted a path that already exists
    'EFBIG', // File exceeds the supported size limit
    'EISDIR', // File operation targeted a directory instead
    'EMFILE', // Process has reached its open-file descriptor limit
    'ENFILE', // System has reached its open-file descriptor limit
    'ENOENT', // File or directory does not exist
    'ENOSPC', // Device has no free space remaining
    'ENOTDIR', // A path component expected to be a directory is not one
    'ENOTEMPTY', // Directory cannot be removed because it contains entries
    'EPERM', // Operating system rejected the requested file operation
    'EROFS', // Write attempted against a read-only filesystem
    'EXDEV', // Rename or link crossed filesystem/device boundaries
]);

const CFN_LINT_ERROR_NAMES = new Set([
    CfnLintInitializationError.name,
    MountError.name,
    WorkerNotInitializedError.name,
]);

const NETWORK_ERROR_CODES = new Set([
    'EADDRNOTAVAIL', // Requested local address is unavailable
    'EAI_AGAIN', // Transient DNS resolver failure (retry-eligible)
    'ECONNABORTED', // Local socket aborted (often an axios timeout)
    'ECONNREFUSED', // Server actively refused (port closed / not listening)
    'ECONNRESET', // Peer reset the connection mid-stream
    'EHOSTUNREACH', // No route to host (firewall / unreachable)
    'ENETDOWN', // Local network interface is down
    'ENETUNREACH', // Network unreachable (offline / interface down)
    'ENOTCONN', // Socket operation attempted before connection
    'ENOTFOUND', // DNS resolution failed
    'EPIPE', // Wrote to a socket the peer already closed
    'ERR_SOCKET_CONNECTION_TIMEOUT', // Node socket connection timed out
    'ETIMEDOUT', // Operation exceeded its timeout
    'NGHTTP2_REFUSED_STREAM', // HTTP/2 server refused a new stream (transient)
]);

const NETWORK_ERROR_MESSAGE_PATTERNS = [
    'socket hang up', // Peer closed connection before responding
    'network socket disconnected', // Underlying socket dropped mid-request
    'TOO_MANY_REDIRECTS', // Client exceeded redirect limit (e.g. ERR_FR_TOO_MANY_REDIRECTS)
    'Parse Error: Expected HTTP', // Non-HTTP response on HTTP port (proxy / wrong protocol)
    'status code 407', // Proxy Authentication Required
];

const TLS_ERROR_CODES = new Set([
    'CERT_HAS_EXPIRED', // Certificate validity period has ended
    'CERT_NOT_YET_VALID', // Certificate validity period has not started
    'CERT_REJECTED', // Platform trust policy explicitly rejected the certificate
    'CERT_UNTRUSTED', // Certificate chain terminates at an untrusted authority
    'DEPTH_ZERO_SELF_SIGNED_CERT', // Peer leaf certificate is self-signed
    'ERR_SSL_BAD_DECRYPT', // TLS encrypted content could not be decrypted
    'ERR_SSL_WRONG_VERSION_NUMBER', // Peer and client used incompatible TLS/protocol versions
    'ERR_TLS_CERT_ALTNAME_INVALID', // Requested hostname is absent from certificate SANs
    'HOSTNAME_MISMATCH', // Certificate identity does not match the requested hostname
    'SELF_SIGNED_CERT_IN_CHAIN', // Certificate chain contains an untrusted self-signed certificate
    'UNABLE_TO_GET_ISSUER_CERT', // Issuer certificate is missing from the supplied chain
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', // Local trust store cannot find the issuer certificate
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE', // Leaf certificate cannot be linked to a trusted issuer
]);

const TLS_ERROR_MESSAGE_PATTERNS = [
    'unable to get local issuer certificate', // Cert chain root not in client trust store
    'self signed certificate', // Peer presented a self-signed certificate
    'unable to verify the first certificate', // Incomplete server cert chain
    'certificate has expired', // Server cert past validity window
    'does not match certificate', // Hostname / SAN mismatch
    'WRONG_VERSION_NUMBER', // TLS version mismatch (often plaintext on a TLS port)
];

const VALIDATION_ERROR_CODES = new Set([
    'ERR_INVALID_ARG_TYPE', // Node API received an argument with the wrong JavaScript type
    'ERR_INVALID_ARG_VALUE', // Node API received the correct type but an unsupported value
    'ERR_INVALID_URL', // URL parsing failed because the URL is malformed or unsupported
    'ERR_SOCKET_BAD_PORT', // Socket port is non-numeric, negative, or outside the valid range
]);

const LMDB_ERROR_NAME = 'MDBError'; // Error name emitted by lmdb-js native operations
const LMDB_ERROR_CODE_PREFIX = 'MDB_'; // Native LMDB status codes share this prefix
const LMDB_ERROR_MESSAGE_PATTERN = /\bMDB_[A-Z_]+\b/; // lmdb-js may embed the native code only in the message

export type GenericErrorCategory =
    'cancellation' | 'cfn_lint' | 'filesystem' | 'http' | 'lmdb' | 'network' | 'tls' | 'validation';

function errorSearchText(error: unknown): string {
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

    return parts.join(' ').toLowerCase();
}

function containsErrorCodeOrPattern(searchText: string, codes: Set<string>, patterns: readonly string[]): boolean {
    for (const code of codes) {
        if (searchText.includes(code.toLowerCase())) {
            return true;
        }
    }

    return patterns.some((pattern) => searchText.includes(pattern.toLowerCase()));
}

function hasErrorIdentifier(error: unknown, identifiers: Set<string>): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const name = 'name' in error && typeof error.name === 'string' ? error.name : undefined;
    const code = extractErrorCode(error);
    return (name !== undefined && identifiers.has(name)) || (code !== undefined && identifiers.has(code));
}

function isLmdbError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === LMDB_ERROR_NAME) {
        return true;
    }

    const code = extractErrorCode(error);
    return (
        code?.startsWith(LMDB_ERROR_CODE_PREFIX) === true || LMDB_ERROR_MESSAGE_PATTERN.test(extractErrorMessage(error))
    );
}

export function isClientTlsError(error: unknown): boolean {
    return containsErrorCodeOrPattern(errorSearchText(error), TLS_ERROR_CODES, TLS_ERROR_MESSAGE_PATTERNS);
}

export function isClientNetworkError(error: unknown): boolean {
    if (isClientTlsError(error)) {
        return true;
    }

    return containsErrorCodeOrPattern(errorSearchText(error), NETWORK_ERROR_CODES, NETWORK_ERROR_MESSAGE_PATTERNS);
}

export function classifyGenericError(error: unknown): GenericErrorCategory | undefined {
    if (hasErrorIdentifier(error, CANCELLATION_ERROR_IDENTIFIERS)) {
        return 'cancellation';
    }
    if (isClientTlsError(error)) {
        return 'tls';
    }
    if (isClientNetworkError(error)) {
        return 'network';
    }

    const code = extractErrorCode(error);
    if (code !== undefined && FILESYSTEM_ERROR_CODES.has(code)) {
        return 'filesystem';
    }
    if (isLmdbError(error)) {
        return 'lmdb';
    }
    if (extractHttpStatus(error) !== undefined) {
        return 'http';
    }
    if (code !== undefined && VALIDATION_ERROR_CODES.has(code)) {
        return 'validation';
    }
    if (hasErrorIdentifier(error, CFN_LINT_ERROR_NAMES)) {
        return 'cfn_lint';
    }

    return undefined;
}
