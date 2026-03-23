import { PUBLIC_SERVER_URL } from "$env/static/public";
import { getJPAClans } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const clans = await getJPAClans({
        baseURL: PUBLIC_SERVER_URL,
    });
    return { clans };
};
