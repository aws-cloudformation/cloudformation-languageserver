import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HookCache, TtlCache } from '../../../src/hooks/HookCache';

describe('TtlCache', () => {
    let clock: number;
    const now = () => clock;

    beforeEach(() => {
        clock = 1000;
    });

    it('loads and caches a value within the TTL', async () => {
        const cache = new TtlCache<string>(100, now);
        const loader = vi.fn().mockResolvedValue('v1');

        expect(await cache.get('k', loader)).toBe('v1');
        expect(await cache.get('k', loader)).toBe('v1');
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('reloads after the TTL expires', async () => {
        const cache = new TtlCache<string>(100, now);
        const loader = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');

        expect(await cache.get('k', loader)).toBe('v1');
        clock += 101;
        expect(await cache.get('k', loader)).toBe('v2');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('reloads when the clock reaches expiresAt (exclusive upper bound)', async () => {
        const cache = new TtlCache<string>(100, now);
        const loader = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');

        expect(await cache.get('k', loader)).toBe('v1');
        clock += 99;
        expect(await cache.get('k', loader)).toBe('v1');
        expect(loader).toHaveBeenCalledTimes(1);
        clock += 1;
        expect(await cache.get('k', loader)).toBe('v2');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent loads for the same key', async () => {
        const cache = new TtlCache<string>(100, now);
        let resolveLoad!: (v: string) => void;
        const loader = vi.fn().mockReturnValue(new Promise<string>((resolve) => (resolveLoad = resolve)));

        const a = cache.get('k', loader);
        const b = cache.get('k', loader);
        resolveLoad('shared');

        expect(await a).toBe('shared');
        expect(await b).toBe('shared');
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failed load and retries next time', async () => {
        const cache = new TtlCache<string>(100, now);
        const loader = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');

        await expect(cache.get('k', loader)).rejects.toThrow('boom');
        expect(await cache.get('k', loader)).toBe('ok');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('peek returns unexpired values only', async () => {
        const cache = new TtlCache<string>(100, now);
        await cache.get('k', () => Promise.resolve('v1'));

        expect(cache.peek('k')).toBe('v1');
        clock += 101;
        expect(cache.peek('k')).toBeUndefined();
        expect(cache.peek('missing')).toBeUndefined();
    });

    it('set stores a value with a fresh TTL', () => {
        const cache = new TtlCache<string>(100, now);
        cache.set('k', 'v1');
        expect(cache.peek('k')).toBe('v1');
    });

    it('invalidate removes a single key', async () => {
        const cache = new TtlCache<string>(100, now);
        const loader = vi.fn().mockResolvedValue('v1');
        await cache.get('k', loader);
        cache.invalidate('k');
        await cache.get('k', loader);
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('invalidate during an in-flight load does not cache the resolved value', async () => {
        const cache = new TtlCache<string>(100, now);
        let resolveLoad!: (v: string) => void;
        const loader = vi.fn().mockReturnValue(new Promise<string>((resolve) => (resolveLoad = resolve)));

        const pending = cache.get('k', loader);
        cache.invalidate('k');
        resolveLoad('stale');
        await pending;

        expect(cache.peek('k')).toBeUndefined();
    });

    it('clear removes all keys', async () => {
        const cache = new TtlCache<string>(100, now);
        await cache.get('a', () => Promise.resolve('1'));
        await cache.get('b', () => Promise.resolve('2'));
        cache.clear();
        expect(cache.size).toBe(0);
    });

    it('size counts only unexpired entries', async () => {
        const cache = new TtlCache<string>(100, now);
        await cache.get('a', () => Promise.resolve('1'));
        expect(cache.size).toBe(1);
        clock += 101;
        expect(cache.size).toBe(0);
    });
});

describe('HookCache', () => {
    let clock: number;
    const now = () => clock;

    beforeEach(() => {
        clock = 1000;
    });

    it('caches hook configuration by type name', async () => {
        const cache = new HookCache(100, now);
        const loader = vi.fn().mockResolvedValue('{"cfg":1}');

        expect(await cache.getConfiguration('Private::Guard::A', loader)).toBe('{"cfg":1}');
        expect(await cache.getConfiguration('Private::Guard::A', loader)).toBe('{"cfg":1}');
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('caches rule content by S3 URI independently of config', async () => {
        const cache = new HookCache(100, now);
        const cfgLoader = vi.fn().mockResolvedValue('cfg');
        const ruleLoader = vi.fn().mockResolvedValue('rule R {}');

        await cache.getConfiguration('T', cfgLoader);
        expect(await cache.getRuleContent('s3://b/r.guard', ruleLoader)).toBe('rule R {}');
        expect(await cache.getRuleContent('s3://b/r.guard', ruleLoader)).toBe('rule R {}');
        expect(ruleLoader).toHaveBeenCalledTimes(1);
    });

    it('invalidateHook forces a config reload but keeps rules', async () => {
        const cache = new HookCache(100, now);
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
        const cache = new HookCache(100, now);
        const ruleLoader = vi.fn().mockResolvedValue('rule');
        await cache.getRuleContent('s3://b/r', ruleLoader);
        cache.invalidateRule('s3://b/r');
        await cache.getRuleContent('s3://b/r', ruleLoader);
        expect(ruleLoader).toHaveBeenCalledTimes(2);
    });

    it('invalidateAll clears both configs and rules', async () => {
        const cache = new HookCache(100, now);
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

    it('peek helpers return cached values without loading', async () => {
        const cache = new HookCache(100, now);
        await cache.getConfiguration('T', () => Promise.resolve('cfg'));
        expect(cache.peekConfiguration('T')).toBe('cfg');
        expect(cache.peekRuleContent('s3://none')).toBeUndefined();
    });
});

describe('TtlCache pruning', () => {
    let clock: number;
    const now = () => clock;

    beforeEach(() => {
        clock = 1000;
    });

    it('evicts expired entries on write so the map does not retain stale keys', () => {
        const cache = new TtlCache<string>(100, now);
        cache.set('a', 'va');
        cache.set('b', 'vb');
        expect(cache.size).toBe(2);

        clock += 200;
        cache.set('c', 'vc');

        expect(cache.size).toBe(1);
        expect(cache.peek('a')).toBeUndefined();
        expect(cache.peek('b')).toBeUndefined();
        expect(cache.peek('c')).toBe('vc');
    });
});
