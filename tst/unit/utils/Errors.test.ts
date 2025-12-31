import { describe, test, expect } from 'vitest';
import { errorAttributes, extractLocationFromStack } from '../../../src/utils/Errors';

describe('extractLocationFromStack', () => {
    test('returns empty object when stack is undefined', () => {
        expect(extractLocationFromStack(undefined)).toEqual({});
    });

    test('returns empty object when stack is empty string', () => {
        expect(extractLocationFromStack('')).toEqual({});
    });

    test('extracts location from stack with parentheses format', () => {
        const stack = 'Error: test\n    at Object.<anonymous> (/path/to/file.ts:01234:56789)';
        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: test',
            'error.stack': 'at Object.<anonymous> (/path/to/file.ts:01234:56789)',
        });
    });

    test('extracts location from stack without parentheses format', () => {
        const stack = 'Error: test\n    at /path/to/file.js:01234:56789';
        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: test',
            'error.stack': 'at /path/to/file.js:01234:56789',
        });
    });

    test('extracts filename from Windows path', () => {
        const stack = 'Error: test\n    at Object.<anonymous> (C:\\path\\to\\file.ts:01234:56789)';
        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: test',
            'error.stack': `at Object.<anonymous> (C:/path/to/file.ts:01234:56789)`,
        });
    });

    test('returns just message when no match found', () => {
        const stack = 'Error: test\n    at something without location';
        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: test',
            'error.stack': 'at something without location',
        });
    });

    test('extract error from exception', () => {
        const stack = String.raw`
Error: Request cancelled for key: SendDocuments
    at Delayer.cancel (webpack://aws/cloudformation-languageserver/src/utils/Delayer.ts?f28b:145:28)
    at eval (webpack://aws/cloudformation-languageserver/src/utils/Delayer.ts?f28b:36:18)
    at new Promise (<anonymous>)
`;
        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: Request cancelled for key: SendDocuments',
            'error.stack': `at Delayer.cancel (webpack://aws/cloudformation-languageserver/[*]/[*]/Delayer.ts?f28b:145:28)
at eval (webpack://aws/cloudformation-languageserver/[*]/[*]/Delayer.ts?f28b:36:18)
at new Promise (<anonymous>)`,
        });
    });

    test('full stack', () => {
        expect(
            extractLocationFromStack(String.raw`
Error: ENOENT: no such file or directory, scandir 'some-dir/cloudformation-languageserver/bundle/development/.aws-cfn-storage/lmdb'
    at readdirSync (node:fs:1584:26)
    at node:electron/js2c/node_init:2:16044
    at LMDBStoreFactory.cleanupOldVersions (webpack://aws/cloudformation-languageserver/src/datastore/LMDB.ts?d928:98:36)
    at Timeout.eval (webpack://aws/cloudformation-languageserver/src/datastore/LMDB.ts?d928:58:22)
    at listOnTimeout (node:internal/timers:588:17)
    at process.processTimers (node:internal/timers:523:7)
`),
        ).toEqual({
            'error.message':
                "Error: ENOENT: no such file or directory, scandir 'some-dir/cloudformation-languageserver/bundle/development/.aws-cfn-storage/lmdb'",
            'error.stack': `at readdirSync (node:fs:1584:26)
at node:electron/js2c/node_init:2:16044
at LMDBStoreFactory.cleanupOldVersions (webpack://aws/cloudformation-languageserver/[*]/datastore/LMDB.ts?d928:98:36)
at Timeout.eval (webpack://aws/cloudformation-languageserver/[*]/datastore/LMDB.ts?d928:58:22)
at listOnTimeout (node:internal/timers:588:17)
at process.processTimers (node:internal/timers:523:7)`,
        });
    });

    test('stack trace from GitHub issue', () => {
        expect(
            extractLocationFromStack(String.raw`
Error: PeriodicExportingMetricReader: metrics export failed (error Error: socket hang up)
    at PeriodicExportingMetricReader._doRun (cloudformation-languageserver/1.0.0/cloudformation-languageserver-1.0.0-darwin-x64-node22/node_modules/@opentelemetry/sdk-metrics/build/src/export/PeriodicExportingMetricReader.js:88:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async PeriodicExportingMetricReader._runOnce (cloudformation-languageserver/1.0.0/cloudformation-languageserver-1.0.0-darwin-x64-node22/node_modules/@opentelemetry/sdk-metrics/build/src/export/PeriodicExportingMetricReader.js:57:13)
`),
        ).toEqual({
            'error.message':
                'Error: PeriodicExportingMetricReader: metrics export failed (error Error: socket hang up)',
            'error.stack': `at PeriodicExportingMetricReader._doRun (cloudformation-languageserver/1.0.0/cloudformation-languageserver-1.0.0-darwin-x64-node22/node_modules/@opentelemetry/sdk-metrics/build/[*]/export/PeriodicExportingMetricReader.js:88:19)
at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
at async PeriodicExportingMetricReader._runOnce (cloudformation-languageserver/1.0.0/cloudformation-languageserver-1.0.0-darwin-x64-node22/node_modules/@opentelemetry/sdk-metrics/build/[*]/export/PeriodicExportingMetricReader.js:57:13)`,
        });
    });

    test('handles Windows backslash paths', () => {
        const stack = String.raw`Error: test
    at Object.<anonymous> (C:\testuser\cloudformation-languageserver\\src\file.ts:10:5)`;

        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: test',
            'error.stack': 'at Object.<anonymous> (C:/testuser/cloudformation-languageserver/[*]/file.ts:10:5)',
        });
    });

    test('handles mixed path separators', () => {
        const stack = String.raw`Error: test
    at func (C:\cloudformation-languageserver\src/file.ts:10:5)`;

        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: test',
            'error.stack': 'at func (C:/cloudformation-languageserver/[*]/file.ts:10:5)',
        });
    });

    test('handles stack with no file location', () => {
        const stack = 'Error: test\n    at <anonymous>';

        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: test',
            'error.stack': 'at <anonymous>',
        });
    });

    test('skips empty lines in stack', () => {
        const stack = 'Error: test\n    at func1 (file.ts:1:1)\n    at \n    at func2 (file.ts:2:2)';

        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: test',
            'error.stack': `at func1 (file.ts:1:1)
at
at func2 (file.ts:2:2)`,
        });
    });

    test('handles node internal modules', () => {
        const stack = `Error: test
    at Module._compile (node:internal/modules/cjs/loader:1159:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1213:10)`;

        expect(extractLocationFromStack(stack)).toEqual({
            'error.message': 'Error: test',
            'error.stack': `at Module._compile (node:internal/modules/cjs/loader:1159:14)
at Object.Module._extensions..js (node:internal/modules/cjs/loader:1213:10)`,
        });
    });
});

