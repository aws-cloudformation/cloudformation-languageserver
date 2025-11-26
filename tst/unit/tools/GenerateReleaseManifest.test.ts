import { rcompare } from 'semver';
import { describe, it, expect } from 'vitest';
import { parseTarget } from '../../../tools/generate-release-manifest';

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

    describe('parseTarget', () => {
        it('should parse linux with glib postfix', () => {
            expect(parseTarget('cloudformation-languageserver-1.2.0-alpha-linuxglib2.28-x64-node18.zip')).toEqual({
                platform: 'linuxglib2.28',
                arch: 'x64',
                nodejs: '18',
            });
        });

        it('should parse linux without postfix', () => {
            expect(parseTarget('cloudformation-languageserver-1.2.0-alpha-linux-arm64-node22.zip')).toEqual({
                platform: 'linux',
                arch: 'arm64',
                nodejs: '22',
            });
        });

        it('should parse darwin', () => {
            expect(parseTarget('cloudformation-languageserver-1.2.0-alpha-darwin-arm64-node22.zip')).toEqual({
                platform: 'darwin',
                arch: 'arm64',
                nodejs: '22',
            });
        });

        it('should parse win32', () => {
            expect(parseTarget('cloudformation-languageserver-1.2.0-alpha-win32-x64-node22.zip')).toEqual({
                platform: 'win32',
                arch: 'x64',
                nodejs: '22',
            });
        });

        it('should parse without nodejs version', () => {
            expect(parseTarget('cloudformation-languageserver-1.2.0-linux-x64.zip')).toEqual({
                platform: 'linux',
                arch: 'x64',
                nodejs: undefined,
            });
        });

        it('should return null for non-zip files', () => {
            expect(parseTarget('cloudformation-languageserver-1.2.0-linux-x64.tar.gz')).toBeNull();
        });

        it('should return null for invalid architecture', () => {
            expect(parseTarget('cloudformation-languageserver-1.2.0-linux-i386.zip')).toBeNull();
        });
    });
});
