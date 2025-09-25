import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

describe('DefaultSettings', () => {
    const originalEnv = process.env.AWS_ENV;

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.resetModules();
    });

    afterAll(() => {
        if (originalEnv === undefined) {
            delete process.env.AWS_ENV;
        } else {
            process.env.AWS_ENV = originalEnv;
        }
    });

    it('should have telemetry enabled when AWS_ENV is alpha', async () => {
        process.env.AWS_ENV = 'alpha';

        const { DefaultSettings } = await import('../../../src/settings/Settings');

        expect(DefaultSettings.telemetry.enabled).toBe(true);
    });

    it('should have telemetry enabled when AWS_ENV is beta', async () => {
        process.env.AWS_ENV = 'beta';

        const { DefaultSettings } = await import('../../../src/settings/Settings');

        expect(DefaultSettings.telemetry.enabled).toBe(true);
    });

    it('should have telemetry disabled when AWS_ENV is prod', async () => {
        process.env.AWS_ENV = 'prod';

        const { DefaultSettings } = await import('../../../src/settings/Settings');

        expect(DefaultSettings.telemetry.enabled).toBe(false);
    });

    it('should have telemetry disabled when AWS_ENV is undefined', async () => {
        delete process.env.AWS_ENV;

        const { DefaultSettings } = await import('../../../src/settings/Settings');

        expect(DefaultSettings.telemetry.enabled).toBe(false);
    });

    it('should have telemetry disabled when AWS_ENV is unknown value', async () => {
        process.env.AWS_ENV = 'unknown';

        const { DefaultSettings } = await import('../../../src/settings/Settings');

        expect(DefaultSettings.telemetry.enabled).toBe(false);
    });

    it('should have correct default values regardless of environment', async () => {
        process.env.AWS_ENV = 'alpha';

        const { DefaultSettings } = await import('../../../src/settings/Settings');
        const { AwsRegion } = await import('../../../src/utils/Region');

        expect(DefaultSettings.profile.region).toBe(AwsRegion.US_EAST_1);
        expect(DefaultSettings.profile.profile).toBe('default');
        expect(DefaultSettings.hover.enabled).toBe(true);
        expect(DefaultSettings.completion.enabled).toBe(true);
        expect(DefaultSettings.diagnostics.cfnLint.enabled).toBe(true);
        expect(DefaultSettings.diagnostics.cfnLint.delayMs).toBe(3000);
        expect(DefaultSettings.diagnostics.cfnLint.lintOnChange).toBe(true);
        expect(DefaultSettings.diagnostics.cfnGuard.enabled).toBe(true);
        expect(DefaultSettings.diagnostics.cfnGuard.delayMs).toBe(1000);
        expect(DefaultSettings.diagnostics.cfnGuard.validateOnChange).toBe(true);
        expect(DefaultSettings.diagnostics.cfnGuard.enabledRulePacks).toEqual(['cis-aws-benchmark-level-1']);
        expect(DefaultSettings.diagnostics.cfnGuard.timeout).toBe(30000);
        expect(DefaultSettings.telemetry.logLevel).toBe('info');
    });

    it('should have correct CfnLint initialization settings with totalTimeoutMs', async () => {
        const { DefaultSettings } = await import('../../../src/settings/Settings');

        const initSettings = DefaultSettings.diagnostics.cfnLint.initialization;

        expect(initSettings.maxRetries).toBe(3);
        expect(initSettings.initialDelayMs).toBe(1000);
        expect(initSettings.maxDelayMs).toBe(30_000);
        expect(initSettings.backoffMultiplier).toBe(2);
        expect(initSettings.totalTimeoutMs).toBe(120_000); // 2 minutes
    });
});
