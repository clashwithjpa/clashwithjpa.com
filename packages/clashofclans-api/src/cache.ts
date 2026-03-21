import type Redis from "ioredis";

/**
 * Redis cache layer for CoC API GET responses.
 * Cache keys are built from the full request path + query parameters.
 */
export class RedisCache {
    private redis: Redis;
    private prefix: string;

    constructor(redis: Redis, prefix = "coc") {
        this.redis = redis;
        this.prefix = prefix;
    }

    /**
     * Build a namespaced cache key from a path and optional query params.
     *
     * @example
     * buildKey("/v1/clans/%232PP", { limit: "10" })
     * // => "coc:/v1/clans/%232PP?limit=10"
     */
    private buildKey(path: string, query?: Record<string, string>): string {
        let key = `${this.prefix}:${path}`;
        if (query && Object.keys(query).length > 0) {
            const sorted = Object.entries(query).sort(([a], [b]) => a.localeCompare(b));
            const qs = sorted.map(([k, v]) => `${k}=${v}`).join("&");
            key += `?${qs}`;
        }
        return key;
    }

    /**
     * Get a cached value by path + query.
     * Returns `null` on cache miss.
     */
    async get<T>(path: string, query?: Record<string, string>): Promise<T | null> {
        const key = this.buildKey(path, query);
        const raw = await this.redis.get(key);
        if (raw === null) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    /**
     * Set a cached value with a TTL (in seconds).
     */
    async set(path: string, data: unknown, ttlSeconds: number, query?: Record<string, string>): Promise<void> {
        const key = this.buildKey(path, query);
        await this.redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    }

    /**
     * Delete a specific cache entry.
     */
    async del(path: string, query?: Record<string, string>): Promise<void> {
        const key = this.buildKey(path, query);
        await this.redis.del(key);
    }

    /**
     * Flush all cache entries under this prefix.
     */
    async flush(): Promise<void> {
        const keys = await this.redis.keys(`${this.prefix}:*`);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
}
