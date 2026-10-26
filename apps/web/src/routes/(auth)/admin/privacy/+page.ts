import { authClient, hasPermission } from "#lib/auth.js";
import { getPrivacy } from "@repo/clashofclans-client";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const session = await authClient.getSession();
    const hasPerms = await hasPermission(session.data?.user?.id, "root");

    if (!session.data?.user || !hasPerms) {
        throw error(401, "Unauthorized");
    }

    const privacy = await getPrivacy({}).unwrap();
    return { session, privacy };
};
