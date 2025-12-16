import { ResponseError } from 'vscode-languageserver';
import { extractErrorMessage } from './Errors';
import { OnlineFeatureErrorCode } from './OnlineFeatureError';

type AwsError = {
    name?: string;
    code?: string;
    $metadata?: {
        httpStatusCode?: number;
    };
    message?: string;
};

export interface PermissionErrorData {
    errorType: 'permission';
    service: string;
    operation: string;
    retryable: false;
}

export class AwsErrorDetector {
    private readonly PERMISSION_ERROR_CODES = new Set([
        'AccessDenied',
        'UnauthorizedOperation',
        'Forbidden',
        'AccessDeniedException',
        'UnauthorizedOperationException',
        'InvalidUserID.NotFound',
        'AuthFailure',
        'Throttling',
    ]);

    private readonly PERMISSION_HTTP_CODES = new Set([401, 403]);

    public isPermissionError(error: unknown): boolean {
        if (!this.isAwsError(error)) {
            return false;
        }

        // Check error codes
        if (error.name && this.PERMISSION_ERROR_CODES.has(error.name)) {
            return true;
        }
        if (error.code && this.PERMISSION_ERROR_CODES.has(error.code)) {
            return true;
        }

        // Check HTTP status codes
        const statusCode = error.$metadata?.httpStatusCode;
        if (statusCode && this.PERMISSION_HTTP_CODES.has(statusCode)) {
            return true;
        }

        // Check error message patterns
        const message = error.message?.toLowerCase() ?? '';
        return (
            message.includes('access denied') ||
            message.includes('unauthorized') ||
            message.includes('forbidden') ||
            message.includes('not authorized') ||
            message.includes('permission denied')
        );
    }

    public createPermissionError(
        error: unknown,
        service: string,
        operation: string,
    ): ResponseError<PermissionErrorData> {
        const message = extractErrorMessage(error);

        return new ResponseError(
            OnlineFeatureErrorCode.AwsServiceError,
            message, // Use generic AWS error message as-is
            {
                errorType: 'permission',
                service,
                operation,
                retryable: false,
            },
        );
    }

    private isAwsError(error: unknown): error is AwsError {
        return (
            typeof error === 'object' && error !== null && ('name' in error || 'code' in error || '$metadata' in error)
        );
    }
}
