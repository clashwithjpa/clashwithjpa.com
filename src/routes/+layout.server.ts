import { getUserChecks, type UserChecks } from "$lib/auth/user";
import { isApplicationEnabled, isCWLEnabled } from "$lib/server/functions";
import type { APIUser } from "discord-api-types/v10";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals, fetch }) => {
    const user = locals.user as APIUser;
    const applicationEnabled = await isApplicationEnabled(locals.db);
    const cwlEnabled = await isCWLEnabled(locals.db);

    let checks: UserChecks = { inGuild: false, isAdmin: false };
    if (user) {
        checks = await getUserChecks(fetch);
    }

    return {
        user,
        checks,
        applicationEnabled,
        cwlEnabled
    };
}) satisfies LayoutServerLoad;