describe('errorAttributes', () => {
    test('returns attributes for Error with stack and default origin', () => {
        const error = new Error('test message');
        error.stack = 'Error: test message\n    at func (file.ts:10:5)';

        const result = errorAttributes(error);

        expect(result).toEqual({
            'error.type': 'Error',
            'error.origin': 'Unknown',
            'error.message': 'Error: test message',
            'error.stack': 'at func (file.ts:10:5)',
        });
    });

    test('returns attributes for custom Error type', () => {
        const error = new TypeError('type error');
        error.stack = 'TypeError: type error\n    at func (file.ts:1:1)';

        const result = errorAttributes(error);

        expect(result).toEqual({
            'error.type': 'TypeError',
            'error.origin': 'Unknown',
            'error.message': 'TypeError: type error',
            'error.stack': 'at func (file.ts:1:1)',
        });
    });

    test('returns attributes with uncaughtException origin', () => {
        const error = new Error('test');
        error.stack = 'Error: test\n    at x (x.ts:1:1)';

        const result = errorAttributes(error, 'uncaughtException');

        expect(result).toEqual({
            'error.type': 'Error',
            'error.origin': 'uncaughtException',
            'error.message': 'Error: test',
            'error.stack': 'at x (x.ts:1:1)',
        });
    });

    test('returns attributes with unhandledRejection origin', () => {
        const error = new Error('test');
        error.stack = 'Error: test\n    at x (x.ts:1:1)';

        const result = errorAttributes(error, 'unhandledRejection');

        expect(result).toEqual({
            'error.type': 'Error',
            'error.origin': 'unhandledRejection',
            'error.message': 'Error: test',
            'error.stack': 'at x (x.ts:1:1)',
        });
    });

    test('returns attributes for non-Error string value', () => {
        const result = errorAttributes('string error');

        expect(result).toEqual({
            'error.type': 'string',
            'error.origin': 'Unknown',
        });
    });

    test('returns attributes for non-Error null value', () => {
        const result = errorAttributes(null);

        expect(result).toEqual({
            'error.type': 'object',
            'error.origin': 'Unknown',
        });
    });

    test('returns attributes for non-Error undefined value', () => {
        const result = errorAttributes(undefined);

        expect(result).toEqual({
            'error.type': 'undefined',
            'error.origin': 'Unknown',
        });
    });
});
