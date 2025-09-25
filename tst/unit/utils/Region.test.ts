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

        it('should throw an error for invalid region strings', () => {
            expect(() => getRegion('invalid-region')).toThrow('Unknown region invalid-region');
            expect(() => getRegion('us-central-1')).toThrow('Unknown region us-central-1');
        });
    });
});
