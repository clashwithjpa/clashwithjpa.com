import type { PageServerLoad } from "./$types";
import type { ClanType } from "$lib/coc/types";
import { PUBLIC_API_BASE_URI } from "$env/static/public";
import { API_TOKEN } from "$env/static/private";
import { getClanTags, getClansInfo } from "$lib/coc/clan";

export const load = (async ({ setHeaders }) => {
    async function getClans(): Promise<ClanType[]> {
        const clanTagsArray = Object.keys(getClanTags());
        const clansInfo = await getClansInfo(PUBLIC_API_BASE_URI, clanTagsArray, API_TOKEN);
        return clansInfo;
    }

    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    return { data: getClans() as Promise<ClanType[]> };
}) satisfies PageServerLoad;
