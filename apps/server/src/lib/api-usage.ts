import { db } from "@/lib/db";
import { apikey, apiKeyUsageTable } from "@/lib/db/schema";
import type { AppEnv } from "@/lib/types";
import * as Sentry from "@sentry/node";
import { lt, sql } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { routePath } from "hono/route";

type UsageRow = typeof apiKeyUsageTable.$inferInsert;

const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_MAX_ROWS = 200;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
const RETENTION_DAYS = 30;
// Ceiling on the in-memory buffer. If the database is unreachable we drop the
// oldest rows rather than growing without bound — usage analytics are not worth
// an OOM.
const BUFFER_CAP = 5_000;

let buffer: UsageRow[] = [];
let flushing = false;

const column = (col: { name: string }) => sql.raw(`"${col.name}"`);

/**
 * Writes the batch, skipping rows whose key was revoked while they sat in the
 * buffer.
 *
 * A plain multi-row insert cannot do that: `key_id` is a foreign key, so one
 * orphaned row aborts the statement and takes every other key's rows with it.
 * Selecting through `WHERE EXISTS` filters those rows out in the same statement
 * instead, which is the same thing the cascade would have done to them a moment
 * later.
 *
 * `unnest` over one array per column, rather than a `VALUES` list, keeps this at
 * six parameters whatever the batch size. Each array has to go through
 * `sql.param`, or drizzle expands it into a parameter per element and Postgres
 * reads the result as a record rather than an array.
 */
async function flush(): Promise<void> {
    if (flushing || buffer.length === 0) return;
    flushing = true;
    const rows = buffer;
    buffer = [];
    const cols = apiKeyUsageTable;
    try {
        await db.execute(sql`
            INSERT INTO ${cols} (${column(cols.keyId)}, ${column(cols.userId)}, ${column(cols.method)}, ${column(cols.path)}, ${column(cols.status)}, ${column(cols.durationMs)})
            SELECT v.* FROM unnest(
                ${sql.param(rows.map((r) => r.keyId))}::text[],
                ${sql.param(rows.map((r) => r.userId ?? null))}::text[],
                ${sql.param(rows.map((r) => r.method))}::text[],
                ${sql.param(rows.map((r) => r.path))}::text[],
                ${sql.param(rows.map((r) => r.status))}::int[],
                ${sql.param(rows.map((r) => r.durationMs))}::int[]
            ) AS v(key_id, user_id, method, path, status, duration_ms)
            WHERE EXISTS (SELECT 1 FROM ${apikey} WHERE ${apikey.id} = v.key_id)
        `);
    } catch (err) {
        Sentry.captureException(err, { tags: { api_usage_rows: String(rows.length) } });
    } finally {
        flushing = false;
    }
}

async function prune(): Promise<void> {
    try {
        await db.delete(apiKeyUsageTable).where(lt(apiKeyUsageTable.createdAt, sql`now() - INTERVAL '${sql.raw(String(RETENTION_DAYS))} days'`));
    } catch (err) {
        Sentry.captureException(err);
    }
}

// Buffered because API traffic is orders of magnitude higher-volume than the
// admin actions `lib/audit.ts` records one-at-a-time. Each server instance
// flushes its own buffer, so this stays correct across replicas.
const flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
const pruneTimer = setInterval(() => void prune(), PRUNE_INTERVAL_MS);
flushTimer.unref?.();
pruneTimer.unref?.();

export function recordApiUsage(row: UsageRow): void {
    if (buffer.length >= BUFFER_CAP) buffer.shift();
    buffer.push(row);
    if (buffer.length >= FLUSH_MAX_ROWS) void flush();
}

/**
 * Times every API-key request and records it for the dashboard's consumption
 * charts. A no-op for cookie traffic.
 *
 * Unlike the audit log — which only sees mutations, because only mutating routes
 * call `logAction` — this captures reads too. That's the point: "how much is my
 * bot actually pulling" is a question the audit log can't answer.
 */
export const apiUsageMiddleware = createMiddleware<AppEnv>(async (c, next) => {
    if (!c.req.header("x-api-key")) {
        await next();
        return;
    }

    const startedAt = performance.now();
    await next();

    const apiKey = c.get("apiKey");
    // Absent when the key failed verification — those requests are rejected
    // before they reach a handler, so there's no consumption to attribute.
    if (!apiKey) return;

    recordApiUsage({
        keyId: apiKey.id,
        userId: apiKey.userId,
        method: c.req.method,
        // The matched route *pattern* ("/coc/player/:tag"), not the resolved
        // URL. Recording resolved paths would fan a single endpoint out into
        // thousands of rows and make the top-endpoints breakdown meaningless.
        path: routePath(c),
        status: c.res.status,
        durationMs: Math.round(performance.now() - startedAt),
    });
});
