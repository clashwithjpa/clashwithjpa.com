import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { DISCORD_ID, DISCORD_SECRET } from "$env/static/private";
import { PUBLIC_DISCORD_URL } from "$env/static/public";

export const GET: RequestHandler = async ({ fetch, url, cookies }) => {
    const code = url.searchParams.get("code");
    if (!code) {
        error(400, "No code provided");
    }

    try {
        const resp = await fetch(`${PUBLIC_DISCORD_URL}/oauth2/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                client_id: DISCORD_ID,
                client_secret: DISCORD_SECRET,
                grant_type: "authorization_code",
                code,
                redirect_uri: `${url.origin}/auth/callback`
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

                return new Response("Returning to homepage", {
                    status: 302,
                    headers: {
                        Location: "/"
                    }
                });
            } else {
                error(500, "Failed to get user data");
            }
        } else {
            error(resp.status, await resp.text());
        }
    } catch (e) {
        console.error(e);
        error(500, "Failed to get tokens");
    }
};
