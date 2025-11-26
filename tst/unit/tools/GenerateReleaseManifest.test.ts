import { rcompare } from 'semver';
import { describe, it, expect } from 'vitest';

describe('Generate Release Manifest', () => {
    describe('semver version sorting within environments', () => {
        it('should sort timestamp-based alpha versions in descending order', () => {
            const alphaVersions = [
                'v1.1.0-202511232358-alpha',
                'v1.1.0-202511240000-alpha',
                'v1.1.0-202511220000-alpha',
            ];
            const sorted = alphaVersions.sort((a, b) => rcompare(a, b));
            expect(sorted).toEqual([
                'v1.1.0-202511240000-alpha',
                'v1.1.0-202511232358-alpha',
                'v1.1.0-202511220000-alpha',
            ]);
        });

        it('should sort beta versions in descending order', () => {
            const betaVersions = ['v1.0.0-beta', 'v1.2.0-beta', 'v1.1.0-beta'];
            const sorted = betaVersions.sort((a, b) => rcompare(a, b));
            expect(sorted).toEqual(['v1.2.0-beta', 'v1.1.0-beta', 'v1.0.0-beta']);
        });

        it('should sort prod versions in descending order', () => {
            const prodVersions = ['v1.0.0', 'v1.2.0', 'v1.1.0'];
            const sorted = prodVersions.sort((a, b) => rcompare(a, b));
            expect(sorted).toEqual(['v1.2.0', 'v1.1.0', 'v1.0.0']);
        });
    });
});
