import { authClient, hasPermission } from "$lib/auth";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const session = await authClient.getSession();
    const hasPerms = await hasPermission(session.data?.user?.id, "review");

    if (!session.data?.user || !hasPerms) {
        throw error(401, "Unauthorized");
    }

    const canDelete = await hasPermission(session.data?.user?.id, "sudo");

    return { session, canDelete };
};
