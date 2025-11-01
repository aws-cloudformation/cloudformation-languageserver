import { describe, test, expect } from 'vitest';
import { extractLocationFromStack } from '../../src/utils/Errors';

describe('extractLocationFromStack', () => {
    test('returns empty object when stack is undefined', () => {
        expect(extractLocationFromStack(undefined)).toEqual({});
    });

    test('returns empty object when stack is empty string', () => {
        expect(extractLocationFromStack('')).toEqual({});
    });

    test('extracts location from stack with parentheses format', () => {
        const stack = 'Error: test\n    at Object.<anonymous> (/path/to/file.ts:10:5)';
        expect(extractLocationFromStack(stack)).toEqual({
            'error.file': 'file.ts',
            'error.line': 10,
            'error.column': 5,
        });
    });

    test('extracts location from stack without parentheses format', () => {
        const stack = 'Error: test\n    at /path/to/file.js:20:15';
        expect(extractLocationFromStack(stack)).toEqual({
            'error.file': 'file.js',
            'error.line': 20,
            'error.column': 15,
        });
    });

    test('extracts filename from Windows path', () => {
        const stack = 'Error: test\n    at Object.<anonymous> (C:\\path\\to\\file.ts:30:25)';
        expect(extractLocationFromStack(stack)).toEqual({
            'error.file': 'file.ts',
            'error.line': 30,
            'error.column': 25,
        });
    });

    test('returns empty object when no match found', () => {
        const stack = 'Error: test\n    at something without location';
        expect(extractLocationFromStack(stack)).toEqual({});
    });

    test('extract error from exception', () => {
        const stack = String.raw`
Error: Request cancelled for key: SendDocuments
    at Delayer.cancel (webpack://aws/cloudformation-languageserver/src/utils/Delayer.ts?f28b:145:28)
    at eval (webpack://aws/cloudformation-languageserver/src/utils/Delayer.ts?f28b:36:18)
    at new Promise (<anonymous>)
`;
        expect(extractLocationFromStack(stack)).toEqual({
            'error.file': 'Delayer.ts?f28b',
            'error.line': 145,
            'error.column': 28,
        });
    });
});
