////////////////////////////////////
// MAKE SURE TO KEEP THIS IN SYNC WITH better-auth.config.ts EXCEPT FOR SVELTE-KIT $ IMPORT
// AS IT IS USED FOR BETTER-AUTH CLI
//////////////////////////////////////

import { betterAuth } from "better-auth";
import { env } from "$env/dynamic/private";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { admin as adminPlugin, openAPI } from "better-auth/plugins";
import { db } from "./db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { ac, admin, unverified, verified, reviewer, manager } from "./permissions";

export const auth = betterAuth({
    secret: env.AUTH_SECRET,
    baseURL: env.APP_URL,
    database: drizzleAdapter(db, {
        provider: "pg"
    }),
    account: {
        encryptOAuthTokens: true
    },
    emailAndPassword: {
        enabled: false,
        disableSignUp: true
    },
    socialProviders: {},
    plugins: [
        adminPlugin({
            ac,
            roles: {
                admin,
                unverified,
                verified,
                reviewer,
                manager
            },
            defaultRole: "unverified",
            adminRoles: ["admin"]
        }),
        openAPI(),
        sveltekitCookies(getRequestEvent)
    ],
    advanced: {
        cookiePrefix: "jpa"
    },
    telemetry: {
        enabled: false
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 1 * 60 // Cache duration in seconds
        }
    }
});