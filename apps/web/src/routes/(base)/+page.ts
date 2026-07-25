import { PUBLIC_SERVER_URL } from "$env/static/public";
import { getJPAClanRequirements } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    try {
        const clans = await getJPAClanRequirements({ baseURL: PUBLIC_SERVER_URL });
        const clanTags = clans?.success ? Object.keys(clans.data.clans) : [];
        return { clanTags };
    } catch {
        return { clanTags: [] };
    }
};
