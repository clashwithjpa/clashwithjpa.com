import { authClient, hasPermission } from "$lib/auth";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const session = await authClient.getSession();
    // Bonus table is for managers and admins (and above) only.
    const hasPerms = await hasPermission(session.data?.user?.id, "manage");

    if (!session.data?.user || !hasPerms) {
        throw error(401, "Unauthorized");
    }

    return { session };
};
