import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import type { UserData } from "$lib/auth/user";
import { checkRole } from "$lib/discord/check";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const isAdmin = (user: UserData | null) => user && user.isAdmin;

export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    const user = locals.user;
    const roleID = url.searchParams.get("id");

    if (!isAdmin(user)) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!roleID) {
        return json({ error: "Role ID not provided" }, { status: 400 });
    }

    const roleData = await checkRole(publicEnv.PUBLIC_DISCORD_URL, env.DISCORD_BOT_TOKEN, locals.db, roleID);
    if ("error" in roleData) {
        return json({ error: true }, { status: 500 });
    }
    return json(roleData);
};
