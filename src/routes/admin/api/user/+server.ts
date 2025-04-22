import { DISCORD_BOT_TOKEN } from "$env/static/private";
import { PUBLIC_DISCORD_URL } from "$env/static/public";
import { isAdmin } from "$lib/auth/user";
import { checkUser } from "$lib/discord/check";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, setHeaders, fetch }) => {
    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    const admin = await isAdmin(fetch);
    const userID = url.searchParams.get("id");

    if (!admin) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!userID) {
        return json({ error: "User ID not provided" }, { status: 400 });
    }

    const userData = await checkUser(PUBLIC_DISCORD_URL, DISCORD_BOT_TOKEN, userID);
    if ("error" in userData) {
        return json({ error: true }, { status: 500 });
    }
    return json(userData);
};
