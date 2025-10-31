import { getAllCWLApplications, getCWLApplications, getCWLClans } from "$lib/server/functions";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const cwlApplications = await getAllCWLApplications(locals.db);

    // If there are no CWL applications, redirect to home
    if (cwlApplications.length === 0) {
        return redirect(302, "/");
    }

    const cwlClans = await getCWLClans(locals.db);
    const user = locals.user;
    let userId = null;
    let hasUserApplications = false;

    // If user is logged in, check their applications
    if (user) {
        userId = user.id;
        const userApplications = await getCWLApplications(locals.db, user.id);
        hasUserApplications = userApplications.length > 0;
    }

    return {
        cwlApplications,
        cwlClans,
        userId,
        hasUserApplications
    };
};
