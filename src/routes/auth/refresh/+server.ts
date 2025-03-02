import { DISCORD_ID, DISCORD_SECRET, JWT_SECRET } from "$env/static/private";
import { PUBLIC_DISCORD_URL } from "$env/static/public";
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
    const newToken = await getNewAccessToken(PUBLIC_DISCORD_URL, refreshToken, DISCORD_ID, DISCORD_SECRET);

    if (newToken) {
        cookies.delete("access_token", { path: "/" });
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
        const token = await signData(userData, JWT_SECRET, `${newToken.expires_in}s`);

        cookies.set("user", token, {
            path: "/",
            maxAge: newToken.expires_in,
            sameSite: "lax",
            httpOnly: true
        });

        console.log("Refreshed token successfully");
    }

    return redirect(302, "/");
};
