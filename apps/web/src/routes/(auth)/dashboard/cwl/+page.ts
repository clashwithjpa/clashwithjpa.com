import { authClient, hasPermission } from "#lib/auth.js";
import { getUserFeatures } from "@repo/clashofclans-client";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const session = await authClient.getSession();
    const hasPerms = await hasPermission(session.data?.user?.id, "cwl");

    if (!session.data?.user || !hasPerms) {
        throw error(401, "Unauthorized");
    }

    const features = await getUserFeatures({});
    if (!features.data || !features.data.data.cwlEnabled) {
        throw error(403, "CWL is currently disabled.");
    }

    return { session };
};
