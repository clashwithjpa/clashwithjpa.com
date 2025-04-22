import { API_TOKEN } from "$env/static/private";
import { PUBLIC_API_BASE_URI } from "$env/static/public";
import { isAdmin } from "$lib/auth/user";
import { getPlayerInfo } from "$lib/coc/player";
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, setHeaders, fetch }) => {
    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    const admin = await isAdmin(fetch);
    const tag = url.searchParams.get("tag");

    if (!admin) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!tag) {
        return json({ error: "Missing Player Tag" }, { status: 400 });
    }

    const playerInfo = await getPlayerInfo(PUBLIC_API_BASE_URI, API_TOKEN, tag);

    return json(playerInfo);
};
