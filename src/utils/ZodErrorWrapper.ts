import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseWithPrettyError<T extends (...args: any[]) => any>(
    parseFunction: T,
    ...args: Parameters<T>
): ReturnType<T> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return parseFunction(...args);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new TypeError(z.prettifyError(error));
        }
        throw error;
    }
}
