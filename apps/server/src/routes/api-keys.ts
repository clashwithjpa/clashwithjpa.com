import { logAction } from "@/lib/audit";
import { auth, MAX_API_KEYS_PER_USER } from "@/lib/auth";
import { isVerified } from "@/lib/auth/functions";
import {
    countApiKeysForUser,
    getApiKeyUsageDaily,
    getApiKeyUsageEndpoints,
    getApiKeyUsageStatus,
    getApiKeyUsageSummary,
    getOwnedApiKey,
} from "@/lib/db/functions";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { describeRoute } from "@/lib/openapi";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import { jpaPermsForRole, jpaPermsUpTo, statement } from "@repo/auth-shared";
import * as Sentry from "@sentry/node";
import { Hono, type Context } from "hono";
import { resolver, validator as zValidator } from "hono-openapi";
import z4 from "zod/v4";

// Key creation and consumption analytics for a user's own API keys, backing the
// dashboard's API Keys page. Cookie-authed only: this namespace is on the
// api-key denylist (see lib/api-access.ts), so a key can't mint another key or
// read analytics — including its own. Listing, updating and revoking stay on
// better-auth's /api/auth/api-key/* routes; only creation needs the detour below.
const app = new Hono<AppEnv>();

const errorResponses = {
    401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
    404: { description: "API key not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
    500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
};

const usageQuerySchema = z4.object({
    keyId: z4.string().min(1),
    days: z4.coerce.number().int().min(1).max(90).default(30),
});

/**
 * Resolves the key named in the query, but only if the caller owns it. Callers
 * answer 404 rather than 403 for someone else's key — a 403 would confirm the
 * id exists, turning this into an enumeration oracle.
 */
async function requireOwnedKey(c: Context<AppEnv>, keyId: string) {
    const user = c.get("user")!;
    return await getOwnedApiKey(keyId, user.id);
}

const DAY_SECONDS = 60 * 60 * 24;

const createApiKeyBodySchema = z4.object({
    name: z4.string().trim().min(1).max(64),
    // One ceiling, not a set: the `jpa` ladder is cumulative, so `manage`
    // already implies review, cwl and apply. Stored expanded.
    scope: z4.enum(statement.jpa),
    // The plugin rejects anything outside 1–365 days; bounding it here turns
    // that into a validation error rather than an opaque BAD_REQUEST.
    expiresIn: z4
        .number()
        .int()
        .min(DAY_SECONDS)
        .max(365 * DAY_SECONDS)
        .optional(),
});

const createdKeyData = z4.object({
    id: z4.string(),
    name: z4.string().nullable(),
    key: z4.string(),
});

/**
 * Mints a key for the caller.
 *
 * This exists because `permissions` is a server-only property on the plugin's
 * own /api-key/create endpoint: it rejects the field whenever `ctx.request` or
 * `ctx.headers` is set, which is every call a browser can make. Forwarding the
 * caller's headers would trip the same check, so the call is made without them
 * and the owner is named via `userId`.
 *
 * The plugin therefore sees no session and the auth `before` hook's api-key gate
 * short-circuits, so its three guarantees are re-established here. Keep them in
 * step with lib/auth/index.ts.
 */
app.post(
    "/",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "createApiKey",
        role: "Verified",
        description: "Creates an API key owned by the caller. The plaintext key is returned once and never again.",
        tags: ["api-keys"],
        responses: {
            200: { description: "The created key.", content: { "application/json": { schema: resolver(SuccessResponseSchema(createdKeyData)) } } },
            403: {
                description: "API access disabled, key limit reached, or scope above the caller's role.",
                content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
            },
            ...errorResponses,
        },
    }),
    zValidator("json", createApiKeyBodySchema),
    async (c) => {
        try {
            const user = c.get("user")!;
            const { name, scope, expiresIn } = c.req.valid("json");

            if (!user.apiAccess) {
                return c.json({ success: false, error: "API access is not enabled for this account." }, 403);
            }

            const existing = await countApiKeysForUser(user.id);
            if (existing >= MAX_API_KEYS_PER_USER) {
                return c.json(
                    { success: false, error: `You can have at most ${MAX_API_KEYS_PER_USER} API keys. Revoke one before creating another.` },
                    403,
                );
            }

            // A guardrail, not the boundary — `hasAccessAuthMiddleware` re-checks
            // the owner's role on every request, so a later demotion narrows
            // existing keys without needing a sweep.
            if (!jpaPermsForRole(user.role).includes(scope)) {
                return c.json({ success: false, error: `You cannot grant a scope above your own role: ${scope}` }, 403);
            }

            const scopes = jpaPermsUpTo(scope);
            const created = await auth.api.createApiKey({
                body: {
                    name,
                    userId: user.id,
                    permissions: { jpa: scopes },
                    ...(expiresIn ? { expiresIn } : {}),
                },
            });

            // Logged here, not by the auth `after` hook: that hook only sees an
            // actor when a session is present, and this call carries none.
            logAction(c, {
                action: "api_key.create",
                targetType: "api_key",
                targetId: created.id,
                metadata: { name: created.name ?? name, scope, scopes },
            });

            return c.json({ success: true, data: { id: created.id, name: created.name, key: created.key } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to create API key" }, 500);
        }
    },
);

/**
 * How much of the key's rate-limit window is left, mirroring `isRateLimited` in
 * the api-key plugin: the window is anchored on the last request rather than on
 * wall-clock boundaries, so it only rolls over once the key has been idle for a
 * full window.
 */
function rateLimitWindow(key: NonNullable<Awaited<ReturnType<typeof getOwnedApiKey>>>) {
    const max = key.rateLimitMax;
    const window = key.rateLimitTimeWindow;
    if (key.rateLimitEnabled === false || max === null || window === null) {
        return { windowRequests: 0, rateLimitRemaining: null, rateLimitResetAt: null };
    }

    const last = key.lastRequest ? new Date(key.lastRequest).getTime() : null;
    const inWindow = last !== null && Date.now() - last <= window;
    if (!inWindow) return { windowRequests: 0, rateLimitRemaining: max, rateLimitResetAt: null };

    return {
        windowRequests: key.requestCount ?? 0,
        rateLimitRemaining: Math.max(0, max - (key.requestCount ?? 0)),
        rateLimitResetAt: new Date(last + window),
    };
}

const summaryData = z4.object({
    requests: z4.number(),
    errors: z4.number(),
    errorRate: z4.number(),
    p50DurationMs: z4.number(),
    p95DurationMs: z4.number(),
    windowRequests: z4.number(),
    rateLimitRemaining: z4.number().nullable(),
    rateLimitResetAt: z4.date().nullable(),
    remaining: z4.number().nullable(),
    rateLimitMax: z4.number().nullable(),
    rateLimitTimeWindow: z4.number().nullable(),
    lastRequest: z4.date().nullable(),
});
app.get(
    "/usage/summary",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "getApiKeyUsageSummary",
        role: "Verified",
        description: "Traffic totals, error rate, latency percentiles and remaining quota for one of your own API keys.",
        tags: ["api-keys"],
        responses: {
            200: { description: "Usage summary.", content: { "application/json": { schema: resolver(SuccessResponseSchema(summaryData)) } } },
            ...errorResponses,
        },
    }),
    zValidator("query", usageQuerySchema),
    async (c) => {
        try {
            const { keyId, days } = c.req.valid("query");
            const key = await requireOwnedKey(c, keyId);
            if (!key) return c.json({ success: false, error: "API key not found" }, 404);

            const summary = await getApiKeyUsageSummary(keyId, days);
            return c.json({
                success: true,
                data: {
                    ...summary,
                    // `key.requestCount` counts the current rate-limit window, not
                    // the key's lifetime — it resets when the window rolls over.
                    ...rateLimitWindow(key),
                    remaining: key.remaining,
                    rateLimitMax: key.rateLimitMax,
                    rateLimitTimeWindow: key.rateLimitTimeWindow,
                    lastRequest: key.lastRequest,
                },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch API key usage summary" }, 500);
        }
    },
);

const dailySeriesData = z4.object({
    data: z4.array(z4.object({ date: z4.string(), count: z4.number() })),
});
app.get(
    "/usage/daily",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "getApiKeyUsageDaily",
        role: "Verified",
        description: "Daily request count for one of your own API keys over the requested window.",
        tags: ["api-keys"],
        responses: {
            200: { description: "Daily usage.", content: { "application/json": { schema: resolver(SuccessResponseSchema(dailySeriesData)) } } },
            ...errorResponses,
        },
    }),
    zValidator("query", usageQuerySchema),
    async (c) => {
        try {
            const { keyId, days } = c.req.valid("query");
            if (!(await requireOwnedKey(c, keyId))) return c.json({ success: false, error: "API key not found" }, 404);
            return c.json({ success: true, data: await getApiKeyUsageDaily(keyId, days) });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch API key daily usage" }, 500);
        }
    },
);

