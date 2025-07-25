import type { UserData } from "$lib/auth/user";
import { getCWLApplications, getUserAccounts, isApplicationEnabled, isCWLEnabled } from "$lib/server/functions";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals }) => {
    const user = locals.user as UserData;
    const applicationEnabled = await isApplicationEnabled(locals.db);
    const cwlEnabled = await isCWLEnabled(locals.db);
    let cocAccs;
    let hasCWLApplications = false;
    if (user) {
        cocAccs = await getUserAccounts(locals.db, user.id);
        if (cocAccs) {
            hasCWLApplications = (await getCWLApplications(locals.db, user.id)).length > 0;
        }
    }

    return {
        user,
        cocAccs,
        applicationEnabled,
        hasCWLApplications,
        cwlEnabled
    };
}) satisfies LayoutServerLoad;
