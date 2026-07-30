interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export class TtlCache<T> {
    private readonly entries = new Map<string, CacheEntry<T>>();
    private readonly inflight = new Map<string, Promise<T>>();

    constructor(
        private readonly ttlMs: number,
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
                    this.prune();
                    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
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

    set(key: string, value: T): void {
        this.prune();
        this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    }

    invalidate(key: string): void {
        this.entries.delete(key);
        this.inflight.delete(key);
    }

    clear(): void {
        this.entries.clear();
        this.inflight.clear();
    }

    private prune(): void {
        const now = this.now();
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt <= now) {
                this.entries.delete(key);
            }
        }
    }

    get size(): number {
        let count = 0;
        for (const entry of this.entries.values()) {
            if (entry.expiresAt > this.now()) {
                count++;
            }
        }
        return count;
    }
}

const DEFAULT_TTL_MS = 60_000;

export class HookCache {
    private readonly configs: TtlCache<string>;
    private readonly rules: TtlCache<string>;

    constructor(ttlMs: number = DEFAULT_TTL_MS, now: () => number = Date.now) {
        this.configs = new TtlCache<string>(ttlMs, now);
        this.rules = new TtlCache<string>(ttlMs, now);
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
}
