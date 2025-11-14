import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HardwareFeatureFlag } from '../../../src/featureFlag/HardwareFeatureFlag';

const mockArch = 'x64';
const mockPlatform = 'linux';
const mockRelease = '5.10.0';
const mockVersion = 'Linux version 5.10.0';
const mockNodeVersion = 'v20.0.0';
const mockProcessArch = 'arm64';
const mockProcessPlatform = 'darwin';

describe('HardwareFeatureFlag', () => {
    beforeEach(() => {
        vi.mock('os', () => ({
            arch: vi.fn(() => mockArch),
            platform: vi.fn(() => mockPlatform),
            release: vi.fn(() => mockRelease),
            version: vi.fn(() => mockVersion),
        }));

        Object.defineProperty(process, 'version', { value: mockNodeVersion, writable: true });
        Object.defineProperty(process, 'arch', { value: mockProcessArch, writable: true });
        Object.defineProperty(process, 'platform', { value: mockProcessPlatform, writable: true });
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe('exact matching', () => {
        it('should enable when arch matches', () => {
            const flag = new HardwareFeatureFlag('test', { arch: mockArch });
            expect(flag.isEnabled()).toBe(true);
        });

        it('should enable when platform matches', () => {
            const flag = new HardwareFeatureFlag('test', { platform: mockPlatform });
            expect(flag.isEnabled()).toBe(true);
        });

        it('should enable when processArch matches', () => {
            const flag = new HardwareFeatureFlag('test', { processArch: mockProcessArch });
            expect(flag.isEnabled()).toBe(true);
        });

        it('should enable when processPlatform matches', () => {
            const flag = new HardwareFeatureFlag('test', { processPlatform: mockProcessPlatform });
            expect(flag.isEnabled()).toBe(true);
        });

        it('should enable when nodeVersion matches', () => {
            const flag = new HardwareFeatureFlag('test', { nodeVersion: mockNodeVersion });
            expect(flag.isEnabled()).toBe(true);
        });

        it('should disable when arch does not match', () => {
            const flag = new HardwareFeatureFlag('test', { arch: 'arm' });
            expect(flag.isEnabled()).toBe(false);
        });

        it('should disable when platform does not match', () => {
            const flag = new HardwareFeatureFlag('test', { platform: 'win32' });
            expect(flag.isEnabled()).toBe(false);
        });

        it('should disable when processArch does not match', () => {
            const flag = new HardwareFeatureFlag('test', { processArch: 'x86' });
            expect(flag.isEnabled()).toBe(false);
        });

        it('should disable when processPlatform does not match', () => {
            const flag = new HardwareFeatureFlag('test', { processPlatform: 'win32' });
            expect(flag.isEnabled()).toBe(false);
        });
    });

    describe('array matching', () => {
        it('should enable when value matches any in array', () => {
            const flag = new HardwareFeatureFlag('test', { arch: ['arm', mockArch, 's390x'] });
            expect(flag.isEnabled()).toBe(true);
        });

        it('should disable when value matches none in array', () => {
            const flag = new HardwareFeatureFlag('test', { platform: ['win32', 'freebsd', 'openbsd'] });
            expect(flag.isEnabled()).toBe(false);
        });

        it('should enable when multiple arrays all match', () => {
            const flag = new HardwareFeatureFlag('test', {
                processArch: ['x64', mockProcessArch],
                processPlatform: [mockProcessPlatform, 'linux'],
            });
            expect(flag.isEnabled()).toBe(true);
        });
    });

    describe('partial matching', () => {
        it('should enable when substring matches with partial=true', () => {
            const flag = new HardwareFeatureFlag('test', { nodeVersion: 'v20' }, true);
            expect(flag.isEnabled()).toBe(true);
        });

        it('should disable when substring does not match with partial=true', () => {
            const flag = new HardwareFeatureFlag('test', { nodeVersion: 'v18' }, true);
            expect(flag.isEnabled()).toBe(false);
        });

        it('should disable substring match when partial=false', () => {
            const flag = new HardwareFeatureFlag('test', { nodeVersion: 'v20' }, false);
            expect(flag.isEnabled()).toBe(false);
        });

        it('should enable with partial match on release', () => {
            const flag = new HardwareFeatureFlag('test', { release: '5.10' }, true);
            expect(flag.isEnabled()).toBe(true);
        });
    });

    describe('empty criteria', () => {
        it('should enable when no criteria specified', () => {
            const flag = new HardwareFeatureFlag('test', {});
            expect(flag.isEnabled()).toBe(true);
        });

        it('should enable when only undefined criteria', () => {
            const flag = new HardwareFeatureFlag('test', {
                arch: undefined,
                platform: undefined,
            });
            expect(flag.isEnabled()).toBe(true);
        });
    });

    describe('combined criteria', () => {
        it('should require all criteria to match (AND logic)', () => {
            const flag = new HardwareFeatureFlag('test', {
                arch: mockArch,
                platform: 'win32',
            });
            expect(flag.isEnabled()).toBe(false);
        });

        it('should enable when all multiple criteria match', () => {
            const flag = new HardwareFeatureFlag('test', {
                arch: mockArch,
                platform: mockPlatform,
                release: mockRelease,
                version: mockVersion,
                nodeVersion: mockNodeVersion,
                processArch: mockProcessArch,
                processPlatform: mockProcessPlatform,
            });
            expect(flag.isEnabled()).toBe(true);
        });
    });
});
