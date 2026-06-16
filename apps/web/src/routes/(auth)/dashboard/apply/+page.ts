import { PUBLIC_SERVER_URL } from "$env/static/public";
import { authClient, hasPermission } from "$lib/auth";
import { getUserFeatures } from "@repo/clashofclans-client";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const session = await authClient.getSession();
    const hasPerms = await hasPermission(session.data?.user?.id, "apply");

    if (!session.data?.user || !hasPerms) {
        throw error(401, "Unauthorized");
    }

    const features = await getUserFeatures({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
    if (!features.success || !features.data.applicationsEnabled) {
        throw error(403, "Applications are currently disabled.");
    }

    const canAddExternal = await hasPermission(session.data?.user?.id, "cwl");

    return { session, canAddExternal };
};
