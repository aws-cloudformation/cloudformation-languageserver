import { describe, it, expect } from 'vitest';
import { AwsRegion, getRegion } from '../../../src/utils/Region';

describe('Region', () => {
    describe('AwsRegion enum', () => {
        it('should have the correct values for major regions', () => {
            expect(AwsRegion.US_EAST_1).toBe('us-east-1');
            expect(AwsRegion.EU_WEST_1).toBe('eu-west-1');
            expect(AwsRegion.US_WEST_2).toBe('us-west-2');
        });
    });

    describe('getRegion', () => {
        it('should return the correct region when given a valid region string', () => {
            expect(getRegion('us-east-1')).toBe(AwsRegion.US_EAST_1);
            expect(getRegion('eu-west-1')).toBe(AwsRegion.EU_WEST_1);
        });

        it('should handle uppercase region strings', () => {
            expect(getRegion('US-EAST-1')).toBe(AwsRegion.US_EAST_1);
            expect(getRegion('EU-WEST-1')).toBe(AwsRegion.EU_WEST_1);
        });

        it('should handle region strings with underscores instead of dashes', () => {
            expect(getRegion('US_EAST_1')).toBe(AwsRegion.US_EAST_1);
            expect(getRegion('EU_WEST_1')).toBe(AwsRegion.EU_WEST_1);
        });

        it('should not throw when region has a valid pattern', () => {
            expect(getRegion('invalid_region')).toBe('invalid-region');
            expect(getRegion('US_test-1')).toBe('us-test-1');
        });

        it('can parse all regions', () => {
            for (const reg of Object.keys(AwsRegion)) {
                expect(getRegion(reg)).toBe(reg.toLowerCase().replaceAll('_', '-'));
            }

            for (const reg of Object.values(AwsRegion)) {
                expect(getRegion(reg)).toBe(reg);
            }
        });

        it('throws on invalid regions', () => {
            expect(() => getRegion('a')).toThrow('Invalid region a (a)');
            expect(() => getRegion('a'.repeat(26))).toThrow(`Invalid region ${'a'.repeat(26)} (${'a'.repeat(26)})`);
        });
    });
});
