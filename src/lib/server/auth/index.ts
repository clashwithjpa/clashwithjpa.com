////////////////////////////////////
// MAKE SURE TO KEEP THIS IN SYNC WITH better-auth.config.ts EXCEPT FOR SVELTE-KIT $ IMPORT
// AS IT IS USED FOR BETTER-AUTH CLI
//////////////////////////////////////

import { betterAuth } from 'better-auth';
import { env } from '$env/dynamic/private';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { admin as adminPlugin, openAPI, captcha } from 'better-auth/plugins';
import { db } from '$lib/server/db';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { ac, admin, unverified, verified, reviewer, manager } from './permissions';

export const auth = betterAuth({
	secret: env.AUTH_SECRET,
	baseURL: env.APP_URL,
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	account: {
		encryptOAuthTokens: true
	},
	emailAndPassword: {
		enabled: false,
		disableSignUp: true
	},
	socialProviders: {
		discord: {
			clientId: env.DISCORD_ID!,
			clientSecret: env.DISCORD_SECRET!,
			overrideUserInfoOnSignIn: true,
			disableDefaultScope: true,
			scope: ['identify', 'guilds', 'guilds.members.read']
		}
	},
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
			defaultRole: 'unverified',
			adminRoles: ['admin']
		}),
		openAPI(),
		captcha({
			provider: 'cloudflare-turnstile',
			secretKey: env.TURNSTILE_SECRET_KEY
		}),
		sveltekitCookies(getRequestEvent)
	],
	advanced: {
		cookiePrefix: 'jpa'
	},
	telemetry: {
		enabled: false
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 1 * 60 // Cache duration in seconds
		}
	},
	trustedOrigins: ['http://localhost:5173', env.APP_URL!]
});
