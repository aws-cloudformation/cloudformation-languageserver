export interface Suppressible {
    suppressFault?: true;
}

export function markSuppressFault(error: Error): void {
    (error as Error & Suppressible).suppressFault = true;
}

export function hasSuppressFault(error: unknown): error is Suppressible {
    return (error as Suppressible | null)?.suppressFault === true;
}
