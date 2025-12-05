import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import { getPlayerInfo } from "$lib/coc/player";
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    const user = locals.user;
    const tag = url.searchParams.get("tag");

    if (!tag) {
        return json({ error: "Missing Player Tag" }, { status: 400 });
    }

    const playerInfo = await getPlayerInfo(publicEnv.PUBLIC_API_BASE_URI, env.API_TOKEN, tag);

    return json(playerInfo);
};
