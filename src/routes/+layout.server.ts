import type { LayoutServerLoad } from "./$types";
import type { UserData } from "$lib/auth/user";

export const load = (async ({ locals }) => {
    const user = locals.user as UserData;

    return {
        user
    };
}) satisfies LayoutServerLoad;
