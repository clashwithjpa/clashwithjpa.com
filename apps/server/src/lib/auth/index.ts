import { diffFields, entity, logActionForActor, userEntity, type LogActionInput } from "@/lib/audit";
import { config } from "@/lib/config";
import { countApiKeysForUser } from "@/lib/db/functions";
import { apikey } from "@/lib/db/schema";
import type { AppEnv } from "@/lib/types";
import { apiKey as apiKeyPlugin } from "@better-auth/api-key";
import { db } from "@lib/db";
import { ac, admin, jpaPermsForRole, manager, reviewer, ROLE_LEVELS, roleLevel, superadmin, unverified, verified } from "@repo/auth-shared";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { admin as adminPlugin, captcha, openAPI } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { tryGetContext } from "hono/context-storage";

const ROLE_MUTATING_PATHS = new Set(["/admin/set-role", "/admin/update-user", "/admin/create-user"]);
const TARGETED_USER_PATHS = new Set(["/admin/ban-user", "/admin/unban-user", "/admin/remove-user", "/admin/impersonate-user"]);
// Key scopes are granted here, so both paths need the apiAccess + scope-ceiling
// gate. Dashboard creation goes via POST /api-keys instead, which re-implements
// the same three checks.
const API_KEY_MUTATING_PATHS = new Set(["/api-key/create", "/api-key/update"]);
export const MAX_API_KEYS_PER_USER = 5;

// Scopes as stored on a key: { jpa: ["apply", "cwl"] }, flattened for the log.
function scopesOf(permissions: unknown): string[] | undefined {
    const parsed = typeof permissions === "string" ? safeJson(permissions) : permissions;
    if (!parsed || typeof parsed !== "object") return undefined;
    const jpa = (parsed as Record<string, unknown>).jpa;
    return Array.isArray(jpa) ? jpa.filter((p): p is string => typeof p === "string") : undefined;
}

