import { PUBLIC_SERVER_URL } from "$env/static/public";
import { authClient, hasPermission } from "$lib/auth";
import { getRules } from "@repo/clashofclans-client";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const session = await authClient.getSession();
    const hasPerms = await hasPermission(session.data?.user?.id, "manage");

    if (!session.data?.user || !hasPerms) {
        throw error(401, "Unauthorized");
    }

    const rules = await getRules({ baseURL: PUBLIC_SERVER_URL });
    return { session, rules };
};
