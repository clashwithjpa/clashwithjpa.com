////////////////////////////////////
// THIS IS JUST A COPY OF src/lib/server/auth.ts FILE. IT'S MADE BECAUSE BETTER-AUTH CONFIG DOESN'T SUPPORT SVELTE-KIT $ IMPORT
// KEEP IT IN SYNC WITH src/lib/server/auth.ts EXCEPT FOR SVELTE-KIT $ IMPORT AND RELATED IMPORTS
////////////////////////////////////

import { betterAuth } from 'better-auth';
// import { sveltekitCookies } from 'better-auth/svelte-kit';
// import { getRequestEvent } from '$app/server';
import { admin as adminPlugin, openAPI, captcha } from 'better-auth/plugins';
import { db } from './src/lib/server/db';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
	ac,
	admin,
	unverified,
	verified,
	reviewer,
	manager
} from './src/lib/server/auth/permissions';
import 'dotenv/config';

export const auth = betterAuth({
	secret: process.env.AUTH_SECRET!,
	baseURL: process.env.APP_URL!,
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
			clientId: process.env.DISCORD_ID!,
			clientSecret: process.env.DISCORD_SECRET!,
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
			secretKey: process.env.TURNSTILE_SECRET_KEY!
		})
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
	trustedOrigins: ['http://localhost:5173', process.env.APP_URL!]
});
