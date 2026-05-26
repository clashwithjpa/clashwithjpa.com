import { config } from "@/lib/config";
import { db } from "@lib/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { admin as adminPlugin, captcha, openAPI } from "better-auth/plugins";
import { ac, admin, manager, reviewer, roleLevel, superadmin, unverified, verified } from "./permissions";

const ROLE_MUTATING_PATHS = new Set(["/admin/set-role", "/admin/update-user", "/admin/create-user"]);
const TARGETED_USER_PATHS = new Set(["/admin/ban-user", "/admin/unban-user", "/admin/remove-user", "/admin/impersonate-user"]);

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
            adminRoles: ["admin", "superadmin"],
        }),
        openAPI(),
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
