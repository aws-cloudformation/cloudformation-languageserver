import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HookCache } from '../../../src/hooks/HookCache';

describe('HookCache', () => {
    let clock: number;
    const now = () => clock;

    beforeEach(() => {
        clock = 1000;
    });

    it('caches configurations and rules under separate namespaces', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const cfgLoader = vi.fn().mockResolvedValue('cfg');
        const ruleLoader = vi.fn().mockResolvedValue('rule R {}');

        expect(await cache.getConfiguration('T', cfgLoader)).toBe('cfg');
        expect(await cache.getRuleContent('T', ruleLoader)).toBe('rule R {}');
        expect(await cache.getConfiguration('T', cfgLoader)).toBe('cfg');
        expect(await cache.getRuleContent('T', ruleLoader)).toBe('rule R {}');

        expect(cfgLoader).toHaveBeenCalledTimes(1);
        expect(ruleLoader).toHaveBeenCalledTimes(1);
    });

    it('invalidateAll clears both namespaces', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const cfgLoader = vi.fn().mockResolvedValue('cfg');
        const ruleLoader = vi.fn().mockResolvedValue('rule');

        await cache.getConfiguration('T', cfgLoader);
        await cache.getRuleContent('s3://b/r', ruleLoader);
        cache.invalidateAll();
        await cache.getConfiguration('T', cfgLoader);
        await cache.getRuleContent('s3://b/r', ruleLoader);

        expect(cfgLoader).toHaveBeenCalledTimes(2);
        expect(ruleLoader).toHaveBeenCalledTimes(2);
    });

    it('applies the configured ttl to both namespaces', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const cfgLoader = vi.fn().mockResolvedValue('cfg');
        const ruleLoader = vi.fn().mockResolvedValue('rule');

        await cache.getConfiguration('T', cfgLoader);
        await cache.getRuleContent('s3://b/r', ruleLoader);
        clock += 101;
        await cache.getConfiguration('T', cfgLoader);
        await cache.getRuleContent('s3://b/r', ruleLoader);

        expect(cfgLoader).toHaveBeenCalledTimes(2);
        expect(ruleLoader).toHaveBeenCalledTimes(2);
    });

    it('bounds each namespace independently rather than sharing one budget', async () => {
        const cache = new HookCache({ ttlMs: 1000, maxEntries: 2, now });
        const loaders = new Map(['a', 'b', 'c'].map((key) => [key, vi.fn().mockResolvedValue(key)]));

        for (const [key, loader] of loaders) {
            await cache.getConfiguration(key, loader);
            await cache.getRuleContent(key, loader);
        }

        await cache.getConfiguration('a', loaders.get('a')!);
        await cache.getConfiguration('c', loaders.get('c')!);

        expect(loaders.get('a')).toHaveBeenCalledTimes(3);
        expect(loaders.get('c')).toHaveBeenCalledTimes(2);
    });

    it('does not cache a rejected load', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const loader = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');

        await expect(cache.getConfiguration('T', loader)).rejects.toThrow('boom');
        expect(await cache.getConfiguration('T', loader)).toBe('ok');
        expect(loader).toHaveBeenCalledTimes(2);
    });
});
