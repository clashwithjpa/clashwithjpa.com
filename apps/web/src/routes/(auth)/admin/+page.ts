import { authClient, hasPermission } from "$lib/auth";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const session = await authClient.getSession();
    const hasPerms = await hasPermission(session.data?.user?.id, "review"); // Minimum permission required to access admin routes

    if (!session.data?.user || !hasPerms) {
        throw error(401, "Unauthorized");
    }

    return { session };
};
