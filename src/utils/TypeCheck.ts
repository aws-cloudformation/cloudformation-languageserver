type TypeOfType =
    | 'unknown'
    | 'undefined'
    | 'null'
    | 'string'
    | 'bigint'
    | 'boolean'
    | 'number'
    | 'symbol'
    | 'function'
    | 'array'
    | 'object';

export function typeOf(value: unknown): {
    type: TypeOfType;
    size?: number;
} {
    let type: TypeOfType | undefined = undefined;
    let size: number | undefined;

    if (value === undefined) {
        type = 'undefined';
    } else if (value === null) {
        type = 'null';
    } else if (typeof value === 'boolean') {
        type = 'boolean';
    } else if (typeof value === 'string') {
        type = 'string';
    } else if (typeof value === 'bigint') {
        type = 'bigint';
    } else if (typeof value === 'number') {
        type = 'number';
    } else if (typeof value === 'symbol') {
        type = 'symbol';
    } else if (typeof value === 'function') {
        type = 'function';
    }

    if (type === undefined && typeof value === 'object') {
        if (Array.isArray(value)) {
            type = 'array';
            size = value.length;
        } else {
            type = 'object';
        }
    }

    type ??= 'unknown';

    return {
        type,
        size,
    };
}
