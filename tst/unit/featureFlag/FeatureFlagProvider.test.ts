import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeatureFlagConfigSchema } from '../../../src/featureFlag/FeatureFlagBuilder';
import { featureFlagLocalFile, FeatureFlagProvider } from '../../../src/featureFlag/FeatureFlagProvider';
import { ScopedTelemetry } from '../../../src/telemetry/ScopedTelemetry';
import { LocalFile } from '../../../src/utils/LocalFile';

const UPDATED_CONFIG = {
    version: 1,
    description: 'Updated feature flags',
    features: { Constants: { enabled: true } },
};

function httpError(status: number): Error {
    return Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } });
}

function codedError(code: string, message: string): Error {
    return Object.assign(new Error(message), { code });
}

function emittedMetricNames(spy: ReturnType<typeof vi.spyOn>): unknown[] {
    return spy.mock.calls.map((call: unknown[]) => call[0]);
}

const REMOTE_FETCH_FAILURES: ReadonlyArray<{ name: string; error: Error }> = [
    { name: 'HTTP 401 Unauthorized', error: httpError(401) },
    { name: 'HTTP 403 Forbidden', error: httpError(403) },
    { name: 'HTTP 502 Bad Gateway', error: httpError(502) },
    { name: 'HTTP 503 Service Unavailable', error: httpError(503) },
    {
        name: 'proxy 407 authentication required',
        error: new Error('Request failed with status code 407'),
    },
    {
        name: 'proxy bad port',
        error: codedError('ERR_SOCKET_BAD_PORT', 'Port should be >= 0 and < 65536'),
    },
    {
        name: 'network connection refused',
        error: codedError('ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:443'),
    },
    {
        name: 'TLS self-signed certificate',
        error: new Error('self signed certificate in certificate chain'),
    },
    { name: 'filesystem ENOENT', error: codedError('ENOENT', 'ENOENT: no such file') },
    { name: 'filesystem EBADF', error: codedError('EBADF', 'EBADF: bad file descriptor') },
    { name: 'filesystem EACCES', error: codedError('EACCES', 'EACCES: permission denied') },
    { name: 'proxy/TLS EPROTO', error: codedError('EPROTO', 'write EPROTO') },
    { name: 'unknown fetch failure', error: new Error('unexpected feature flag fetch failure') },
];

