import type { UserData } from "$lib/auth/user";
import { getUserAccounts, isApplicationEnabled, isCWLEnabled } from "$lib/server/functions";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals }) => {
    const user = locals.user as UserData;
    const applicationEnabled = await isApplicationEnabled(locals.db);
    const cwlEnabled = await isCWLEnabled(locals.db);
    let cocAccs;
    if (user) {
        cocAccs = await getUserAccounts(locals.db, user.id);
    }

    return {
        user,
        cocAccs,
        applicationEnabled,
        cwlEnabled
    };
}) satisfies LayoutServerLoad;
