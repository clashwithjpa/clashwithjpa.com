import { config } from "@/lib/config";
import { logActionForActor, type AuditActor, type LogActionInput } from "@/lib/audit";
import { countApiKeysForUser } from "@/lib/db/functions";
import { db } from "@lib/db";
import { apiKey as apiKeyPlugin } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { admin as adminPlugin, captcha, openAPI } from "better-auth/plugins";
import { ac, admin, jpaPermsForRole, manager, reviewer, ROLE_LEVELS, roleLevel, superadmin, unverified, verified } from "@repo/auth-shared";

const ROLE_MUTATING_PATHS = new Set(["/admin/set-role", "/admin/update-user", "/admin/create-user"]);
const TARGETED_USER_PATHS = new Set(["/admin/ban-user", "/admin/unban-user", "/admin/remove-user", "/admin/impersonate-user"]);
// Key scopes are granted here, so both paths need the apiAccess + scope-ceiling
// gate. Dashboard creation goes via POST /api-keys instead, which re-implements
// the same three checks.
const API_KEY_MUTATING_PATHS = new Set(["/api-key/create", "/api-key/update"]);
export const MAX_API_KEYS_PER_USER = 5;

function normalizeRole(role: unknown): string | string[] | undefined {
    if (typeof role === "string") return role;
    if (Array.isArray(role)) return role.filter((r): r is string => typeof r === "string");
    return undefined;
}

// Scopes as stored on a key: { jpa: ["apply", "cwl"] }. Flattened to a plain
// string array for audit metadata so the log stays readable.
function scopesFromBody(body: Record<string, unknown>): string[] | undefined {
    const perms = body.permissions;
    if (!perms || typeof perms !== "object") return undefined;
    const jpa = (perms as Record<string, unknown>).jpa;
    return Array.isArray(jpa) ? jpa.filter((p): p is string => typeof p === "string") : undefined;
}

function buildAuditFromAuthCall(path: string, body: unknown, returned: unknown): LogActionInput | null {
    const b = (body && typeof body === "object" ? (body as Record<string, unknown>) : {}) as Record<string, unknown>;
    const userId = typeof b.userId === "string" ? b.userId : undefined;

    switch (path) {
        // API key lifecycle. The plaintext key (and its `start` fragment) is a
        // live credential and must never reach the audit log — name, id and
        // scopes only.
        case "/api-key/create": {
            const created = (returned && typeof returned === "object" ? (returned as { id?: unknown; name?: unknown }) : {}) as Record<
                string,
                unknown
            >;
            return {
                action: "api_key.create",
                targetType: "api_key",
                targetId: typeof created.id === "string" ? created.id : null,
                metadata: { name: typeof b.name === "string" ? b.name : undefined, scopes: scopesFromBody(b) },
            };
        }
        case "/api-key/update": {
            return {
                action: "api_key.update",
                targetType: "api_key",
                targetId: typeof b.keyId === "string" ? b.keyId : null,
                metadata: {
                    name: typeof b.name === "string" ? b.name : undefined,
                    scopes: scopesFromBody(b),
                    enabled: typeof b.enabled === "boolean" ? b.enabled : undefined,
                },
            };
        }
        case "/api-key/delete": {
            return { action: "api_key.delete", targetType: "api_key", targetId: typeof b.keyId === "string" ? b.keyId : null };
        }
        case "/admin/set-role": {
            if (!userId) return null;
            return { action: "user.role_set", targetType: "user", targetId: userId, metadata: { role: normalizeRole(b.role) } };
        }
        case "/admin/update-user": {
            if (!userId) return null;
            const data = (b.data && typeof b.data === "object" ? (b.data as Record<string, unknown>) : {}) as Record<string, unknown>;
            const changedFields = Object.keys(data);
            if (Object.prototype.hasOwnProperty.call(data, "role")) {
                return { action: "user.role_set", targetType: "user", targetId: userId, metadata: { role: normalizeRole(data.role), changedFields } };
            }
            return { action: "user.update", targetType: "user", targetId: userId, metadata: { changedFields } };
        }
        case "/admin/create-user": {
            const created = (returned && typeof returned === "object" ? (returned as { user?: { id?: unknown } }).user : undefined) ?? undefined;
            const newUserId = created && typeof created.id === "string" ? created.id : undefined;
            return {
                action: "user.create",
                targetType: "user",
                targetId: newUserId ?? null,
                metadata: { role: normalizeRole(b.role) },
            };
        }
        case "/admin/ban-user": {
            if (!userId) return null;
            return {
                action: "user.ban",
                targetType: "user",
                targetId: userId,
                metadata: {
                    banReason: typeof b.banReason === "string" ? b.banReason : undefined,
                    banExpiresIn: typeof b.banExpiresIn === "number" ? b.banExpiresIn : undefined,
                },
            };
        }
        case "/admin/unban-user": {
            if (!userId) return null;
            return { action: "user.unban", targetType: "user", targetId: userId };
        }
        case "/admin/remove-user": {
            if (!userId) return null;
            return { action: "user.remove", targetType: "user", targetId: userId };
        }
        case "/admin/set-user-password": {
            if (!userId) return null;
            return { action: "user.password_set", targetType: "user", targetId: userId };
        }
        case "/admin/revoke-user-session": {
            // Session token is a live credential — never store it. Without
            // pre-resolution in a before hook, we have no userId either, so
            // this entry only records the action + actor + timestamp.
            return { action: "user.session_revoked", targetType: "user", targetId: null };
        }
        case "/admin/revoke-user-sessions": {
            if (!userId) return null;
            return { action: "user.sessions_revoked", targetType: "user", targetId: userId };
        }
        default:
            return null;
    }
}