function safeJson(s: string): unknown {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

// Paths whose audit entry needs the target as it was before the handler ran.
const AUDIT_BEFORE_PATHS = new Set([
    "/admin/set-role",
    "/admin/update-user",
    "/admin/ban-user",
    "/admin/unban-user",
    "/admin/remove-user",
    "/admin/revoke-user-session",
    "/admin/revoke-user-sessions",
    "/admin/stop-impersonating",
    "/api-key/update",
    "/api-key/delete",
]);

// Fields an admin can never read back, so their values stay out of the log:
// the entry records that they changed, not what to.
const HIDDEN_USER_FIELDS = new Set(["email", "password", "emailVerified"]);
const HIDDEN = "[hidden]";

type AuthCtx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

async function findApiKey(id: string) {
    const [row] = await db.select().from(apikey).where(eq(apikey.id, id)).limit(1);
    return row ?? null;
}

const apiKeySnapshot = (k: { name?: unknown; enabled?: unknown; permissions?: unknown; expiresAt?: unknown } | null) =>
    k ? { name: k.name ?? null, enabled: k.enabled ?? null, scopes: scopesOf(k.permissions) ?? null, expiresAt: k.expiresAt ?? null } : null;

// Runs in the `before` hook. Stashes the target on the request so the `after`
// hook can diff against it; by then a removed user or a revoked key is gone.
async function captureAuditBefore(ctx: AuthCtx) {
    if (!AUDIT_BEFORE_PATHS.has(ctx.path)) return;
    const c = tryGetContext<AppEnv>();
    if (!c) return;
    const b = asRecord(ctx.body);
    const adapter = ctx.context.internalAdapter;

    if (ctx.path === "/api-key/update" || ctx.path === "/api-key/delete") {
        const keyId = asString(b.keyId);
        if (keyId) c.set("auditBefore", { key: apiKeySnapshot(await findApiKey(keyId)) });
        return;
    }
    if (ctx.path === "/admin/revoke-user-session") {
        // Only the owner is kept: the token itself is a live credential.
        const token = asString(b.sessionToken);
        const found = token ? await adapter.findSession(token) : null;
        if (found) c.set("auditBefore", { userId: found.session.userId });
        return;
    }
    if (ctx.path === "/admin/stop-impersonating") {
        const session = await getSessionFromCtx(ctx);
        if (session) c.set("auditBefore", { userId: session.user.id, impersonatorId: session.session.impersonatedBy ?? null });
        return;
    }

    const userId = asString(b.userId);
    if (!userId) return;
    const target = asRecord(await adapter.findUserById(userId));
    const snapshot: Record<string, unknown> = { userId, user: target };
    if (ctx.path === "/admin/revoke-user-sessions") snapshot.sessionCount = (await adapter.listSessions(userId)).length;
    c.set("auditBefore", snapshot);
}

function buildAuditFromAuthCall(path: string, body: unknown, returned: unknown, before: Record<string, unknown> | undefined): LogActionInput | null {
    const b = asRecord(body);
    const prev = asRecord(before?.user);
    const userId = asString(b.userId) ?? asString(before?.userId);
    const targetUser = (id: string | undefined) => ({
        targetType: "user" as const,
        targetId: id ?? null,
        subjects: id ? [userEntity({ id }, "target")] : [],
    });

    switch (path) {
        // The plaintext key (and its `start` fragment) is a live credential and
        // must never reach the audit log: name, scopes and expiry only.
        case "/api-key/create": {
            const created = asRecord(returned);
            const id = asString(created.id);
            return {
                action: "api_key.create",
                targetType: "api_key",
                targetId: id ?? null,
                subjects: id ? [entity("api_key", id, "target")] : [],
                changes: diffFields(null, apiKeySnapshot(created), ["name", "scopes", "enabled", "expiresAt"]),
            };
        }
        case "/api-key/update": {
            const keyId = asString(b.keyId);
            const prevKey = asRecord(before?.key) as ReturnType<typeof apiKeySnapshot>;
            return {
                action: "api_key.update",
                targetType: "api_key",
                targetId: keyId ?? null,
                subjects: keyId ? [entity("api_key", keyId, "target")] : [],
                changes: diffFields(prevKey, apiKeySnapshot(asRecord(returned)), ["name", "scopes", "enabled", "expiresAt"]),
                onlyIfChanged: true,
            };
        }
        case "/api-key/delete": {
            const keyId = asString(b.keyId);
            const prevKey = asRecord(before?.key) as ReturnType<typeof apiKeySnapshot>;
            return {
                action: "api_key.delete",
                targetType: "api_key",
                targetId: keyId ?? null,
                subjects: keyId ? [entity("api_key", keyId, "target")] : [],
                changes: diffFields(prevKey, null, ["name", "scopes", "enabled", "expiresAt"]),
            };
        }
        case "/admin/set-role": {
            if (!userId) return null;
            return {
                action: "user.role_set",
                ...targetUser(userId),
                changes: diffFields(prev, { role: b.role }, ["role"]),
                onlyIfChanged: true,
            };
        }
        case "/admin/update-user": {
            if (!userId) return null;
            const data = asRecord(b.data);
            const fields = Object.keys(data);
            const changes = fields
                .map((field) => (HIDDEN_USER_FIELDS.has(field) ? { field, before: HIDDEN, after: HIDDEN } : diffFields(prev, data, [field])[0]))
                .filter((ch) => ch !== undefined);
            return {
                action: "role" in data ? "user.role_set" : "user.update",
                ...targetUser(userId),
                changes,
                onlyIfChanged: true,
            };
        }
        case "/admin/create-user": {
            const created = asRecord(asRecord(returned).user);
            const id = asString(created.id);
            return { action: "user.create", ...targetUser(id), changes: diffFields(null, created, ["role"]) };
        }
        case "/admin/ban-user": {
            if (!userId) return null;
            const after = asRecord(asRecord(returned).user);
            return {
                action: "user.ban",
                ...targetUser(userId),
                changes: diffFields({ banned: false, ...prev }, after, ["banned", "banReason", "banExpires"]),
            };
        }
        case "/admin/unban-user": {
            if (!userId) return null;
            return {
                action: "user.unban",
                ...targetUser(userId),
                changes: diffFields(prev, { banned: false, banReason: null, banExpires: null }, ["banned", "banReason", "banExpires"]),
            };
        }
        case "/admin/remove-user": {
            if (!userId) return null;
            // Only the role is recorded: the user's profile goes with them, and the
            // entry shows them as a ghost from here on.
            return { action: "user.remove", ...targetUser(userId), changes: diffFields(prev, null, ["role"]) };
        }
        case "/admin/set-user-password": {
            if (!userId) return null;
            return { action: "user.password_set", ...targetUser(userId), changes: [{ field: "password", before: HIDDEN, after: HIDDEN }] };
        }
        case "/admin/revoke-user-session": {
            return { action: "user.session_revoked", ...targetUser(userId) };
        }
        case "/admin/revoke-user-sessions": {
            if (!userId) return null;
            return {
                action: "user.sessions_revoked",
                ...targetUser(userId),
                metadata: typeof before?.sessionCount === "number" ? { sessionsRevoked: before.sessionCount } : undefined,
            };
        }
        case "/admin/impersonate-user": {
            if (!userId) return null;
            return { action: "user.impersonate", ...targetUser(userId) };
        }
        case "/admin/stop-impersonating": {
            return { action: "user.impersonate_stop", ...targetUser(userId) };
        }
        default:
            return null;
    }
}

// Every /admin/* endpoint that returns a user hands back the full row, email
// included. Managers and admins hold `user:get`/`set-role`/`ban` so they'd read
// members' addresses out of those payloads even though no screen renders one.
// Strip the field on the way out for anyone below superadmin; the same redaction
// covers list-users, which only superadmin can still reach.
function redactUserEmail(value: unknown): unknown {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.users)) {
        return { ...record, users: record.users.map((u) => redactUserEmail(u)) };
    }
    if (record.user && typeof record.user === "object") {
        return { ...record, user: redactUserEmail(record.user) };
    }
    if ("email" in record) {
        const { email: _email, emailVerified: _emailVerified, ...rest } = record;
        return rest;
    }
    return value;
}

