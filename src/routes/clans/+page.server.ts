import type { PageServerLoad } from "./$types";
import { getClansPublicData } from "$lib/server/functions";

export const load = (async ({ setHeaders, locals }) => {
    const data = await getClansPublicData(locals.db);

    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    return { clans: data };
}) satisfies PageServerLoad;
