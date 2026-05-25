import { config } from "@/lib/config";
import { db } from "@lib/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin, captcha, openAPI } from "better-auth/plugins";
import { ac, admin, manager, reviewer, unverified, verified } from "./permissions";

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
            },
            defaultRole: "unverified",
            adminRoles: ["admin"],
        }),
        openAPI(),
        captcha({
            provider: "cloudflare-turnstile",
            secretKey: config.JPA_TURNSTILE_SECRET_KEY,
        }),
    ],
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
