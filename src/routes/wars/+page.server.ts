import { API_TOKEN } from "$env/static/private";
import { PUBLIC_API_BASE_URI } from "$env/static/public";
import { getClanWarData } from "$lib/coc/clan";
import { getClansPublicData } from "$lib/server/functions";
import type { PageServerLoad } from "./$types";

export const load = (async ({ setHeaders, locals }) => {
    // Always fetch fresh wars so refresh reflects current state
    setHeaders({ "cache-control": "no-store" });

    const clans = await getClansPublicData(locals.db);

    const wars = await Promise.all(
        clans.map(async (clan) => {
            const tag = clan.clanData?.tag ?? clan.clanTag;
            try {
                const war = await getClanWarData(PUBLIC_API_BASE_URI, API_TOKEN, tag);
                if ((war as unknown as { error?: boolean }).error) {
                    return { clan, war: clan.clanCurrentWar ?? null } as const;
                }
                return { clan, war } as const;
            } catch {
                return { clan, war: clan.clanCurrentWar ?? null } as const;
            }
        })
    );

    return { wars };
}) satisfies PageServerLoad;
