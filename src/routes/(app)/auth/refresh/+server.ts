import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import { signData } from "$lib/auth/jwt";
import { getUserData } from "$lib/auth/user";
import { getNewAccessToken } from "$lib/cf/helpers";
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies, locals }) => {
    const refreshToken: string | undefined = cookies.get("refresh_token");

    if (!refreshToken) {
        return redirect(302, "/");
    }

    console.log("No access token found, refreshing token...");
    const newToken = await getNewAccessToken(publicEnv.PUBLIC_DISCORD_URL, refreshToken, env.DISCORD_ID, env.DISCORD_SECRET);

    if (newToken) {
        cookies.set("access_token", newToken.access_token, {
            path: "/",
            maxAge: newToken.expires_in,
            sameSite: "lax",
            httpOnly: true
        });
        cookies.set("refresh_token", newToken.refresh_token, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: "lax",
            httpOnly: true
        });

        const userData = await getUserData(newToken.access_token, locals.db);
        const token = await signData(userData, env.JWT_SECRET, `${newToken.expires_in}s`);

        cookies.set("user", token, {
            path: "/",
            maxAge: newToken.expires_in,
            sameSite: "lax",
            httpOnly: true
        });

        console.log("Refreshed token successfully");
    } else {
        console.log("Failed to refresh token");
        cookies.delete("access_token", { path: "/" });
        cookies.delete("refresh_token", { path: "/" });
        cookies.delete("user", { path: "/" });
    }

    return redirect(302, "/");
};
