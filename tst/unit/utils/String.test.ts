import { describe, it, expect } from 'vitest';
import { dashesToUnderscores, toStringOrUndefined } from '../../../src/utils/String';

describe('String', () => {
    describe('dashesToUnderscores', () => {
        it('should replace all dashes with underscores', () => {
            expect(dashesToUnderscores('us-east-1')).toBe('us_east_1');
            expect(dashesToUnderscores('ap-southeast-2')).toBe('ap_southeast_2');
            expect(dashesToUnderscores('eu-central-1')).toBe('eu_central_1');
            expect(dashesToUnderscores('useast1')).toBe('useast1');
            expect(dashesToUnderscores('')).toBe('');
            expect(dashesToUnderscores('test-123_abc-xyz')).toBe('test_123_abc_xyz');
        });
    });

    describe('toStringOrUndefined', () => {
        it('should return string values unchanged', () => {
            expect(toStringOrUndefined('hello')).toBe('hello');
            expect(toStringOrUndefined('')).toBe('');
            expect(toStringOrUndefined('123')).toBe('123');
        });

        it('should convert numbers and booleans to strings', () => {
            expect(toStringOrUndefined(123)).toBe('123');
            expect(toStringOrUndefined(true)).toBe('true');
            expect(toStringOrUndefined(false)).toBe('false');
        });

        it('should return undefined for objects, null, undefined, arrays', () => {
            expect(toStringOrUndefined(null)).toBeUndefined();
            expect(toStringOrUndefined(undefined)).toBeUndefined();
            expect(toStringOrUndefined({})).toBeUndefined();
            expect(toStringOrUndefined([])).toBeUndefined();
            expect(toStringOrUndefined({ 'Fn::Sub': 'test' })).toBeUndefined();
        });
    });
});
