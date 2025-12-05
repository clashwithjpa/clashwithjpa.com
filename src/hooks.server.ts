import { env } from "$env/dynamic/private";
import { verifyData } from "$lib/auth/jwt";
import type { UserData } from "$lib/auth/user";
import { db } from "$lib/server/db";
import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

const handleRefreshHook: Handle = async ({ event, resolve }) => {
    const accessToken: string | undefined = event.cookies.get("access_token");
    const refreshToken: string | undefined = event.cookies.get("refresh_token");

    if (!accessToken && refreshToken && event.url.pathname !== "/auth/refresh") {
        return redirect(307, "/auth/refresh");
    }

    return resolve(event);
};

const setLocalsHook: Handle = async ({ event, resolve }) => {
    const user: string | undefined = event.cookies.get("user");

    if (user) {
        const data = await verifyData<UserData>(user, env.JWT_SECRET);
        event.locals.user = data;
    }
    event.locals.db = db;

    return resolve(event);
};

export const handle = sequence(handleRefreshHook, setLocalsHook);
