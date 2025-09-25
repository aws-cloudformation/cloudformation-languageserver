import { toString } from './String';

export function extractErrorMessage(error: unknown) {
    if (error instanceof Error) {
        const prefix = error.name === 'Error' ? '' : `${error.name}: `;
        return `${prefix}${error.message}`;
    }

    return toString(error);
}
