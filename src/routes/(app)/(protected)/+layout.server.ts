import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, '/auth/login');
	}
	return {
		user: event.locals.user
	};
};
