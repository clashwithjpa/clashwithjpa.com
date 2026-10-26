import { getJPAClanRequirements } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    try {
        const clans = await getJPAClanRequirements({});
        const clanTags = clans?.data ? Object.keys(clans.data.data.clans) : [];
        return { clanTags };
    } catch {
        return { clanTags: [] };
    }
};
