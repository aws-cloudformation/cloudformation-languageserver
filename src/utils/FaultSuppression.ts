import { isClientError } from './AwsErrorMapper';
import { isClientNetworkError } from './Errors';

export const SUPPRESS_FAULT = Symbol('SUPPRESS_FAULT');

interface Suppressible {
    [SUPPRESS_FAULT]?: true;
}

export function markSuppressFault(error: unknown): void {
    if (typeof error === 'object' && error !== null) {
        (error as Suppressible)[SUPPRESS_FAULT] = true;
    }
}

export function markIfClientError(error: unknown): void {
    if (typeof error === 'object' && error !== null && (isClientError(error) || isClientNetworkError(error))) {
        markSuppressFault(error);
    }
}

export function hasSuppressFault(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as Suppressible)[SUPPRESS_FAULT] === true;
}
