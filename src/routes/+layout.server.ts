import type { UserData } from "$lib/auth/user";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals }) => {
    const user = locals.user as UserData;

    return {
        user
    };
}) satisfies LayoutServerLoad;
