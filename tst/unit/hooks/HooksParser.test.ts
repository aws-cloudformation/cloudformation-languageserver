import { describe, it, expect } from 'vitest';
import {
    parseListHooksParams,
    parseDescribeHookParams,
    parseListHookResultsParams,
    parseGetHookResultParams,
    parseConfigureHookParams,
    parseDeactivateHookParams,
} from '../../../src/hooks/HooksParser';

describe('HooksParser', () => {
    describe('parseListHooksParams', () => {
        it('should accept empty params', () => {
            expect(parseListHooksParams({})).toEqual({});
        });

        it('should accept loadMore as true', () => {
            expect(parseListHooksParams({ loadMore: true })).toEqual({ loadMore: true });
        });

        it('should accept loadMore as false', () => {
            expect(parseListHooksParams({ loadMore: false })).toEqual({ loadMore: false });
        });

        it('should reject unknown properties', () => {
            expect(() => parseListHooksParams({ loadMore: true, unknown: 'value' })).toThrow();
        });
    });

    describe('parseDescribeHookParams', () => {
        it('should accept typeName only', () => {
            const result = parseDescribeHookParams({ typeName: 'Private::Guard::S3Check' });
            expect(result).toEqual({ typeName: 'Private::Guard::S3Check' });
        });

        it('should accept arn only', () => {
            const result = parseDescribeHookParams({
                arn: 'arn:aws:cloudformation:us-east-1:123456789:type/hook/Private-Guard-S3Check',
            });
            expect(result).toEqual({
                arn: 'arn:aws:cloudformation:us-east-1:123456789:type/hook/Private-Guard-S3Check',
            });
        });

        it('should accept both typeName and arn', () => {
            const result = parseDescribeHookParams({ typeName: 'Private::Guard::S3Check', arn: 'arn:aws:...' });
            expect(result).toEqual({ typeName: 'Private::Guard::S3Check', arn: 'arn:aws:...' });
        });

        it('should reject when neither typeName nor arn is provided', () => {
            expect(() => parseDescribeHookParams({})).toThrow();
        });

        it('should reject empty typeName with no arn', () => {
            expect(() => parseDescribeHookParams({ typeName: '' })).toThrow();
        });

        it('should reject whitespace-only typeName with no arn', () => {
            expect(() => parseDescribeHookParams({ typeName: '   ' })).toThrow();
        });
    });

    describe('parseListHookResultsParams', () => {
        it('should accept empty params (list all results)', () => {
            expect(parseListHookResultsParams({})).toEqual({});
        });

        it('should accept typeArn filter', () => {
            const result = parseListHookResultsParams({ typeArn: 'arn:aws:...' });
            expect(result).toEqual({ typeArn: 'arn:aws:...' });
        });

        it('should accept valid targetType CHANGE_SET', () => {
            const result = parseListHookResultsParams({ targetType: 'CHANGE_SET' });
            expect(result).toEqual({ targetType: 'CHANGE_SET' });
        });

        it('should accept valid targetType STACK', () => {
            const result = parseListHookResultsParams({ targetType: 'STACK' });
            expect(result).toEqual({ targetType: 'STACK' });
        });

        it('should accept valid targetType RESOURCE', () => {
            const result = parseListHookResultsParams({ targetType: 'RESOURCE' });
            expect(result).toEqual({ targetType: 'RESOURCE' });
        });

        it('should accept valid targetType CLOUD_CONTROL', () => {
            const result = parseListHookResultsParams({ targetType: 'CLOUD_CONTROL' });
            expect(result).toEqual({ targetType: 'CLOUD_CONTROL' });
        });

        it('should reject invalid targetType', () => {
            expect(() => parseListHookResultsParams({ targetType: 'INVALID' })).toThrow();
        });

        it('should accept nextToken for pagination', () => {
            const result = parseListHookResultsParams({ nextToken: 'abc123' });
            expect(result).toEqual({ nextToken: 'abc123' });
        });

        it('should accept combined filters', () => {
            const result = parseListHookResultsParams({
                typeArn: 'arn:aws:...',
                status: 'HOOK_COMPLETE_FAILED',
                targetType: 'STACK',
            });
            expect(result).toEqual({
                typeArn: 'arn:aws:...',
                status: 'HOOK_COMPLETE_FAILED',
                targetType: 'STACK',
            });
        });
    });

    describe('parseGetHookResultParams', () => {
        it('should accept valid hookResultId', () => {
            const result = parseGetHookResultParams({ hookResultId: 'result-123-abc' });
            expect(result).toEqual({ hookResultId: 'result-123-abc' });
        });

        it('should reject missing hookResultId', () => {
            expect(() => parseGetHookResultParams({})).toThrow();
        });

        it('should reject empty hookResultId', () => {
            expect(() => parseGetHookResultParams({ hookResultId: '' })).toThrow();
        });

        it('should reject whitespace-only hookResultId', () => {
            expect(() => parseGetHookResultParams({ hookResultId: '   ' })).toThrow();
        });
    });

    describe('parseConfigureHookParams', () => {
        it('should accept valid typeName and failureMode', () => {
            const result = parseConfigureHookParams({
                typeName: 'Private::Guard::S3Check',
                failureMode: 'FAIL',
            });
            expect(result).toEqual({
                typeName: 'Private::Guard::S3Check',
                failureMode: 'FAIL',
            });
        });

        it('should accept WARN failureMode', () => {
            const result = parseConfigureHookParams({
                typeName: 'Private::Guard::S3Check',
                failureMode: 'WARN',
            });
            expect(result.failureMode).toBe('WARN');
        });

        it('should reject missing typeName', () => {
            expect(() => parseConfigureHookParams({ failureMode: 'FAIL' })).toThrow();
        });

        it('should reject empty typeName', () => {
            expect(() => parseConfigureHookParams({ typeName: '', failureMode: 'FAIL' })).toThrow();
        });

        it('should reject missing failureMode', () => {
            expect(() => parseConfigureHookParams({ typeName: 'Private::Guard::S3Check' })).toThrow();
        });

        it('should reject invalid failureMode', () => {
            expect(() =>
                parseConfigureHookParams({ typeName: 'Private::Guard::S3Check', failureMode: 'INVALID' }),
            ).toThrow();
        });
    });

    describe('parseDeactivateHookParams', () => {
        it('should accept typeName', () => {
            const result = parseDeactivateHookParams({ typeName: 'Private::Guard::S3Check' });
            expect(result).toEqual({ typeName: 'Private::Guard::S3Check' });
        });

        it('should accept arn', () => {
            const result = parseDeactivateHookParams({ arn: 'arn:aws:...' });
            expect(result).toEqual({ arn: 'arn:aws:...' });
        });

        it('should reject when neither typeName nor arn is provided', () => {
            expect(() => parseDeactivateHookParams({})).toThrow();
        });

        it('should reject empty typeName with no arn', () => {
            expect(() => parseDeactivateHookParams({ typeName: '' })).toThrow();
        });
    });
});
