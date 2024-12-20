import { PUBLIC_DISCORD_URL } from "$env/static/public";
import { DISCORD_ID, DISCORD_SECRET } from "$env/static/private";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ url, request, cookies }) => {
    const { refresh_token: refreshToken } = await request.json();
    if (!refreshToken) {
        error(400, "No refresh token provided");
    }

    const resp = await fetch(`${PUBLIC_DISCORD_URL}/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            client_id: DISCORD_ID,
            client_secret: DISCORD_SECRET,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }).toString()
    });

    if (resp.ok) {
        const { access_token, refresh_token, expires_in } = await resp.json();

        cookies.set("access_token", access_token, {
            path: "/",
            maxAge: expires_in,
            sameSite: "lax",
            httpOnly: true
        });

        cookies.set("refresh_token", refresh_token, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: "lax",
            httpOnly: true
        });

        const userResp = await fetch(`/auth/user`);
        if (userResp.ok) {
            const userData = await userResp.json();
            cookies.set("user", JSON.stringify(userData), {
                path: "/",
                maxAge: expires_in,
                sameSite: "lax",
                httpOnly: true
            });

            return new Response("", {
                status: 307,
                headers: {
                    Location: "/"
                }
            });
        } else {
            error(userResp.status, await userResp.text());
        }
    } else {
        error(resp.status, await resp.text());
    }
};
