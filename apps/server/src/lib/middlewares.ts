import { isApiKeyAllowedPath } from "@/lib/api-access";
import { isAuthenticated, type AuthCheckFn } from "@/lib/auth/functions";
import { getApiKeyOwner } from "@/lib/db/functions";
import type { AppEnv } from "@/lib/types";
import { auth } from "@lib/auth";
import { maxPermLevel, permLevel } from "@repo/auth-shared";
import { createMiddleware } from "hono/factory";

// Key states that mean "you're valid but out of budget" rather than "you're
// bogus", so consumers can back off instead of rotating credentials.
const QUOTA_ERROR_CODES = new Set(["RATE_LIMIT_EXCEEDED", "USAGE_EXCEEDED"]);

// Resolves an `x-api-key` header into the same `user` the cookie path sets, so
// every downstream route guard keeps working untouched. `session` stays null —
// a key is never a session, which is what keeps key requests out of anything
// that reads the session directly.
const resolveApiKey = createMiddleware<AppEnv>(async (c, next) => {
    const rawKey = c.req.header("x-api-key")!;

    if (!isApiKeyAllowedPath(c.req.path)) {
        return c.json({ success: false, error: "This endpoint is not available to API keys" }, 403);
    }

    // This single call is also what ticks requestCount / remaining / lastRequest
    // and applies the key's own rate limit, so it must happen exactly once per
    // request — the reason we don't additionally run better-auth's
    // `enableSessionForAPIKeys`.
    const result = await auth.api.verifyApiKey({ body: { key: rawKey } });
    if (!result.valid || !result.key) {
        const quotaExhausted = !!result.error && QUOTA_ERROR_CODES.has(result.error.code);
        return c.json({ success: false, error: result.error?.message ?? "Invalid API key" }, quotaExhausted ? 429 : 401);
    }

    // Re-read the owner every request rather than trusting the key row: this is
    // what makes a ban or an API-access revocation bite immediately on keys
    // already in circulation.
    const owner = await getApiKeyOwner(result.key.referenceId);
    if (!owner || owner.banned || !owner.apiAccess) {
        return c.json({ success: false, error: "API access is not enabled for this key's owner" }, 401);
    }

    c.set("user", owner as unknown as NonNullable<AppEnv["Variables"]["user"]>);
    c.set("session", null);
    c.set("apiKey", {
        id: result.key.id,
        name: result.key.name,
        userId: owner.id,
        permissions: result.key.permissions ?? null,
    });

    await next();
});

export const betterAuthMiddleware = createMiddleware<AppEnv>(async (c, next) => {
    if (c.req.header("x-api-key")) {
        return resolveApiKey(c, next);
    }

    c.set("apiKey", null);

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        c.set("user", null);
        c.set("session", null);
        await next();
        return;
    }
    c.set("user", session.user);
    c.set("session", session.session);

    await next();
});

export const hasAccessAuthMiddleware = (checkFn: AuthCheckFn = isAuthenticated) =>
    createMiddleware<AppEnv>(async (c, next) => {
        const user = c.get("user");
        const session = c.get("session");
        const apiKey = c.get("apiKey");

        if (!user || (!session && !apiKey)) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        // Key requests clear two gates, not one. The scope check bounds what
        // this particular key may do; the role check below still decides what
        // its owner may do. A key is therefore never more powerful than its
        // owner, and demoting the owner narrows every key they hold.
        //
        // Compared by level, not membership: the `jpa` ladder is cumulative, so
        // a key scoped `sudo` outranks a `review` route the way an admin
        // outranks a reviewer.
        if (apiKey) {
            if (maxPermLevel(apiKey.permissions?.jpa) < permLevel(checkFn.perm)) {
                return c.json({ success: false, error: `API key is missing the required scope: ${checkFn.perm}` }, 403);
            }
        }

        const authResult = await checkFn(user.id);
        if (!authResult.success) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        await next();
    });
