import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load = (async (event) => {
    if (event.locals.user) {
        throw redirect(302, '/');
    }

    return {};
}) satisfies PageServerLoad;