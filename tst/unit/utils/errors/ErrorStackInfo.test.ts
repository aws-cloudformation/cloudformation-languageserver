import { describe, test, expect } from 'vitest';
import { errorAttributes, errorType, extractLocationFromStack } from '../../../../src/utils/errors/ErrorStackInfo';

describe('ErrorStackInfo', () => {
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

    describe('extractLocationFromStack - sensitive data sanitization', () => {
        test('sanitizes IAM user ARN with account ID', () => {
            const stack = 'AccessDenied: User: arn:aws:iam::123456789012:user/test-user is not authorized';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('AccessDenied: User: arn:aws:<REDACTED> is not authorized');
            expect(result['error.message']).not.toContain('123456789012');
            expect(result['error.message']).not.toContain('test-user');
        });

        test('sanitizes STS assumed role ARN', () => {
            const stack = 'arn:aws:sts::123456789012:assumed-role/MyRole/session-name';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('arn:aws:<REDACTED>');
            expect(result['error.message']).not.toContain('123456789012');
            expect(result['error.message']).not.toContain('MyRole');
        });

        test('sanitizes IAM role ARN', () => {
            const stack = 'arn:aws:iam::111122223333:role/AdminRole not found';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('arn:aws:<REDACTED> not found');
            expect(result['error.message']).not.toContain('111122223333');
            expect(result['error.message']).not.toContain('AdminRole');
        });

        test('sanitizes standalone 12-digit account ID', () => {
            const stack = 'Account 123456789012 not found';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('Account <ACCOUNT_ID> not found');
        });

        test('does not sanitize S3 ARN without account ID', () => {
            const stack = 'arn:aws:s3:::my-bucket';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('arn:aws:s3:::my-bucket');
        });

        test('sanitizes multiple ARNs in same message', () => {
            const stack =
                'User arn:aws:iam::111111111111:user/user-a cannot access arn:aws:iam::222222222222:role/role-b';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('User arn:aws:<REDACTED> cannot access arn:aws:<REDACTED>');
        });

        test('sanitizes real AWS AccessDenied error message format', () => {
            const stack = `AccessDenied: User: arn:aws:iam::123456789012:user/some-user is not authorized to perform: cloudformation:ListTypes because no identity-based policy allows the cloudformation:ListTypes action
    at ProtocolLib.getErrorSchemaOrThrowBaseException (webpack://aws/cloudformation-languageserver/node_modules/@aws-sdk/client-cloudformation/node_modules/@aws-sdk/core/dist-es/submodules/protocols/ProtocolLib.js:60:1)`;
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).not.toMatch(/\d{12}/);
            expect(result['error.message']).toContain('AccessDenied');
            expect(result['error.message']).toContain('arn:aws:<REDACTED>');
        });

        test('sanitizes regionalized EC2 ARN', () => {
            const stack = 'Error: arn:aws:ec2:us-east-1:123456789012:instance/i-0abcdef1234567890';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('Error: arn:aws:<REDACTED>');
        });

        test('sanitizes aws-cn partition ARN', () => {
            const stack = 'Error: arn:aws-cn:lambda:cn-north-1:123456789012:function:my-func';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('Error: arn:aws:<REDACTED>');
        });

        test('sanitizes aws-us-gov partition ARN', () => {
            const stack = 'Error: arn:aws-us-gov:rds:us-gov-west-1:123456789012:db:my-db';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('Error: arn:aws:<REDACTED>');
        });

        test('sanitizes aws-iso partition ARN', () => {
            const stack = 'Error: arn:aws-iso:ec2:us-iso-east-1:123456789012:instance/i-abc';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('Error: arn:aws:<REDACTED>');
        });

        test('sanitizes global IAM ARN from aws-cn partition', () => {
            const stack = 'Error: arn:aws-cn:iam::123456789012:user/test-user';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('Error: arn:aws:<REDACTED>');
        });

        test('sanitizes CloudFront distribution ARN (global service)', () => {
            const stack = 'Error: arn:aws:cloudfront::123456789012:distribution/EDFDVBD632BHDS';
            const result = extractLocationFromStack(stack);
            expect(result['error.message']).toBe('Error: arn:aws:<REDACTED>');
        });
    });

    describe('errorAttributes', () => {
        test('returns attributes for Error with stack and default origin', () => {
            const error = new Error('test message');
            error.stack = 'Error: test message\n    at func (file.ts:10:5)';

            const result = errorAttributes(error);

            expect(result).toEqual({
                'error.origin': 'Unknown',
                'error.message': 'Error: test message',
                'error.stack': 'at func (file.ts:10:5)',
            });

            expect(errorType(error)).toEqual({
                'error.code': 'Unknown',
                'error.type': 'Error',
            });
        });

        test('returns attributes for custom Error type', () => {
            const error = new TypeError('type error');
            error.stack = 'TypeError: type error\n    at func (file.ts:1:1)';
            (error as NodeJS.ErrnoException).code = 'SomeCode';

            const result = errorAttributes(error);

            expect(result).toEqual({
                'error.origin': 'Unknown',
                'error.message': 'TypeError: type error',
                'error.stack': 'at func (file.ts:1:1)',
            });

            expect(errorType(error)).toEqual({
                'error.code': 'SomeCode',
                'error.type': 'TypeError',
            });
        });

        test('returns attributes with uncaughtException origin', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at x (x.ts:1:1)';

            const result = errorAttributes(error, 'uncaughtException');

            expect(result).toEqual({
                'error.origin': 'uncaughtException',
                'error.message': 'Error: test',
                'error.stack': 'at x (x.ts:1:1)',
            });

            expect(errorType(error)).toEqual({
                'error.code': 'Unknown',
                'error.type': 'Error',
            });
        });

        test('returns attributes with unhandledRejection origin', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at x (x.ts:1:1)';

            const result = errorAttributes(error, 'unhandledRejection');

            expect(result).toEqual({
                'error.origin': 'unhandledRejection',
                'error.message': 'Error: test',
                'error.stack': 'at x (x.ts:1:1)',
            });

            expect(errorType(error)).toEqual({
                'error.code': 'Unknown',
                'error.type': 'Error',
            });
        });

        test('returns attributes for non-Error string value', () => {
            const error = 'string error';
            const result = errorAttributes(error);

            expect(result).toEqual({
                'error.origin': 'Unknown',
            });

            expect(errorType(error)).toEqual({
                'error.code': 'Unknown',
                'error.type': 'string',
            });
        });

        test('returns attributes for non-Error null value', () => {
            const error = null;
            const result = errorAttributes(error);

            expect(result).toEqual({
                'error.origin': 'Unknown',
            });

            expect(errorType(error)).toEqual({
                'error.code': 'Unknown',
                'error.type': 'object',
            });
        });

        test('returns attributes for non-Error undefined value', () => {
            const error = undefined;
            const result = errorAttributes(error);

            expect(result).toEqual({
                'error.origin': 'Unknown',
            });

            expect(errorType(error)).toEqual({
                'error.code': 'Unknown',
                'error.type': 'undefined',
            });
        });
    });

    describe('errorType / errorAttributes cause walking', () => {
        test('errorType surfaces the lmdb-js commitError cause', () => {
            const cause = Object.assign(new Error('map full'), { code: 'MDB_MAP_FULL' });
            cause.name = 'MDBError';
            const wrapper = Object.assign(new Error('Commit failed (see commitError for details)'), {
                commitError: cause,
            });

            expect(errorType(wrapper)).toEqual({
                'error.type': 'Error',
                'error.code': 'Unknown',
                'error.cause.type': 'MDBError',
                'error.cause.code': 'MDB_MAP_FULL',
            });
        });

        test('errorType surfaces the ES2022 cause chain', () => {
            const cause = Object.assign(new Error('disk full'), { code: 'ENOSPC' });
            const wrapper = new Error('write failed', { cause });

            expect(errorType(wrapper)).toEqual({
                'error.type': 'Error',
                'error.code': 'Unknown',
                'error.cause.type': 'Error',
                'error.cause.code': 'ENOSPC',
            });
        });

        test('errorType reports Unknown cause code when the cause has none', () => {
            const wrapper = new Error('wrapper', { cause: new Error('inner') });

            expect(errorType(wrapper)).toEqual({
                'error.type': 'Error',
                'error.code': 'Unknown',
                'error.cause.type': 'Error',
                'error.cause.code': 'Unknown',
            });
        });

        test('errorAttributes surfaces the sanitized cause message and stack', () => {
            const cause = new Error('inner boom');
            cause.stack = 'Error: inner boom\n    at inner (file.ts:5:5)';
            const wrapper = Object.assign(new Error('Commit failed'), { commitError: cause });
            wrapper.stack = 'Error: Commit failed\n    at outer (file.ts:1:1)';

            expect(errorAttributes(wrapper)).toEqual({
                'error.origin': 'Unknown',
                'error.message': 'Error: Commit failed',
                'error.stack': 'at outer (file.ts:1:1)',
                'error.cause.message': 'Error: inner boom',
                'error.cause.stack': 'at inner (file.ts:5:5)',
            });
        });

        test('leaves attributes unchanged when there is no cause', () => {
            const error = new Error('standalone');
            error.stack = 'Error: standalone\n    at x (x.ts:1:1)';

            expect(errorAttributes(error)).toEqual({
                'error.origin': 'Unknown',
                'error.message': 'Error: standalone',
                'error.stack': 'at x (x.ts:1:1)',
            });
            expect(errorType(error)).toEqual({
                'error.type': 'Error',
                'error.code': 'Unknown',
            });
        });
    });

    describe('errorType structured AWS/axios fields and sanitization', () => {
        test('captures AWS SDK http status and wire Code', () => {
            const awsError = Object.assign(new Error('User is not authorized'), {
                Code: 'AccessDenied',
                $metadata: { httpStatusCode: 403 },
            });
            awsError.name = 'AccessDeniedException';

            expect(errorType(awsError)).toEqual({
                'error.type': 'AccessDeniedException',
                'error.code': 'AccessDenied',
                'error.http.status': 403,
                'error.aws.category': 'permissions',
                'error.aws.http.status': '403',
            });
        });

        test('captures axios response status and code', () => {
            const axiosError = Object.assign(new Error('Request failed with status code 503'), {
                code: 'ERR_BAD_RESPONSE',
                response: { status: 503 },
            });
            axiosError.name = 'AxiosError';

            expect(errorType(axiosError)).toEqual({
                'error.type': 'AxiosError',
                'error.code': 'ERR_BAD_RESPONSE',
                'error.http.status': 503,
            });
        });

        test('captures http status from the cause', () => {
            const cause = Object.assign(new Error('throttled'), { $metadata: { httpStatusCode: 429 } });
            cause.name = 'ThrottlingException';
            const wrapper = new Error('wrapper', { cause });

            expect(errorType(wrapper)).toEqual({
                'error.type': 'Error',
                'error.code': 'Unknown',
                'error.cause.type': 'ThrottlingException',
                'error.cause.code': 'Unknown',
                'error.cause.http.status': '429',
            });
        });

        test('sanitizes account IDs and ARNs in code and type', () => {
            const error = Object.assign(new Error('boom'), { code: 'arn:aws:iam::123456789012:role/secret' });
            error.name = 'Err-123456789012';

            const result = errorType(error);

            expect(result['error.code']).toBe('arn:aws:<REDACTED>');
            expect(result['error.type']).toBe('Err-<ACCOUNT_ID>');
        });
    });

    describe('errorType AWS classification attributes', () => {
        test('omits AWS attributes for non-AWS errors (category unknown)', () => {
            const result = errorType(new Error('plain bug'));

            expect(result['error.aws.category']).toBeUndefined();
            expect(result['error.aws.http.status']).toBeUndefined();
        });

        test('omits AWS attributes for primitive non-Error inputs', () => {
            expect(errorType('string error')['error.aws.category']).toBeUndefined();
            expect(errorType(null)['error.aws.category']).toBeUndefined();
            expect(errorType(undefined)['error.aws.category']).toBeUndefined();
        });

        test('classifies AWS credentials errors (ExpiredTokenException) without http status', () => {
            const error = Object.assign(new Error('expired'), { name: 'ExpiredTokenException' });

            expect(errorType(error)).toMatchObject({
                'error.type': 'ExpiredTokenException',
                'error.aws.category': 'credentials',
            });
            expect(errorType(error)['error.aws.http.status']).toBeUndefined();
        });

        test('classifies AWS credentials errors via 401 http status', () => {
            const error = Object.assign(new Error('unauthorized'), {
                $metadata: { httpStatusCode: 401 },
            });

            expect(errorType(error)).toMatchObject({
                'error.aws.category': 'credentials',
                'error.aws.http.status': '401',
            });
        });

        test('classifies permissions via AccessDenied name without http status', () => {
            const error = Object.assign(new Error('forbidden'), { name: 'AccessDenied' });

            expect(errorType(error)).toMatchObject({
                'error.aws.category': 'permissions',
            });
            expect(errorType(error)['error.aws.http.status']).toBeUndefined();
        });

        test('classifies permissions via 403 http status alone', () => {
            const error = Object.assign(new Error('forbidden'), {
                name: 'SomeOtherException',
                $metadata: { httpStatusCode: 403 },
            });

            expect(errorType(error)).toMatchObject({
                'error.aws.category': 'permissions',
                'error.aws.http.status': '403',
            });
        });

        test('classifies throttling via ThrottlingException name', () => {
            const error = Object.assign(new Error('rate exceeded'), { name: 'ThrottlingException' });

            expect(errorType(error)).toMatchObject({
                'error.aws.category': 'throttling',
            });
        });

        test('classifies throttling via 429 http status alone', () => {
            const error = Object.assign(new Error('rate exceeded'), {
                name: 'SomeException',
                $metadata: { httpStatusCode: 429 },
            });

            expect(errorType(error)).toMatchObject({
                'error.aws.category': 'throttling',
                'error.aws.http.status': '429',
            });
        });

        test('classifies generic 4xx (non-401/403/429) AWS responses as service', () => {
            const error = Object.assign(new Error('not found'), {
                name: 'ResourceNotFoundException',
                $metadata: { httpStatusCode: 404 },
            });

            expect(errorType(error)).toMatchObject({
                'error.aws.category': 'service',
                'error.aws.http.status': '404',
            });
        });

        test('classifies generic 5xx AWS responses as service', () => {
            const error = Object.assign(new Error('boom'), {
                name: 'InternalFailure',
                $metadata: { httpStatusCode: 500 },
            });

            expect(errorType(error)).toMatchObject({
                'error.aws.category': 'service',
                'error.aws.http.status': '500',
            });
        });

        test('credentials category beats permissions when both 401 (credentials) and AccessDeniedException name conflict', () => {
            // Hard-coded order: credential checks fire first, so 401 wins over AccessDeniedException.
            const error = Object.assign(new Error('unauth'), {
                name: 'AccessDeniedException',
                $metadata: { httpStatusCode: 401 },
            });

            expect(errorType(error)['error.aws.category']).toBe('credentials');
        });

        test('does not classify the wrapper from its cause', () => {
            // classifyAwsError walks only the immediate error, not its cause chain.
            const cause = Object.assign(new Error('inner'), {
                name: 'AccessDeniedException',
                $metadata: { httpStatusCode: 403 },
            });
            const wrapper = new Error('wrapper', { cause });

            expect(errorType(wrapper)['error.aws.category']).toBeUndefined();
            // Cause-derived attributes still get surfaced separately.
            expect(errorType(wrapper)['error.cause.type']).toBe('AccessDeniedException');
            expect(errorType(wrapper)['error.cause.http.status']).toBe('403');
        });

        test('sanitizes the http status string field', () => {
            const error = Object.assign(new Error('boom'), {
                name: 'Some',
                $metadata: { httpStatusCode: 500 },
            });

            // Sanity check: http.status is stringified via sanitizeMessage.
            expect(typeof errorType(error)['error.aws.http.status']).toBe('string');
        });
    });
});
