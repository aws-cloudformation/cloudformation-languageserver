import os from 'os';
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
        const stack = 'Error: test\n    at Object.<anonymous> (/path/to/file.ts:01234:56789)';
        expect(extractLocationFromStack(stack)).toEqual({
            stack0: 'Object.<anonymous> (/path/to/file.ts:01234:56789)',
        });
    });

    test('extracts location from stack without parentheses format', () => {
        const stack = 'Error: test\n    at /path/to/file.js:01234:56789';
        expect(extractLocationFromStack(stack)).toEqual({ stack0: '/path/to/file.js:01234:56789' });
    });

    test('extracts filename from Windows path', () => {
        const stack = 'Error: test\n    at Object.<anonymous> (C:\\path\\to\\file.ts:01234:56789)';
        expect(extractLocationFromStack(stack)).toEqual({
            stack0: String.raw`Object.<anonymous> (C:\path\to\file.ts:01234:56789)`,
        });
    });

    test('returns empty object when no match found', () => {
        const stack = 'Error: test\n    at something without location';
        expect(extractLocationFromStack(stack)).toEqual({ stack0: 'something without location' });
    });

    test('extract error from exception', () => {
        const stack = String.raw`
Error: Request cancelled for key: SendDocuments
    at Delayer.cancel (webpack://aws/cloudformation-languageserver/src/utils/Delayer.ts?f28b:145:28)
    at eval (webpack://aws/cloudformation-languageserver/src/utils/Delayer.ts?f28b:36:18)
    at new Promise (<anonymous>)
`;
        expect(extractLocationFromStack(stack)).toEqual({
            stack0: 'Delayer.cancel (/src/utils/Delayer.ts?f28b:145:28)',
            stack1: 'eval (/src/utils/Delayer.ts?f28b:36:18)',
            stack2: 'new Promise (<anonymous>)',
        });
    });

    test('full stack', () => {
        expect(
            extractLocationFromStack(String.raw`
Error: ENOENT: no such file or directory, scandir '/workspace/cfn-lsp/cloudformation-languageserver/bundle/development/.aws-cfn-storage/lmdb'
    at readdirSync (node:fs:1584:26)
    at node:electron/js2c/node_init:2:16044
    at LMDBStoreFactory.cleanupOldVersions (webpack://aws/cloudformation-languageserver/src/datastore/LMDB.ts?d928:98:36)
    at Timeout.eval (webpack://aws/cloudformation-languageserver/src/datastore/LMDB.ts?d928:58:22)
    at listOnTimeout (node:internal/timers:588:17)
    at process.processTimers (node:internal/timers:523:7)
`),
        ).toEqual({
            stack0: 'readdirSync (node:fs:1584:26)',
            stack1: 'node:electron/js2c/node_init:2:16044',
            stack2: 'LMDBStoreFactory.cleanupOldVersions (/src/datastore/LMDB.ts?d928:98:36)',
            stack3: 'Timeout.eval (/src/datastore/LMDB.ts?d928:58:22)',
            stack4: 'listOnTimeout (node:internal/timers:588:17)',
            stack5: 'process.processTimers (node:internal/timers:523:7)',
        });
    });

    test('stack trace from GitHub issue', () => {
        expect(
            extractLocationFromStack(String.raw`
Error: PeriodicExportingMetricReader: metrics export failed (error Error: socket hang up)
    at PeriodicExportingMetricReader._doRun (/workspace/cloudformation-languageserver/1.0.0/cloudformation-languageserver-1.0.0-darwin-x64-node22/node_modules/@opentelemetry/sdk-metrics/build/src/export/PeriodicExportingMetricReader.js:88:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async PeriodicExportingMetricReader._runOnce (/workspace/cloudformation-languageserver/1.0.0/cloudformation-languageserver-1.0.0-darwin-x64-node22/node_modules/@opentelemetry/sdk-metrics/build/src/export/PeriodicExportingMetricReader.js:57:13)
`),
        ).toEqual({
            stack0: 'PeriodicExportingMetricReader._doRun (/1.0.0/cloudformation-languageserver-1.0.0-darwin-x64-node22/node_modules/@opentelemetry/sdk-metrics/build/src/export/PeriodicExportingMetricReader.js:88:19)',
            stack1: 'process.processTicksAndRejections (node:internal/process/task_queues:105:5)',
            stack2: 'async PeriodicExportingMetricReader._runOnce (/1.0.0/cloudformation-languageserver-1.0.0-darwin-x64-node22/node_modules/@opentelemetry/sdk-metrics/build/src/export/PeriodicExportingMetricReader.js:57:13)',
        });
    });

    test('redacts username from paths', () => {
        const username = os.userInfo().username;
        const result = extractLocationFromStack(
            `Error: test\n    at Object.<anonymous> (/SomeDir/${username}/project/file.ts:10:5)`,
        );

        expect(result).toEqual({
            stack0: 'Object.<anonymous> (/SomeDir/REDACTED/project/file.ts:10:5)',
        });
    });

    test('redacts homedir from paths', () => {
        const homedir = os.userInfo().homedir;
        const result = extractLocationFromStack(
            `Error: test\n    at Object.<anonymous> (${homedir}/project/file.ts:10:5)`,
        );
        expect(result).toEqual({
            stack0: 'Object.<anonymous> (REDACTED/project/file.ts:10:5)',
        });
    });

    test('handles Windows backslash paths', () => {
        const stack = String.raw`Error: test
    at Object.<anonymous> (C:\Users\testuser\cloudformation-languageserver\src\file.ts:10:5)`;

        expect(extractLocationFromStack(stack)).toEqual({
            stack0: 'Object.<anonymous> (/src/file.ts:10:5)',
        });
    });

    test('handles mixed path separators', () => {
        const stack = String.raw`Error: test
    at func (C:\workspace/cloudformation-languageserver\src/file.ts:10:5)`;

        expect(extractLocationFromStack(stack)).toEqual({
            stack0: 'func (/src/file.ts:10:5)',
        });
    });

    test('handles multiple stack frames with sensitive data', () => {
        const username = os.userInfo().username;
        const stack = `Error: test
    at func1 (/home/${username}/cloudformation-languageserver/src/a.ts:1:1)
    at func2 (/home/${username}/cloudformation-languageserver/src/b.ts:2:2)`;
        const result = extractLocationFromStack(stack);

        expect(result).toEqual({
            stack0: 'func1 (/src/a.ts:1:1)',
            stack1: 'func2 (/src/b.ts:2:2)',
        });
    });

    test('handles stack with no file location', () => {
        const stack = 'Error: test\n    at <anonymous>';

        expect(extractLocationFromStack(stack)).toEqual({
            stack0: '<anonymous>',
        });
    });

    test('skips empty lines in stack', () => {
        const stack = 'Error: test\n    at func1 (file.ts:1:1)\n    at \n    at func2 (file.ts:2:2)';

        expect(extractLocationFromStack(stack)).toEqual({
            stack0: 'func1 (file.ts:1:1)',
            stack2: 'func2 (file.ts:2:2)',
        });
    });

    test('handles node internal modules', () => {
        const stack = `Error: test
    at Module._compile (node:internal/modules/cjs/loader:1159:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1213:10)`;

        expect(extractLocationFromStack(stack)).toEqual({
            stack0: 'Module._compile (node:internal/modules/cjs/loader:1159:14)',
            stack1: 'Object.Module._extensions..js (node:internal/modules/cjs/loader:1213:10)',
        });
    });
});
