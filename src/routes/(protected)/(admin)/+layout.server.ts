import type { UserData } from "$lib/auth/user";
import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load = (async ({ locals }) => {
    const user = locals.user as UserData;

    if (!user || !user.isAdmin) {
        return redirect(302, "/");
    }

    return {
        user
    };
}) satisfies LayoutServerLoad;
