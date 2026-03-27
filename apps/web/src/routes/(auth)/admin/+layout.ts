import { authClient, hasPermission } from "$lib/auth";
import { error } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async () => {
    const session = await authClient.getSession();
    const isAdmin = await hasPermission(session.data?.user?.id, "review");

    if (!session.data?.user || !isAdmin) {
        throw error(401, "Unauthorized");
    }

    return { session };
};
