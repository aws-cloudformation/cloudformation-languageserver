import equal from 'fast-deep-equal';
import { toString } from '../../src/utils/String';

export function expectThrow(actual: any, message: string) {
    return {
        toBe(expected: any) {
            if (!equal(actual, expected)) {
                throw new Error(`${message}: expected ${toString(expected)}, got ${toString(actual)}`);
            }
        },
        toBeDefined() {
            if (actual === undefined) {
                throw new Error(`${message}: expected value to be defined`);
            }
        },
        toEqual(expected: any) {
            if (!equal(actual, expected)) {
                throw new Error(`${message}: expected ${toString(expected)}, got ${toString(actual)}`);
            }
        },
        toBeGreaterThanOrEqual(expected: number) {
            if (actual < expected) {
                throw new Error(`${message}: expected ${actual} to be >= ${expected}`);
            }
        },
        toBeGreaterThan(expected: number) {
            if (actual <= expected) {
                throw new Error(`${message}: expected ${actual} to be > ${expected}`);
            }
        },
        toBeLessThanOrEqual(expected: number) {
            if (actual > expected) {
                throw new Error(`${message}: expected ${actual} to be <= ${expected}`);
            }
        },
        toContain(expected: any) {
            if (typeof actual === 'string') {
                if (!actual.includes(expected)) {
                    throw new Error(
                        `${message}: expected string to contain ${toString(expected)}, but got ${toString(actual)}`,
                    );
                }
            } else if (Array.isArray(actual)) {
                if (!actual.includes(expected)) {
                    throw new Error(
                        `${message}: expected array to contain ${toString(expected)}, but got ${toString(actual)}`,
                    );
                }
            } else {
                throw new TypeError(
                    `${message}: expected array or string to contain ${toString(expected)}, got ${typeof actual}`,
                );
            }
        },
        toBeUndefined() {
            if (actual !== undefined) {
                throw new Error(`${message}: expected value to be undefined, got ${toString(actual)}`);
            }
        },
        toMatch(regex: RegExp) {
            if (!regex.test(actual)) {
                throw new Error(`${message}: expected ${toString(actual)} to match ${regex}`);
            }
        },
        not: {
            toContain(expected: any) {
                if (typeof actual === 'string') {
                    if (actual.includes(expected)) {
                        throw new Error(
                            `${message}: expected string not to contain ${toString(expected)}, but got ${toString(actual)}`,
                        );
                    }
                } else if (Array.isArray(actual)) {
                    if (actual.includes(expected)) {
                        throw new Error(
                            `${message}: expected array not to contain ${toString(expected)}, but got ${toString(actual)}`,
                        );
                    }
                } else {
                    throw new TypeError(
                        `${message}: expected array or string to contain ${toString(expected)}, got ${typeof actual}`,
                    );
                }
            },
        },
    };
}
