import { API_TOKEN } from "$env/static/private";
import { PUBLIC_API_BASE_URI } from "$env/static/public";
import { getClanInfo, getClanTags } from "$lib/coc/clan";
import type { ClanType } from "$lib/coc/types";
import { error } from "@sveltejs/kit";

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
