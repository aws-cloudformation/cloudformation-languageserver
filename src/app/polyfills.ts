// Polyfill Array.prototype.toSorted for Node 18 which only supports up to ES2022
if (!Array.prototype.toSorted) {
    Array.prototype.toSorted = function <T>(this: T[], compareFn?: (a: T, b: T) => number): T[] {
        return [...this].sort(compareFn); // eslint-disable-line unicorn/no-array-sort
    };
}
