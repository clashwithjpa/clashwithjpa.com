import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { PUBLIC_API_BASE_URI } from "$env/static/public";
import { API_TOKEN } from "$env/static/private";
import type { PlayerRoot } from "$lib/clans/types";

export const GET: RequestHandler = async ({ params, cookies }) => {
    if (!cookies.get("access_token")) {
        return json(
            {
                success: false,
                error: "not_authenticated"
            },
            {
                status: 401
            }
        );
    }

    const playerTag = params.id;
    const url = new URL(`${PUBLIC_API_BASE_URI}/v1/players/${encodeURIComponent(playerTag)}`);

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${API_TOKEN}`
        }
    });

    if (!response.ok) {
        return json(
            {
                success: false,
                error: response.statusText
            },
            {
                status: response.status
            }
        );
    }

    const data = await response.json();
    return json(data as PlayerRoot);
};
