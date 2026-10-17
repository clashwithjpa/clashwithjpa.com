type Page<T> = { rows: T[]; total: number };

// The admin list endpoints cap `limit` at 200.
const MAX_LIMIT = 200;

/**
 * Server-paged rows for an infinitely scrolling table. Every load bumps a
 * generation counter so a slow response from an older search/sort is dropped.
 */
export class InfiniteRows<T> {
    rows = $state<T[]>([]);
    total = $state(0);
    loading = $state(false);

    #fetchPage: (offset: number, limit: number) => Promise<Page<T> | null>;
    #pageSize: number;
    #generation = 0;

    constructor(fetchPage: (offset: number, limit: number) => Promise<Page<T> | null>, pageSize = 50) {
        this.#fetchPage = fetchPage;
        this.#pageSize = pageSize;
    }

    get hasMore() {
        return this.rows.length < this.total;
    }

    /** Drops loaded rows and fetches the first page (new search, filter or sort). */
    async reset() {
        const gen = ++this.#generation;
        this.loading = true;
        try {
            const page = await this.#fetchPage(0, this.#pageSize);
            if (gen !== this.#generation || !page) return;
            this.rows = page.rows;
            this.total = page.total;
        } finally {
            if (gen === this.#generation) this.loading = false;
        }
    }

    async loadMore() {
        if (this.loading || !this.hasMore) return;
        const gen = this.#generation;
        this.loading = true;
        try {
            const page = await this.#fetchPage(this.rows.length, this.#pageSize);
            if (gen !== this.#generation || !page) return;
            this.rows = [...this.rows, ...page.rows];
            this.total = page.total;
        } finally {
            if (gen === this.#generation) this.loading = false;
        }
    }

    /** Re-fetches every loaded row in place, so the list doesn't jump back to the top. */
    async refresh() {
        const gen = ++this.#generation;
        const count = Math.max(this.rows.length, this.#pageSize);
        this.loading = true;
        try {
            const next: T[] = [];
            let total = 0;
            for (let offset = 0; offset < count; offset += MAX_LIMIT) {
                const page = await this.#fetchPage(offset, Math.min(MAX_LIMIT, count - offset));
                if (gen !== this.#generation || !page) return;
                next.push(...page.rows);
                total = page.total;
                if (page.rows.length === 0) break;
            }
            this.rows = next;
            this.total = total;
        } finally {
            if (gen === this.#generation) this.loading = false;
        }
    }

    update(match: (row: T) => boolean, patch: (row: T) => Partial<T>) {
        this.rows = this.rows.map((r) => (match(r) ? { ...r, ...patch(r) } : r));
    }
}