function extractRoleChange(path: string, body: unknown): { targetUserId?: string; newRole?: string | string[] } | null {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;

    if (path === "/admin/set-role") {
        return { targetUserId: typeof b.userId === "string" ? b.userId : undefined, newRole: b.role as string | string[] };
    }
    if (path === "/admin/update-user") {
        const data = b.data as Record<string, unknown> | undefined;
        if (!data || !Object.prototype.hasOwnProperty.call(data, "role")) return null;
        return { targetUserId: typeof b.userId === "string" ? b.userId : undefined, newRole: data.role as string | string[] };
    }
    if (path === "/admin/create-user") {
        if (b.role === undefined) return null;
        return { newRole: b.role as string | string[] };
    }
    return null;
}

export const auth = betterAuth({
    secret: config.JPA_AUTH_SECRET,
    baseURL: config.JPA_AUTH_URL,
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    account: {
        encryptOAuthTokens: true,
        accountLinking: {
            enabled: true,
            disableImplicitLinking: false,
            trustedProviders: ["discord"],
            updateUserInfoOnLink: true,
        },
    },
    user: {
        additionalFields: {
            discordUsername: {
                type: "string",
                required: false,
                input: false,
            },
            // Grants the ability to mint API keys. Orthogonal to the role ladder
            // so a plain member running a bot can have keys without being
            // promoted. `input: false` keeps it off every user-writable update
            // path — only PUT /admin/users/:userid/api-access sets it.
            apiAccess: {
                type: "boolean",
                required: false,
                defaultValue: false,
                input: false,
            },
        },
    },
    emailAndPassword: {
        enabled: false,
        disableSignUp: true,
    },
    socialProviders: {
        discord: {
            clientId: config.JPA_DISCORD_ID,
            clientSecret: config.JPA_DISCORD_SECRET,
            overrideUserInfoOnSignIn: true,
            disableDefaultScope: true,
            scope: ["identify", "email"],
            mapProfileToUser: (profile) => ({
                discordUsername: profile.username,
            }),
        },
    },
    plugins: [
        adminPlugin({
            ac,
            roles: {
                admin,
                unverified,
                verified,
                reviewer,
                manager,
                superadmin,
            },
            defaultRole: "unverified",
            adminRoles: ["superadmin"],
        }),
        ...(config.NODE_ENV !== "production" ? [openAPI()] : []),
        captcha({
            provider: "cloudflare-turnstile",
            secretKey: config.JPA_TURNSTILE_SECRET_KEY,
        }),
        // Machine-to-machine credentials. Keys are verified by
        // `betterAuthMiddleware` (see lib/middlewares.ts), which resolves the
        // owner so the existing role guards apply unchanged. Session creation
        // stays off: a key must never be mistaken for a real session.
        apiKeyPlugin({
            defaultPrefix: "jpa_",
            defaultKeyLength: 48,
            enableMetadata: true,
            // Keys are listed and audited by name, so an unnamed one is a
            // credential nobody can identify later.
            requireName: true,
            rateLimit: {
                enabled: true,
                maxRequests: 600,
                timeWindow: 1000 * 60 * 60,
            },
        }),
    ],
    hooks: {
        // Enforce a strict role hierarchy on top of better-auth's permission
        // checks. Three guarantees layered onto the relevant endpoints:
        //   - role mutations: the new role and the target's current role must
        //     both be strictly below the caller. Self-role-change blocked.
        //   - ban / unban / remove / impersonate: the target's current role
        //     must be strictly below the caller (so a manager can't ban or
        //     impersonate an admin), and self-action is blocked.
        // Without this, anyone with the `user:set-role` permission (currently
        // manager and above) could promote themselves or others to admin.
        before: createAuthMiddleware(async (ctx) => {
            await captureAuditBefore(ctx);

            const isRoleMutation = ROLE_MUTATING_PATHS.has(ctx.path);
            const isTargetedAction = TARGETED_USER_PATHS.has(ctx.path);
            const isApiKeyMutation = API_KEY_MUTATING_PATHS.has(ctx.path);
            if (!isRoleMutation && !isTargetedAction && !isApiKeyMutation) return;

            const session = await getSessionFromCtx(ctx);
            if (!session) return;
            const callerLevel = roleLevel(session.user.role);

            if (isApiKeyMutation) {
                if (!session.user.apiAccess) {
                    throw new APIError("FORBIDDEN", {
                        message: "API access is not enabled for this account.",
                    });
                }

                // Matches the guard on /api-keys. An unverified account holds
                // only `apply`, but that still reaches the member-only reads
                // (player lookups, battle logs, the clan lists), so a key is
                // worth something there and shouldn't be mintable unvetted.
                if (callerLevel < ROLE_LEVELS.verified) {
                    throw new APIError("FORBIDDEN", {
                        message: "Your account must be verified to manage API keys.",
                    });
                }

                // The plugin has no per-user key cap of its own, so enforce one
                // here. Without it a single account can mint keys without limit,
                // and every extra key is another credential to leak.
                if (ctx.path === "/api-key/create") {
                    const existing = await countApiKeysForUser(session.user.id);
                    if (existing >= MAX_API_KEYS_PER_USER) {
                        throw new APIError("FORBIDDEN", {
                            message: `You can have at most ${MAX_API_KEYS_PER_USER} API keys. Revoke one before creating another.`,
                        });
                    }
                }

                // A key can never be scoped above what its owner currently holds.
                // This is a guardrail, not the boundary — `hasAccessAuthMiddleware`
                // re-checks the owner's role on every request, so a later demotion
                // narrows existing keys without needing a sweep.
                const permissions = (ctx.body as { permissions?: Record<string, unknown> } | undefined)?.permissions;
                if (permissions) {
                    const foreign = Object.keys(permissions).filter((resource) => resource !== "jpa");
                    if (foreign.length > 0) {
                        throw new APIError("BAD_REQUEST", {
                            message: `API keys can only be scoped with jpa permissions. Unknown resource: ${foreign.join(", ")}`,
                        });
                    }
                    const requested = Array.isArray(permissions.jpa) ? (permissions.jpa as string[]) : [];
                    const allowed = jpaPermsForRole(session.user.role) as string[];
                    const over = requested.filter((perm) => !allowed.includes(perm));
                    if (over.length > 0) {
                        throw new APIError("FORBIDDEN", {
                            message: `You cannot grant scopes you do not hold: ${over.join(", ")}`,
                        });
                    }
                }
                return;
            }

            if (isRoleMutation) {
                const change = extractRoleChange(ctx.path, ctx.body);
                if (!change || change.newRole === undefined) return;

                const newRoles = Array.isArray(change.newRole) ? change.newRole : [change.newRole];
                const newRoleMaxLevel = newRoles.reduce((max, r) => Math.max(max, roleLevel(r)), -1);

                if (newRoleMaxLevel >= callerLevel) {
                    throw new APIError("FORBIDDEN", {
                        message: "You cannot assign a role equal to or higher than your own.",
                    });
                }

                if (change.targetUserId) {
                    if (change.targetUserId === session.user.id) {
                        throw new APIError("FORBIDDEN", {
                            message: "You cannot change your own role.",
                        });
                    }
                    const targetUser = (await ctx.context.internalAdapter.findUserById(change.targetUserId)) as { role?: string | null } | null;
                    if (targetUser && roleLevel(targetUser.role) >= callerLevel) {
                        throw new APIError("FORBIDDEN", {
                            message: "You cannot change the role of a user at or above your own level.",
                        });
                    }
                }
                return;
            }

            // ban / unban / remove / impersonate
            const body = ctx.body as { userId?: unknown } | undefined;
            const targetUserId = typeof body?.userId === "string" ? body.userId : undefined;
            if (!targetUserId) return;

            // better-auth already blocks self-ban and self-remove, but not
            // self-unban. Enforce uniformly here.
            if (targetUserId === session.user.id) {
                throw new APIError("FORBIDDEN", {
                    message: "You cannot perform this action on yourself.",
                });
            }

            const targetUser = (await ctx.context.internalAdapter.findUserById(targetUserId)) as { role?: string | null } | null;
            if (targetUser && roleLevel(targetUser.role) >= callerLevel) {
                throw new APIError("FORBIDDEN", {
                    message: "You cannot perform this action on a user at or above your own level.",
                });
            }
        }),
        // Audit successful admin endpoint calls. Runs after the handler with
        // ctx.context.returned set to the response (or APIError on failure).
        after: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.returned;
            if (isAPIError(returned)) return;

            // `/admin/stop-impersonating` is the one admin path whose user is the
            // caller's own (the restored superadmin), so it has nothing to hide.
            if (ctx.path.startsWith("/admin/") && ctx.path !== "/admin/stop-impersonating" && !(returned instanceof Response)) {
                const caller = await getSessionFromCtx(ctx);
                if (roleLevel(caller?.user.role) < ROLE_LEVELS.superadmin) {
                    ctx.context.returned = redactUserEmail(returned);
                }
            }

            const before = tryGetContext<AppEnv>()?.get("auditBefore");
            const input = buildAuditFromAuthCall(ctx.path, ctx.body, returned, before);
            if (!input) return;

            // POST /api-keys reaches the plugin with no session attached and logs
            // the action itself with the real actor; logging again here would
            // only add an actor-less duplicate.
            const session = await getSessionFromCtx(ctx);
            if (ctx.path.startsWith("/api-key/") && !session) return;

            // Stopping an impersonation is done from inside the impersonated
            // session, so the real actor is the admin it points back to.
            const actorId = ctx.path === "/admin/stop-impersonating" ? asString(before?.impersonatorId) : session?.user.id;
            logActionForActor(actorId ? { id: actorId } : null, input);
        }),
    },
    advanced: {
        cookiePrefix: "jpa",
        database: {
            joins: true,
        },
        crossSubDomainCookies: {
            enabled: true,
        },
        // BA's built-in rate limiter needs to know the client IP. In prod we're
        // behind Cloudflare so cf-connecting-ip is authoritative; XFF/x-real-ip
        // are fallbacks. Without this BA skips its own limits (see warning:
        // "Rate limiting skipped: could not determine client IP address").
        ipAddress: {
            ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
        },
    },
    telemetry: {
        enabled: false,
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 15, // Cache duration in seconds
        },
    },
    trustedOrigins: config.NODE_ENV === "production" ? [config.JPA_APP_URL] : ["http://localhost:5173", config.JPA_APP_URL],
});
