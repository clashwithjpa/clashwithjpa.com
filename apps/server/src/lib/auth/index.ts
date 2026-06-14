import { config } from "@/lib/config";
import { logActionForActor, type AuditActor, type LogActionInput } from "@/lib/audit";
import { db } from "@lib/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { admin as adminPlugin, captcha, openAPI } from "better-auth/plugins";
import { ac, admin, manager, reviewer, roleLevel, superadmin, unverified, verified } from "@repo/auth-shared";

const ROLE_MUTATING_PATHS = new Set(["/admin/set-role", "/admin/update-user", "/admin/create-user"]);
const TARGETED_USER_PATHS = new Set(["/admin/ban-user", "/admin/unban-user", "/admin/remove-user", "/admin/impersonate-user"]);

function normalizeRole(role: unknown): string | string[] | undefined {
    if (typeof role === "string") return role;
    if (Array.isArray(role)) return role.filter((r): r is string => typeof r === "string");
    return undefined;
}

function buildAuditFromAdminCall(path: string, body: unknown, returned: unknown): LogActionInput | null {
    const b = (body && typeof body === "object" ? (body as Record<string, unknown>) : {}) as Record<string, unknown>;
    const userId = typeof b.userId === "string" ? b.userId : undefined;

    switch (path) {
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
            if (!isRoleMutation && !isTargetedAction) return;

            const session = await getSessionFromCtx(ctx);
            if (!session) return;
            const callerLevel = roleLevel(session.user.role);

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

            const input = buildAuditFromAdminCall(ctx.path, ctx.body, returned);
            if (!input) return;

            const identity = await resolveTargetIdentity(ctx, input.targetId, returned);
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
