import { describe, it, expect } from 'vitest';
import { dashesToUnderscores } from '../../../src/utils/String';

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
});
