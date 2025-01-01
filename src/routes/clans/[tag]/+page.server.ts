import { error } from "@sveltejs/kit";
import { getClanPublicData } from "$lib/server/functions";
import type { PageServerLoad } from "./$types";

export const load = (async ({ setHeaders, locals, params }) => {
    const clanTag = "#" + params.tag;
    const [data] = await getClanPublicData(locals.db, clanTag);
    if (!data) {
        error(404, `Cannot find ${params.tag}`);
    }

    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    return {
        tag: clanTag,
        clan: data
    };
}) satisfies PageServerLoad;
