import { Attributes } from '@opentelemetry/api';
import { sanitizeMessage } from '../Sanitizer';
import { classifyAwsError } from './AwsErrorMapper';
import { extractRootCause, extractErrorCode, extractHttpStatus, errorCauseChain } from './ErrorUtils';
import { classifyGenericError } from './GenericErrorMapper';

/**
 * Single bounded-cardinality label for the `errorType` metric dimension, which {@link errorType} always emits
 * (the one error attribute the telemetry pipeline exports as a dimension). Prefers the deepest error code in the
 * cause chain (errno, AWS, or a code set by our own wrappers), then the deepest specific class name, then the
 * error's own class name.
 */
export function errorTypeLabel(error: unknown): string {
    const deepestFirst = errorCauseChain(error).toReversed();

    for (const link of deepestFirst) {
        const code = extractErrorCode(link);
        if (code !== undefined) {
            return sanitizeMessage(code);
        }
    }

    for (const link of deepestFirst) {
        if (link instanceof Error && link.name !== 'Error') {
            return sanitizeMessage(link.name);
        }
    }

    return sanitizeMessage(error instanceof Error ? error.name : typeof error);
}

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

export function errorAttributes(error: unknown, origin?: string): Attributes {
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
    if (awsClassification.httpStatus !== undefined) {
        awsAttr['error.aws.http.status'] = sanitizeMessage(`${awsClassification.httpStatus}`);
    }

    const genericCategory = classifyGenericError(error);
    const genericAttr: Record<string, string> = {};
    if (genericCategory !== undefined) {
        genericAttr['error.category'] = sanitizeMessage(genericCategory);
    }

    return {
        'error.type.label': errorTypeLabel(error),
        'error.type': sanitizeMessage(type),
        'error.code': sanitizeMessage(code ?? 'Unknown'),
        ...genericAttr,
        ...(status !== undefined && { 'error.http.status': status }),
        ...(cause && {
            'error.cause.type': sanitizeMessage(cause.name),
            'error.cause.code': sanitizeMessage(extractErrorCode(cause) ?? 'Unknown'),
            ...(causeStatus !== undefined && { 'error.cause.http.status': sanitizeMessage(`${causeStatus}`) }),
        }),
        ...awsAttr,
    };
}
