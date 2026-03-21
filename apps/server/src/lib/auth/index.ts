import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin, captcha, openAPI } from "better-auth/plugins";
import { db } from "@lib/db";
import { ac, admin, manager, reviewer, unverified, verified } from "./permissions";
import { config } from "@/lib/config";

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
    },
    telemetry: {
        enabled: false,
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 1 * 30, // Cache duration in seconds
        },
    },
    trustedOrigins: ["http://localhost:5173", config.JPA_APP_URL],
    experimental: { joins: true },
});
