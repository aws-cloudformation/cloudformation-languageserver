import { prettyPrint } from '@base2/pretty-print-object';

export function toString(value: unknown, indent = '\t'.repeat(1)) {
    if (value === null || !['object', 'function'].includes(typeof value)) {
        return String(value);
    }

    return prettyPrint(value, {
        indent,
        inlineCharacterLimit: 50,
    });
}

export function dashesToUnderscores(input: string): string {
    // eslint-disable-next-line unicorn/prefer-string-replace-all
    return input.replace(/-/g, '_');
}

export function removeQuotes(str: string): string {
    // Only replace starting and ending quotes
    // eslint-disable-next-line unicorn/prefer-string-replace-all
    return str.replace(/^['"]|['"]$/g, '');
}

export function isStringABoolean(value: string): boolean {
    return ['true', 'false'].includes(value.trim().toLowerCase());
}

export function stringToBoolean(value: string): boolean {
    return value.trim().toLowerCase() === 'true';
}

export function byteSize(str: string) {
    const bytes: Uint8Array = new TextEncoder().encode(str);
    return bytes.length;
}

export function formatNumber(value: number, decimals: number = 2) {
    return value.toFixed(decimals);
}
