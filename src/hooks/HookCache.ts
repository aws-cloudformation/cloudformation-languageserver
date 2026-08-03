interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class TtlCache<T> {
    private readonly entries = new Map<string, CacheEntry<T>>();
    private readonly inflight = new Map<string, Promise<T>>();

    constructor(
        private readonly ttlMs: number,
        private readonly maxEntries: number,
        private readonly now: () => number = Date.now,
    ) {}

    async get(key: string, loader: () => Promise<T>): Promise<T> {
        const cached = this.entries.get(key);
        if (cached) {
            if (cached.expiresAt > this.now()) {
                return cached.value;
            }
            this.entries.delete(key);
        }

        const existing = this.inflight.get(key);
        if (existing) {
            return await existing;
        }

        const load = loader()
            .then((value) => {
                if (this.inflight.get(key) === load) {
                    this.store(key, value);
                }
                return value;
            })
            .finally(() => {
                if (this.inflight.get(key) === load) {
                    this.inflight.delete(key);
                }
            });

        this.inflight.set(key, load);
        return await load;
    }

    peek(key: string): T | undefined {
        const cached = this.entries.get(key);
        if (cached) {
            if (cached.expiresAt > this.now()) {
                return cached.value;
            }
            this.entries.delete(key);
        }
        return undefined;
    }

    invalidate(key: string): void {
        this.entries.delete(key);
        this.inflight.delete(key);
    }

    clear(): void {
        this.entries.clear();
        this.inflight.clear();
    }

    get size(): number {
        this.prune();
        return this.entries.size;
    }

    private store(key: string, value: T): void {
        this.prune();
        while (this.entries.size >= this.maxEntries) {
            const oldest = this.entries.keys().next();
            if (oldest.done) {
                break;
            }
            this.entries.delete(oldest.value);
        }
        this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    }

    private prune(): void {
        const now = this.now();
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt <= now) {
                this.entries.delete(key);
            }
        }
    }
}

const DefaultTtlMs = 60_000;
const DefaultMaxEntries = 100;

export type HookCacheOptions = {
    ttlMs?: number;
    maxEntries?: number;
    now?: () => number;
};

export type HookCacheSizes = {
    configs: number;
    rules: number;
};

export class HookCache {
    private readonly configs: TtlCache<string>;
    private readonly rules: TtlCache<string>;

    constructor({ ttlMs = DefaultTtlMs, maxEntries = DefaultMaxEntries, now = Date.now }: HookCacheOptions = {}) {
        const cap = Math.max(1, maxEntries);
        this.configs = new TtlCache<string>(ttlMs, cap, now);
        this.rules = new TtlCache<string>(ttlMs, cap, now);
    }

    async getConfiguration(typeName: string, loader: () => Promise<string>): Promise<string> {
        return await this.configs.get(typeName, loader);
    }

    async getRuleContent(s3Uri: string, loader: () => Promise<string>): Promise<string> {
        return await this.rules.get(s3Uri, loader);
    }

    peekConfiguration(typeName: string): string | undefined {
        return this.configs.peek(typeName);
    }

    peekRuleContent(s3Uri: string): string | undefined {
        return this.rules.peek(s3Uri);
    }

    invalidateHook(typeName: string): void {
        this.configs.invalidate(typeName);
    }

    invalidateRule(s3Uri: string): void {
        this.rules.invalidate(s3Uri);
    }

    invalidateAll(): void {
        this.configs.clear();
        this.rules.clear();
    }

    get sizes(): HookCacheSizes {
        return { configs: this.configs.size, rules: this.rules.size };
    }
}
