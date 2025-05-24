import { getApplications, getAllCWLApplications } from "$lib/server/functions";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const applications = await getApplications(locals.db);
    const cwlApplications = await getAllCWLApplications(locals.db);
    return { applications, cwlApplications };
};
