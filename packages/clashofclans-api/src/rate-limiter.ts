/**
 * Token-bucket rate limiter for outgoing CoC API requests.
 *
 * Maintains a bucket of tokens that refill at a constant rate.
 * When a consumer calls `acquire()`, it either resolves immediately
 * (if a token is available) or queues the request until a token frees up.
 */
export class RateLimiter {
    private tokens: number;
    private maxTokens: number;
    private refillRate: number; // tokens per second
    private lastRefill: number;
    private queue: (() => void)[] = [];
    private drainTimer: ReturnType<typeof setInterval> | null = null;

    constructor(options?: { maxTokens?: number; refillRate?: number }) {
        this.maxTokens = options?.maxTokens ?? 30;
        this.refillRate = options?.refillRate ?? 30;
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
    }

    /**
     * Refill tokens based on elapsed time since last refill.
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        const newTokens = elapsed * this.refillRate;
        this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
        this.lastRefill = now;
    }

    /**
     * Try to drain the queue by granting tokens to waiting requests.
     */
    private drain(): void {
        this.refill();
        while (this.queue.length > 0 && this.tokens >= 1) {
            this.tokens -= 1;
            const resolve = this.queue.shift()!;
            resolve();
        }

        // Stop the drain timer if the queue is empty
        if (this.queue.length === 0 && this.drainTimer !== null) {
            clearInterval(this.drainTimer);
            this.drainTimer = null;
        }
    }

    /**
     * Acquire a token. Resolves immediately if one is available,
     * otherwise queues the request until a token is refilled.
     */
    acquire(): Promise<void> {
        this.refill();

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            this.queue.push(resolve);

            // Start the drain timer if not already running
            if (this.drainTimer === null) {
                const intervalMs = Math.ceil(1000 / this.refillRate);
                this.drainTimer = setInterval(() => this.drain(), intervalMs);
            }
        });
    }

    /**
     * Clean up timers. Call this when shutting down.
     */
    destroy(): void {
        if (this.drainTimer !== null) {
            clearInterval(this.drainTimer);
            this.drainTimer = null;
        }
        // Reject any pending acquires
        this.queue = [];
    }
}
