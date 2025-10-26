import { auth } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';

export const betterAuthHandler: Handle = async ({ event, resolve }) => {
	if (event.route.id?.startsWith('/(app)')) {
		const session = await auth.api.getSession({
			headers: event.request.headers
		});

		if (session) {
			event.locals.session = session?.session;
			event.locals.user = session?.user;
			return svelteKitHandler({ event, resolve, auth, building });
		} else {
			// redirect(307, "/auth/login");
			return svelteKitHandler({ event, resolve, auth, building });
		}
	} else {
		return svelteKitHandler({ event, resolve, auth, building });
	}
};

export const handle: Handle = sequence(betterAuthHandler);