type AuthCtxForLookup = {
    context: {
        internalAdapter: {
            findUserById: (id: string) => Promise<unknown>;
            findAccountByUserId: (id: string) => Promise<unknown[]>;
        };
    };
};

async function resolveTargetIdentity(
    ctx: AuthCtxForLookup,
    targetId: string | number | null | undefined,
    returned: unknown,
): Promise<{ targetName?: string; targetDiscordId?: string }> {
    let userId: string | undefined;
    let nameFromResponse: string | undefined;

    if (returned && typeof returned === "object") {
        const u = (returned as { user?: { id?: unknown; name?: unknown } }).user;
        if (u && typeof u.id === "string") {
            userId = u.id;
            if (typeof u.name === "string") nameFromResponse = u.name;
        }
    }
    if (!userId && typeof targetId === "string") userId = targetId;
    if (!userId) return {};

    try {
        const [userRow, accounts] = await Promise.all([
            nameFromResponse ? Promise.resolve(null) : ctx.context.internalAdapter.findUserById(userId),
            ctx.context.internalAdapter.findAccountByUserId(userId),
        ]);
        const name = nameFromResponse ?? (userRow as { name?: string } | null)?.name;
        const discord = accounts.find((a): a is { providerId: string; accountId: string } => {
            return !!a && typeof a === "object" && (a as { providerId?: unknown }).providerId === "discord";
        });
        const out: { targetName?: string; targetDiscordId?: string } = {};
        if (name) out.targetName = name;
        if (discord?.accountId) out.targetDiscordId = discord.accountId;
        return out;
    } catch {
        return {};
    }
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
            scope: ["identify", "email", "guilds", "guilds.members.read"],
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

            const input = buildAuditFromAuthCall(ctx.path, ctx.body, returned);
            if (!input) return;

            // POST /api-keys reaches the plugin with no session attached and logs
            // the action itself with the real actor; logging again here would
            // only add an actor-less duplicate.
            if (ctx.path.startsWith("/api-key/") && !(await getSessionFromCtx(ctx))) return;

            // Only user targets have a name/Discord id to resolve; skip the two
            // lookups for api_key rows.
            const identity = input.targetType === "user" ? await resolveTargetIdentity(ctx, input.targetId, returned) : {};
            const enriched: LogActionInput = {
                ...input,
                metadata: { ...identity, ...(input.metadata ?? {}) },
            };

            const session = await getSessionFromCtx(ctx);
            const actor: AuditActor = session?.user ? { id: session.user.id, name: session.user.name } : null;
            logActionForActor(actor, enriched);
        }),
    },
    advanced: {
        cookiePrefix: "jpa",
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
    experimental: { joins: true },
});
