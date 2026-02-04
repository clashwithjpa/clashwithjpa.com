import { betterAuth } from 'better-auth';
import { admin as adminPlugin, openAPI, captcha } from 'better-auth/plugins';
import { db } from '../db';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { ac, admin, unverified, verified, reviewer, manager } from './permissions';
import 'dotenv/config';

export const auth = betterAuth({
    secret: process.env.JPA_AUTH_SECRET,
    baseURL: process.env.JPA_AUTH_URL,
    database: drizzleAdapter(db, {
        provider: 'pg',
    }),
    account: {
        encryptOAuthTokens: true,
    },
    emailAndPassword: {
        enabled: false,
        disableSignUp: true,
    },
    socialProviders: {
        discord: {
            clientId: process.env.JPA_DISCORD_ID!,
            clientSecret: process.env.JPA_DISCORD_SECRET!,
            overrideUserInfoOnSignIn: true,
            disableDefaultScope: true,
            scope: ['identify', 'guilds', 'guilds.members.read'],
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
            defaultRole: 'unverified',
            adminRoles: ['admin'],
        }),
        openAPI(),
        captcha({
            provider: 'cloudflare-turnstile',
            secretKey: process.env.JPA_TURNSTILE_SECRET_KEY!,
        }),
    ],
    advanced: {
        cookiePrefix: 'jpa',
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
            maxAge: 1 * 60, // Cache duration in seconds
        },
    },
    trustedOrigins: ['http://localhost:5173', process.env.JPA_APP_URL!],
});
