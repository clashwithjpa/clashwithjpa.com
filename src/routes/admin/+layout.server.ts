import { redirect } from "@sveltejs/kit";
import type { APIUser } from "discord-api-types/v10";
import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals, cookies, parent }) => {
    const user = locals.user as APIUser;
    const data = await parent();

    if (!user) {
        return redirect(302, "/");
    } else {
        const accessToken = cookies.get("access_token");
        if (!accessToken) {
            return redirect(302, "/");
        }
        if (!data.checks.isAdmin) {
            return redirect(302, "/");
        }
    }

    return {
        user
    };
}) satisfies LayoutServerLoad;
