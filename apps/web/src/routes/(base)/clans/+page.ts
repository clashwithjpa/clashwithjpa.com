import { getJPAClanRequirements } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    try {
        const clans = await getJPAClanRequirements({});
        return { clans };
    } catch {
        return { clans: null };
    }
};
