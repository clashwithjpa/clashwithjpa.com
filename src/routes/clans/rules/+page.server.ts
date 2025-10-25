import { getRules } from "$lib/server/functions";
import type { PageServerLoad } from "./$types";

export const load = (async ({ setHeaders, locals }) => {
    const rules = await getRules(locals.db);

    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });
    return { rules };
}) satisfies PageServerLoad;
