/**
 * Returns true if the error is a known pino stream race condition that
 * occurs when the ThreadStream worker exits while async log calls are in flight.
 */
export function isPinoStreamError(error: unknown): boolean {
    return error instanceof TypeError && error.message.includes('pino.msgPrefix');
}

export function isConsoleOutputWriteError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const { code, syscall } = error as NodeJS.ErrnoException;
    return (
        code === 'EPIPE' &&
        syscall === 'write' &&
        typeof error.stack === 'string' &&
        error.stack.includes('node:internal/console/constructor')
    );
}

export function isExpectedOutputError(error: unknown): boolean {
    return isPinoStreamError(error) || isConsoleOutputWriteError(error);
}
