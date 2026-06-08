import { authClient, hasPermission } from "$lib/auth";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const session = await authClient.getSession();
    const hasPerms = await hasPermission(session.data?.user?.id, "manage");

    if (!session.data?.user || !hasPerms) {
        throw error(401, "Unauthorized");
    }

    // Deleting applications is an admin-only (sudo) power, mirroring the server gate.
    const canDelete = await hasPermission(session.data?.user?.id, "sudo");

    return { session, canDelete };
};