const endpointsData = z4.object({
    data: z4.array(z4.object({ method: z4.string(), path: z4.string(), count: z4.number(), avgDurationMs: z4.number() })),
});
app.get(
    "/usage/endpoints",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "getApiKeyUsageEndpoints",
        role: "Verified",
        description: "Most-called endpoints for one of your own API keys, with average latency.",
        tags: ["api-keys"],
        responses: {
            200: { description: "Endpoint breakdown.", content: { "application/json": { schema: resolver(SuccessResponseSchema(endpointsData)) } } },
            ...errorResponses,
        },
    }),
    zValidator("query", usageQuerySchema.extend({ limit: z4.coerce.number().int().min(1).max(25).default(10) })),
    async (c) => {
        try {
            const { keyId, days, limit } = c.req.valid("query");
            if (!(await requireOwnedKey(c, keyId))) return c.json({ success: false, error: "API key not found" }, 404);
            return c.json({ success: true, data: await getApiKeyUsageEndpoints(keyId, days, limit) });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch API key endpoint usage" }, 500);
        }
    },
);

const statusData = z4.object({
    data: z4.array(z4.object({ statusClass: z4.string(), count: z4.number() })),
});
app.get(
    "/usage/status",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "getApiKeyUsageStatus",
        role: "Verified",
        description: "Response status mix (2xx / 3xx / 4xx / 429 / 5xx) for one of your own API keys.",
        tags: ["api-keys"],
        responses: {
            200: { description: "Status breakdown.", content: { "application/json": { schema: resolver(SuccessResponseSchema(statusData)) } } },
            ...errorResponses,
        },
    }),
    zValidator("query", usageQuerySchema),
    async (c) => {
        try {
            const { keyId, days } = c.req.valid("query");
            if (!(await requireOwnedKey(c, keyId))) return c.json({ success: false, error: "API key not found" }, 404);
            return c.json({ success: true, data: await getApiKeyUsageStatus(keyId, days) });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch API key status usage" }, 500);
        }
    },
);

export default app;
