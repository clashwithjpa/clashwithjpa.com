import { authClient } from "$lib/auth";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
    const session = await authClient.getSession();
    const { permissions } = await parent();
    const hasPerms = permissions?.review;

    if (!session.data?.user || !hasPerms) {
        throw error(401, "Unauthorized");
    }

    return { session, permissions };
};
