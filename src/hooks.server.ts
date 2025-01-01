import type { UserData } from "$lib/auth/user";
import { db } from "$lib/server/db";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { DISCORD_ID, DISCORD_SECRET } from "$env/static/private";
import { PUBLIC_DISCORD_URL } from "$env/static/public";
import { getNewAccessToken } from "$lib/helpers";
import { getUserData } from "$lib/auth/user";

const handleRefreshHook: Handle = async ({ event, resolve }) => {
    const accessToken: string | undefined = event.cookies.get("access_token");
    const refreshToken: string | undefined = event.cookies.get("refresh_token");

    if (!accessToken && refreshToken) {
        console.log("No access token, but refresh token found. Attempting to refresh...");
        const newToken = await getNewAccessToken(PUBLIC_DISCORD_URL, refreshToken, DISCORD_ID, DISCORD_SECRET);

        if (newToken) {
            event.cookies.set("access_token", newToken.access_token, {
                path: "/",
                maxAge: newToken.expires_in,
                sameSite: "lax",
                httpOnly: true
            });
            event.cookies.set("refresh_token", newToken.refresh_token, {
                path: "/",
                maxAge: 60 * 60 * 24 * 365, // 1 year
                sameSite: "lax",
                httpOnly: true
            });

            const userData = await getUserData(newToken.access_token);
            event.cookies.set("user", JSON.stringify(userData), {
                path: "/",
                maxAge: newToken.expires_in,
                sameSite: "lax",
                httpOnly: true
            });

            console.log("Refreshed token successfully");
        }
    }

    return resolve(event);
};

const setLocalsHook: Handle = async ({ event, resolve }) => {
    const user: string | undefined = event.cookies.get("user");

    if (user) {
        event.locals.user = JSON.parse(user) as UserData;
    }
    event.locals.db = db;

    return resolve(event);
};

export const handle = sequence(handleRefreshHook, setLocalsHook);
