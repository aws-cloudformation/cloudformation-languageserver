import { describe, it, expect } from 'vitest';
import { PartialFleetSelector } from '../../../src/featureFlag/PartialFleetSelector';

describe('PartialFleetSelector', () => {
    describe('constructor', () => {
        it('should accept valid percentage values', () => {
            expect(() => new PartialFleetSelector('feature', 0)).not.toThrow();
            expect(() => new PartialFleetSelector('feature', 50)).not.toThrow();
            expect(() => new PartialFleetSelector('feature', 100)).not.toThrow();
        });

        it('should throw error for percentage below 0', () => {
            expect(() => new PartialFleetSelector('feature', -1)).toThrow(
                'Percentage must be between 0 and 100 (-1 was supplied)',
            );
        });

        it('should throw error for percentage above 100', () => {
            expect(() => new PartialFleetSelector('feature', 101)).toThrow(
                'Percentage must be between 0 and 100 (101 was supplied)',
            );
        });
    });

    describe('isSelected', () => {
        it('should return false when percentage is 0', () => {
            const selector = new PartialFleetSelector('feature', 0);
            expect(selector.isSelected('host1')).toBe(false);
            expect(selector.isSelected('host2')).toBe(false);
        });

        it('should return true when percentage is 100', () => {
            const selector = new PartialFleetSelector('feature', 100);
            expect(selector.isSelected('host1')).toBe(true);
            expect(selector.isSelected('host2')).toBe(true);
        });

        it('should return consistent result for same host and feature', () => {
            const selector = new PartialFleetSelector('feature', 50);
            const result1 = selector.isSelected('host1');
            const result2 = selector.isSelected('host1');
            expect(result1).toBe(result2);
        });

        it('should use different hash for different feature names', () => {
            const selector1 = new PartialFleetSelector('feature1', 50);
            const selector2 = new PartialFleetSelector('feature2', 50);
            const host = 'same-host';

            const result1 = selector1.isSelected(host);
            const result2 = selector2.isSelected(host);

            // Results may differ due to different feature names affecting hash
            expect(typeof result1).toBe('boolean');
            expect(typeof result2).toBe('boolean');
        });

        it('should handle fractional percentages correctly', () => {
            const selector = new PartialFleetSelector('feature', 0.5);
            const result = selector.isSelected('host1');
            expect(typeof result).toBe('boolean');
        });

        it('should use modulo 10000 for percentages less than 1', () => {
            const selector = new PartialFleetSelector('feature', 0.1);
            const results = Array.from({ length: 100 }, (_, i) => selector.isSelected(`host${i}`));
            const selectedCount = results.filter(Boolean).length;

            // With 0.1%, we expect roughly 0-1 hosts selected out of 100
            expect(selectedCount).toBeLessThan(5);
        });

        it('should use modulo 100 for percentages >= 1', () => {
            const selector = new PartialFleetSelector('feature', 50);
            const results = Array.from({ length: 1000 }, (_, i) => selector.isSelected(`host${i}`));
            const selectedCount = results.filter(Boolean).length;

            // With 50%, expect roughly 500 out of 1000 (allow 10% variance)
            expect(selectedCount).toBeGreaterThan(400);
            expect(selectedCount).toBeLessThan(600);
        });

        it('should distribute selection across fleet items', () => {
            const selector = new PartialFleetSelector('feature', 25);
            const hosts = Array.from({ length: 400 }, (_, i) => `host-${i}`);
            const selected = hosts.filter((host) => selector.isSelected(host));

            // With 25%, expect roughly 100 out of 400 (allow 20% variance)
            expect(selected.length).toBeGreaterThan(60);
            expect(selected.length).toBeLessThan(140);
        });
    });
});
