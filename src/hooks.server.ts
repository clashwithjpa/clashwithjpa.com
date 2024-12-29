import type { UserData } from "$lib/auth/user";
import { db } from "$lib/server/db";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

const handleRefreshHook: Handle = async ({ event, resolve }) => {
    const accessToken: string | undefined = event.cookies.get("access_token");
    const refreshToken: string | undefined = event.cookies.get("refresh_token");

    if (!accessToken && refreshToken) {
        console.log("No access token, but refresh token found. Attempting to refresh...");
        await fetch(`/auth/refresh`, { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
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
