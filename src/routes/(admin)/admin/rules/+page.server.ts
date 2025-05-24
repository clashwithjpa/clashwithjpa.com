import { getRules } from "$lib/server/functions";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
    const rules = await getRules(locals.db);

    return { rules: rules };
}) satisfies PageServerLoad;
