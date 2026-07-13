import { Attributes } from '@opentelemetry/api';
import { sanitizeMessage } from '../Sanitizer';
import { classifyAwsError } from './AwsErrorMapper';
import { extractRootCause, extractErrorCode, extractHttpStatus } from './ErrorUtils';

/**
 * Best effort extraction of location of exception based on stack trace
 */
export function extractLocationFromStack(stack?: string): Record<string, string> {
    if (!stack) return {};

    const lines = sanitizeMessage(stack).split('\n');

    if (lines.length === 0) {
        return {};
    }

    return {
        ['error.message']: lines[0],
        ['error.stack']: lines.slice(1).join('\n'),
    };
}

export function errorAttributes(error: unknown, origin?: 'uncaughtException' | 'unhandledRejection'): Attributes {
    const location = error instanceof Error ? extractLocationFromStack(error.stack) : {};
    const cause = extractRootCause(error);
    const causeLocation = cause ? extractLocationFromStack(cause.stack) : {};

    return {
        'error.origin': origin ?? 'Unknown',
        ...location,
        ...(causeLocation['error.message'] !== undefined && { 'error.cause.message': causeLocation['error.message'] }),
        ...(causeLocation['error.stack'] !== undefined && { 'error.cause.stack': causeLocation['error.stack'] }),
    };
}

export function errorType(error: unknown): Attributes {
    const type = error instanceof Error ? error.name : typeof error;
    const code = extractErrorCode(error);

    const cause = extractRootCause(error);
    const status = extractHttpStatus(error);
    const causeStatus = cause ? extractHttpStatus(cause) : undefined;

    const awsClassification = classifyAwsError(error);
    const awsAttr: Record<string, string> = {};
    if (awsClassification.category !== 'unknown') {
        awsAttr['error.aws.category'] = sanitizeMessage(awsClassification.category);
    }
    if (awsClassification.httpStatus) {
        awsAttr['error.aws.http.status'] = sanitizeMessage(`${awsClassification.httpStatus}`);
    }

    return {
        'error.type': sanitizeMessage(type),
        'error.code': sanitizeMessage(code ?? 'Unknown'),

        ...(status !== undefined && { 'error.http.status': status }),
        ...(cause && {
            'error.cause.type': sanitizeMessage(cause.name),
            'error.cause.code': sanitizeMessage(extractErrorCode(cause) ?? 'Unknown'),
            ...(causeStatus !== undefined && { 'error.cause.http.status': sanitizeMessage(`${causeStatus}`) }),
        }),
        ...awsAttr,
    };
}
