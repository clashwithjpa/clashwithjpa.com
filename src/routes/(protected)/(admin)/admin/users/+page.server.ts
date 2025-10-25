import { getUsers } from "$lib/server/functions";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const users = await getUsers(locals.db);

    return { users };
};
