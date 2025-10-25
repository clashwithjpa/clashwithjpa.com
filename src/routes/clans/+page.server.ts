import type { PageServerLoad } from "./$types";
import { getClansPublicData } from "$lib/server/functions";

export const load = (async ({ setHeaders, locals }) => {
    const clans = await getClansPublicData(locals.db);

    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });
    return { clans };
}) satisfies PageServerLoad;
