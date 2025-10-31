import { getAllCWLApplications, getCWLApplications, getCWLClans } from "$lib/server/functions";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) {
        console.error("Login to view the CWL List");
        return redirect(302, "/");
    }

    const cwlApplications = await getAllCWLApplications(locals.db);

    if (cwlApplications.length === 0) {
        return redirect(302, "/");
    }

    const cwlClans = await getCWLClans(locals.db);
    const userApplications = await getCWLApplications(locals.db, user.id);

    return {
        cwlApplications,
        cwlClans,
        userId: user.id,
        hasUserApplications: userApplications.length > 0
    };
};
