import { authClient } from "$lib/auth";
import { ROLE_LEVELS, roleLevel } from "@repo/auth-shared";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const session = await authClient.getSession();
    const user = session.data?.user;

    if (!user) {
        throw error(401, "Unauthorized");
    }

    // Advisory only, like every other guard in this app — the server refuses
    // /api-key/create outright for anyone failing either check.
    if (!user.apiAccess) {
        throw error(403, "API access is not enabled for your account. Ask an admin to enable it.");
    }

    if (roleLevel(user.role) < ROLE_LEVELS.verified) {
        throw error(403, "Your account must be verified before you can manage API keys.");
    }

    return { session };
};
