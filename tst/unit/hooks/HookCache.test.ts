import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HookCache } from '../../../src/hooks/HookCache';

describe('HookCache', () => {
    let clock: number;
    const now = () => clock;

    beforeEach(() => {
        clock = 1000;
    });

    it('loads and caches a value within the TTL', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const loader = vi.fn().mockResolvedValue('{"cfg":1}');

        expect(await cache.getConfiguration('T', loader)).toBe('{"cfg":1}');
        expect(await cache.getConfiguration('T', loader)).toBe('{"cfg":1}');
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('reloads after the TTL expires', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const loader = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');

        expect(await cache.getConfiguration('T', loader)).toBe('v1');
        clock += 101;
        expect(await cache.getConfiguration('T', loader)).toBe('v2');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('reloads when the clock reaches expiresAt (exclusive upper bound)', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const loader = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');

        expect(await cache.getConfiguration('T', loader)).toBe('v1');
        clock += 99;
        expect(await cache.getConfiguration('T', loader)).toBe('v1');
        expect(loader).toHaveBeenCalledTimes(1);
        clock += 1;
        expect(await cache.getConfiguration('T', loader)).toBe('v2');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent loads for the same key', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        let resolveLoad!: (v: string) => void;
        const loader = vi.fn().mockReturnValue(new Promise<string>((resolve) => (resolveLoad = resolve)));

        const a = cache.getConfiguration('T', loader);
        const b = cache.getConfiguration('T', loader);
        resolveLoad('shared');

        expect(await a).toBe('shared');
        expect(await b).toBe('shared');
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failed load and retries next time', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const loader = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');

        await expect(cache.getConfiguration('T', loader)).rejects.toThrow('boom');
        expect(await cache.getConfiguration('T', loader)).toBe('ok');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('caches rule content by S3 URI independently of config', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const cfgLoader = vi.fn().mockResolvedValue('cfg');
        const ruleLoader = vi.fn().mockResolvedValue('rule R {}');

        await cache.getConfiguration('T', cfgLoader);
        expect(await cache.getRuleContent('s3://b/r.guard', ruleLoader)).toBe('rule R {}');
        expect(await cache.getRuleContent('s3://b/r.guard', ruleLoader)).toBe('rule R {}');
        expect(ruleLoader).toHaveBeenCalledTimes(1);
    });

    it('peek helpers return unexpired values only, without loading', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        await cache.getConfiguration('T', () => Promise.resolve('cfg'));

        expect(cache.peekConfiguration('T')).toBe('cfg');
        expect(cache.peekRuleContent('s3://none')).toBeUndefined();
        clock += 101;
        expect(cache.peekConfiguration('T')).toBeUndefined();
    });

    it('invalidateHook forces a config reload but keeps rules', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const cfgLoader = vi.fn().mockResolvedValue('cfg');
        const ruleLoader = vi.fn().mockResolvedValue('rule');

        await cache.getConfiguration('T', cfgLoader);
        await cache.getRuleContent('s3://b/r', ruleLoader);
        cache.invalidateHook('T');
        await cache.getConfiguration('T', cfgLoader);
        await cache.getRuleContent('s3://b/r', ruleLoader);

        expect(cfgLoader).toHaveBeenCalledTimes(2);
        expect(ruleLoader).toHaveBeenCalledTimes(1);
    });

    it('invalidateRule forces a rule reload', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        const ruleLoader = vi.fn().mockResolvedValue('rule');

        await cache.getRuleContent('s3://b/r', ruleLoader);
        cache.invalidateRule('s3://b/r');
        await cache.getRuleContent('s3://b/r', ruleLoader);

        expect(ruleLoader).toHaveBeenCalledTimes(2);
    });

    it('invalidateAll clears both configs and rules', async () => {
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

    it('invalidation during an in-flight load does not cache the resolved value', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });
        let resolveLoad!: (v: string) => void;
        const loader = vi.fn().mockReturnValue(new Promise<string>((resolve) => (resolveLoad = resolve)));

        const pending = cache.getConfiguration('T', loader);
        cache.invalidateHook('T');
        resolveLoad('stale');
        await pending;

        expect(cache.peekConfiguration('T')).toBeUndefined();
    });

    it('reports sizes counting only unexpired entries', async () => {
        const cache = new HookCache({ ttlMs: 100, maxEntries: 10, now });

        await cache.getConfiguration('T', () => Promise.resolve('cfg'));
        await cache.getRuleContent('s3://b/r', () => Promise.resolve('rule'));
        expect(cache.sizes).toEqual({ configs: 1, rules: 1 });

        clock += 101;
        expect(cache.sizes).toEqual({ configs: 0, rules: 0 });
    });
});

describe('HookCache bounds', () => {
    let clock: number;
    const now = () => clock;

    beforeEach(() => {
        clock = 1000;
    });

    it('evicts the oldest entry once the cap is reached', async () => {
        const cache = new HookCache({ ttlMs: 1000, maxEntries: 3, now });

        for (const key of ['a', 'b', 'c']) {
            await cache.getConfiguration(key, () => Promise.resolve(key));
        }
        expect(cache.sizes.configs).toBe(3);

        await cache.getConfiguration('d', () => Promise.resolve('d'));

        expect(cache.sizes.configs).toBe(3);
        expect(cache.peekConfiguration('a')).toBeUndefined();
        expect(cache.peekConfiguration('b')).toBe('b');
        expect(cache.peekConfiguration('d')).toBe('d');
    });

    it('re-loading an invalidated key stays within the cap', async () => {
        const cache = new HookCache({ ttlMs: 1000, maxEntries: 3, now });

        for (const key of ['a', 'b', 'c']) {
            await cache.getConfiguration(key, () => Promise.resolve(key));
        }
        cache.invalidateHook('a');
        await cache.getConfiguration('a', () => Promise.resolve('a2'));

        expect(cache.sizes.configs).toBe(3);
        expect(cache.peekConfiguration('a')).toBe('a2');
        expect(cache.peekConfiguration('b')).toBe('b');
        expect(cache.peekConfiguration('c')).toBe('c');
    });

    it('bounds configs and rules independently', async () => {
        const cache = new HookCache({ ttlMs: 1000, maxEntries: 2, now });

        for (const key of ['a', 'b', 'c']) {
            await cache.getConfiguration(key, () => Promise.resolve(key));
            await cache.getRuleContent(`s3://b/${key}`, () => Promise.resolve(key));
        }

        expect(cache.sizes).toEqual({ configs: 2, rules: 2 });
    });
});
