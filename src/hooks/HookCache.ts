import { LRUCache } from 'lru-cache';

const DefaultTtlMs = 60_000;
const DefaultMaxEntries = 100;

export type HookCacheOptions = {
    ttlMs?: number;
    maxEntries?: number;
    now?: () => number;
};

type LoaderContext = {
    loader: () => Promise<string>;
};

type StringCache = LRUCache<string, string, LoaderContext>;

function createCache(ttlMs: number, maxEntries: number, now: () => number): StringCache {
    return new LRUCache<string, string, LoaderContext>({
        max: Math.max(1, maxEntries),
        ttl: ttlMs,
        ttlResolution: 0,
        ignoreFetchAbort: true,
        noDeleteOnFetchRejection: false,
        perf: { now },
        fetchMethod: async (_key, _staleValue, { context }) => await context.loader(),
    });
}

async function load(cache: StringCache, key: string, loader: () => Promise<string>): Promise<string> {
    const value = await cache.fetch(key, { context: { loader } });
    if (value === undefined) {
        throw new Error(`Hook cache loader returned no value for ${key}`);
    }
    return value;
}

export class HookCache {
    private readonly configs: StringCache;
    private readonly rules: StringCache;

    constructor({ ttlMs = DefaultTtlMs, maxEntries = DefaultMaxEntries, now = Date.now }: HookCacheOptions = {}) {
        this.configs = createCache(ttlMs, maxEntries, now);
        this.rules = createCache(ttlMs, maxEntries, now);
    }

    async getConfiguration(typeName: string, loader: () => Promise<string>): Promise<string> {
        return await load(this.configs, typeName, loader);
    }

    async getRuleContent(s3Uri: string, loader: () => Promise<string>): Promise<string> {
        return await load(this.rules, s3Uri, loader);
    }

    invalidateAll(): void {
        this.configs.clear();
        this.rules.clear();
    }
}
