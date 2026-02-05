export function validatePositiveOrUndefined(value: unknown): number | undefined {
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value) && value > 0) {
        return value;
    }

    return undefined;
}