describe('FeatureFlagProvider', () => {
    const alphaConfigPath = join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'alpha.json');

    it('can parse feature flags', () => {
        for (const path of [
            join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'alpha.json'),
            join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'beta.json'),
            join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'prod.json'),
        ]) {
            const file = readFileSync(path, 'utf8');
            expect(file).toBeDefined();
            expect(FeatureFlagConfigSchema.parse(JSON.parse(file))).toBeDefined();
        }
    });

    it('handles missing config file gracefully', () => {
        const provider = new FeatureFlagProvider(
            () => Promise.resolve({ version: 1, description: 'test', features: {} }),
            '/nonexistent/path/config.json',
        );

        expect(provider).toBeDefined();
        provider.close();
    });

    it('rejects invalid remote config during refresh', async () => {
        const provider = new FeatureFlagProvider(() => Promise.resolve('invalid string response'), alphaConfigPath);

        // Trigger refresh manually
        await (provider as any).refresh();

        // Should still have valid config from initial load
        expect(provider.get('Constants')).toBeDefined();
        provider.close();
    });

    describe('get', () => {
        let provider: FeatureFlagProvider;

        afterEach(() => {
            provider?.close();
        });

        it('returns feature flag by key', () => {
            provider = new FeatureFlagProvider(() => Promise.resolve({}), alphaConfigPath);

            const flag = provider.get('Constants');
            expect(flag).toBeDefined();
            expect(typeof flag.isEnabled()).toBe('boolean');
        });
    });

    describe('getTargeted', () => {
        let provider: FeatureFlagProvider;

        afterEach(() => {
            provider.close();
        });

        it('returns targeted feature flag by key', () => {
            provider = new FeatureFlagProvider(() => Promise.resolve({}), alphaConfigPath);

            const flag = provider.getTargeted('EnhancedDryRun');
            expect(flag).toBeDefined();
        });
    });

    describe('gauge registration', () => {
        let provider: FeatureFlagProvider;
        let registerGaugeProviderSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            registerGaugeProviderSpy = vi.spyOn(ScopedTelemetry.prototype, 'registerGaugeProvider');
        });

        afterEach(() => {
            provider?.close();
            vi.restoreAllMocks();
        });

        it('registers gauges for each feature flag', () => {
            provider = new FeatureFlagProvider(
                () => Promise.resolve({ features: { Constants: { enabled: true } } }),
                alphaConfigPath,
            );

            expect(registerGaugeProviderSpy).toHaveBeenCalledWith(
                'featureFlag.Constants',
                expect.any(Function),
                expect.objectContaining({ description: 'State of Constants feature flag' }),
            );
        });

        it('gauge provider reflects current flag state', () => {
            provider = new FeatureFlagProvider(
                () => Promise.resolve({ features: { Constants: { enabled: false } } }),
                alphaConfigPath,
            );

            const gaugeProvider = registerGaugeProviderSpy.mock.calls[0][1] as () => number;
            // Alpha config has Constants disabled
            expect(gaugeProvider()).toBe(0);
        });
    });

    describe('client network error handling', () => {
        let provider: FeatureFlagProvider;
        let errorSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            errorSpy = vi.spyOn(ScopedTelemetry.prototype, 'error');
        });

        afterEach(() => {
            provider?.close();
            vi.restoreAllMocks();
        });

        it('handles client network errors gracefully without throwing', async () => {
            const error = new Error('self signed certificate in certificate chain');
            provider = new FeatureFlagProvider(
                () => Promise.reject(error),
                join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'alpha.json'),
            );

            await expect((provider as any).refresh()).resolves.toBeUndefined();
            expect(errorSpy).toHaveBeenCalledWith('getFeatureFlags.clientNetworkError', error);
        });

        it('rethrows client network errors from getFeatureFlags after recording telemetry', async () => {
            const error = new Error('self signed certificate in certificate chain');
            provider = new FeatureFlagProvider(
                () => Promise.reject(error),
                join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'alpha.json'),
            );

            await expect((provider as any).getFeatureFlags('alpha')).rejects.toBe(error);
            expect(errorSpy).toHaveBeenCalledWith('getFeatureFlags.clientNetworkError', error);
        });

        it('rethrows non-client network errors', async () => {
            provider = new FeatureFlagProvider(
                () => Promise.reject(new Error('Request failed with status code 500')),
                join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'alpha.json'),
            );

            await expect((provider as any).getFeatureFlags('alpha')).rejects.toThrow('status code 500');
        });
    });

    describe('remote feature-flag fetch failures', () => {
        let provider: FeatureFlagProvider;
        let errorSpy: ReturnType<typeof vi.spyOn>;
        let countSpy: ReturnType<typeof vi.spyOn>;
        let writeSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            errorSpy = vi.spyOn(ScopedTelemetry.prototype, 'error');
            countSpy = vi.spyOn(ScopedTelemetry.prototype, 'count');
            writeSpy = vi.spyOn(LocalFile.prototype, 'write').mockResolvedValue(true);
        });

        afterEach(() => {
            provider?.close();
            vi.restoreAllMocks();
        });

        it.each(REMOTE_FETCH_FAILURES)('retains config and skips persistence for $name', async ({ error }) => {
            provider = new FeatureFlagProvider(() => Promise.reject(error), alphaConfigPath);
            const configBeforeRefresh = (provider as any).config;

            await expect((provider as any).refresh()).resolves.toBeUndefined();

            expect(countSpy).toHaveBeenCalledWith('refresh.skipped', 1);
            expect(writeSpy).not.toHaveBeenCalled();
            expect(emittedMetricNames(countSpy)).not.toContain('refresh.local.update');
            expect((provider as any).config).toBe(configBeforeRefresh);
        });

        it('emits the existing client-network metric for network failures handled by refresh', async () => {
            const clientError = codedError('ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:443');
            provider = new FeatureFlagProvider(() => Promise.reject(clientError), alphaConfigPath);

            await expect((provider as any).refresh()).resolves.toBeUndefined();

            expect(errorSpy).toHaveBeenCalledWith('getFeatureFlags.clientNetworkError', clientError);
        });

        it('does not emit the client-network metric for non-network failures handled by refresh', async () => {
            const serviceError = httpError(503);
            provider = new FeatureFlagProvider(() => Promise.reject(serviceError), alphaConfigPath);

            await expect((provider as any).refresh()).resolves.toBeUndefined();

            expect(emittedMetricNames(errorSpy)).not.toContain('getFeatureFlags.clientNetworkError');
        });

        it('keeps a parse failure distinct from a handled remote fetch error', async () => {
            provider = new FeatureFlagProvider(() => Promise.resolve('not a feature flag config'), alphaConfigPath);

            await expect((provider as any).refresh()).resolves.toBeUndefined();

            expect(countSpy).toHaveBeenCalledWith('refresh.parse.error', 1);
            expect(emittedMetricNames(countSpy)).not.toContain('refresh.local.update');
            expect(writeSpy).not.toHaveBeenCalled();
        });

        it('keeps a local write failure distinct from a handled remote fetch error', async () => {
            const writeError = codedError('EACCES', 'EACCES: permission denied, rename');
            writeSpy.mockRejectedValue(writeError);
            provider = new FeatureFlagProvider(() => Promise.resolve(UPDATED_CONFIG), alphaConfigPath);

            await expect((provider as any).refresh()).rejects.toBe(writeError);

            expect(emittedMetricNames(countSpy)).not.toContain('refresh.local.update');
            expect((provider as any).config).toEqual(UPDATED_CONFIG);
        });

        it('updates and persists config when the remote fetch succeeds', async () => {
            provider = new FeatureFlagProvider(() => Promise.resolve(UPDATED_CONFIG), alphaConfigPath);

            await expect((provider as any).refresh()).resolves.toBeUndefined();

            expect(writeSpy).toHaveBeenCalledWith(JSON.stringify(UPDATED_CONFIG, undefined, 2));
            expect(countSpy).toHaveBeenCalledWith('refresh.local.update', 1);
            expect((provider as any).config).toEqual(UPDATED_CONFIG);
        });
    });

    describe('valid remote config persistence', () => {
        it('writes a valid config to disk and reloads it as the local config', async () => {
            const tempDir = mkdtempSync(join(tmpdir(), 'cfn-lsp-feature-flags-'));
            const configPath = join(tempDir, 'config.json');
            const initialConfig = {
                version: 1,
                description: 'Initial local feature flags',
                features: { Constants: { enabled: false } },
            };
            writeFileSync(configPath, JSON.stringify(initialConfig, undefined, 2));

            const provider = new FeatureFlagProvider(() => Promise.resolve(UPDATED_CONFIG), configPath);
            let reloadedProvider: FeatureFlagProvider | undefined;

            try {
                await expect((provider as any).refresh()).resolves.toBeUndefined();

                expect(readFileSync(configPath, 'utf8')).toBe(JSON.stringify(UPDATED_CONFIG, undefined, 2));

                reloadedProvider = new FeatureFlagProvider(() => Promise.resolve(UPDATED_CONFIG), configPath);
                expect((reloadedProvider as any).config).toEqual(UPDATED_CONFIG);
                expect(reloadedProvider.get('Constants').isEnabled()).toBe(true);
            } finally {
                provider.close();
                reloadedProvider?.close();
                rmSync(tempDir, { recursive: true, force: true });
            }
        });
    });

    describe('invalid remote config safety', () => {
        const invalidRemoteConfigs: ReadonlyArray<{ name: string; config: unknown }> = [
            { name: 'a string response', config: 'invalid string response' },
            { name: 'a null response', config: null },
            {
                name: 'a config without version',
                config: { description: 'missing version', features: {} },
            },
            {
                name: 'a config without description',
                config: { version: 1, features: {} },
            },
            {
                name: 'a config without features',
                config: { version: 1, description: 'missing features' },
            },
            {
                name: 'a feature with a non-boolean enabled value',
                config: {
                    version: 1,
                    description: 'invalid enabled value',
                    features: { Constants: { enabled: 'true' } },
                },
            },
            {
                name: 'a feature with an invalid region list',
                config: {
                    version: 1,
                    description: 'invalid region list',
                    features: { EnhancedDryRun: { enabled: true, allowlistedRegions: ['us-east-1', 42] } },
                },
            },
        ];

        let provider: FeatureFlagProvider;
        let countSpy: ReturnType<typeof vi.spyOn>;
        let writeSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            countSpy = vi.spyOn(ScopedTelemetry.prototype, 'count');
            writeSpy = vi.spyOn(LocalFile.prototype, 'write').mockResolvedValue(true);
        });

        afterEach(() => {
            provider?.close();
            vi.restoreAllMocks();
        });

        it.each(invalidRemoteConfigs)('never writes $name and continues using the local config', async ({ config }) => {
            expect(FeatureFlagConfigSchema.safeParse(config).success).toBe(false);

            provider = new FeatureFlagProvider(() => Promise.resolve(config), alphaConfigPath);
            const configBeforeRefresh = (provider as any).config;

            expect(provider.get('Constants').isEnabled()).toBe(false);
            expect(provider.get('FileDb').isEnabled()).toBe(true);
            expect(provider.getTargeted<string>('EnhancedDryRun').isEnabled('test-region')).toBe(true);

            await expect((provider as any).refresh()).resolves.toBeUndefined();

            expect(countSpy).toHaveBeenCalledWith('refresh.parse.error', 1);
            expect(emittedMetricNames(countSpy)).not.toContain('refresh.local.update');
            expect(writeSpy).not.toHaveBeenCalled();
            expect((provider as any).config).toBe(configBeforeRefresh);
            expect(provider.get('Constants').isEnabled()).toBe(false);
            expect(provider.get('FileDb').isEnabled()).toBe(true);
            expect(provider.getTargeted<string>('EnhancedDryRun').isEnabled('test-region')).toBe(true);
        });

        it('keeps empty defaults usable when the local config is missing and the remote config is invalid', async () => {
            provider = new FeatureFlagProvider(
                () => Promise.resolve('invalid string response'),
                '/nonexistent/feature-flags/config.json',
            );
            const configBeforeRefresh = (provider as any).config;

            expect(configBeforeRefresh).toEqual({
                version: 1,
                description: 'Default empty config',
                features: {},
            });
            expect(provider.get('Constants').isEnabled()).toBe(false);
            expect(provider.get('FileDb').isEnabled()).toBe(false);
            expect(provider.getTargeted<string>('EnhancedDryRun').isEnabled('test-region')).toBe(false);

            await expect((provider as any).refresh()).resolves.toBeUndefined();

            expect(countSpy).toHaveBeenCalledWith('refresh.parse.error', 1);
            expect(emittedMetricNames(countSpy)).not.toContain('refresh.local.update');
            expect(writeSpy).not.toHaveBeenCalled();
            expect((provider as any).config).toBe(configBeforeRefresh);
            expect(provider.get('Constants').isEnabled()).toBe(false);
            expect(provider.get('FileDb').isEnabled()).toBe(false);
            expect(provider.getTargeted<string>('EnhancedDryRun').isEnabled('test-region')).toBe(false);
        });
    });

    describe('featureFlagLocalFile', () => {
        const projectRoot = join(__dirname, '..', '..', '..');

        it('should resolve to an existing file with project root as baseDir', () => {
            const path = featureFlagLocalFile(projectRoot);
            expect(existsSync(path)).toBe(true);
        });

        it('should produce a parseable feature flag config', () => {
            const path = featureFlagLocalFile(projectRoot);
            const content = JSON.parse(readFileSync(path, 'utf8'));
            expect(FeatureFlagConfigSchema.parse(content)).toBeDefined();
        });

        it('should build path with assets/featureFlag/<env>.json structure', () => {
            const path = featureFlagLocalFile('/some/base');
            expect(path).toContain(join('some', 'base', 'assets', 'featureFlag'));
            expect(path.endsWith('.json')).toBe(true);
        });

        it('should default baseDir to __dirname of the source module', () => {
            const defaultPath = featureFlagLocalFile();
            expect(defaultPath).toContain(join('assets', 'featureFlag'));
            expect(defaultPath).toMatch(/\.json$/);
        });
    });
});
