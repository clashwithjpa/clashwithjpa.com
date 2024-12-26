import { error } from "@sveltejs/kit";
import type { ClanType } from "$lib/coc/clans/types";
import { PUBLIC_API_BASE_URI } from "$env/static/public";
import { API_TOKEN } from "$env/static/private";
import { getClanTags, getClanInfo } from "$lib/coc/clans/info";

export async function load({ params, setHeaders }) {
    try {
        const clanTag = "#" + params.tag;
        if (!Object.keys(getClanTags()).includes(clanTag)) {
            error(404, `Could not find ${params.tag}`);
        }

        let clanInfo;
        try {
            clanInfo = await getClanInfo(PUBLIC_API_BASE_URI, clanTag, API_TOKEN);
        } catch {
            clanInfo = null;
        }

        setHeaders({
            "cache-control": "max-age=6000" // 100 minutes
        });

        return {
            tag: clanTag,
            data: clanInfo as ClanType
        };
    } catch {
        error(404, `Cannot find ${params.tag}`);
    }
}
