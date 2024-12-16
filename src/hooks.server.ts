import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

const protectedRoutes = ["/cwl"];

const protectRoutesHook: Handle = async ({ event, resolve }) => {
    if (protectedRoutes.some((route) => event.url.pathname.startsWith(route))) {
        const refreshToken: string | undefined = event.cookies.get("refresh_token");

        if (!refreshToken) {
            throw redirect(303, "/auth/login");
        }
    }

	return resolve(event);
};

const handleRefreshHook: Handle = async ({ event, resolve }) => {
    const accessToken: string | undefined = event.cookies.get("access_token");
    const refreshToken: string | undefined = event.cookies.get("refresh_token");

    console.log(event.cookies.getAll());

    if (!accessToken && refreshToken) {
        await fetch(`/auth/refresh`, { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
    }

    return resolve(event);
}

export const handle = sequence(protectRoutesHook, handleRefreshHook);