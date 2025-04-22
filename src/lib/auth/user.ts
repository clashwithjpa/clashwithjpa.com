import { PUBLIC_DISCORD_URL } from "$env/static/public";
import { error } from "@sveltejs/kit";
import type { APIUser } from "discord-api-types/v10";

export type UserChecks = {
    inGuild: boolean;
    isAdmin: boolean;
};

export async function getUserData(access_token: string): Promise<APIUser> {
    const userDataResponse = await fetch(`${PUBLIC_DISCORD_URL}/users/@me`, {
        headers: {
            Authorization: `Bearer ${access_token}`
        }
    });
    if (!userDataResponse.ok) {
        error(userDataResponse.status, userDataResponse.statusText);
    }
    let userData: APIUser = await userDataResponse.json();

    return userData;
}

export async function getUserChecks(fetch: any): Promise<UserChecks> {
    const resp = await fetch("/api/user/checks");
    const respData = await resp.json();
    if (!resp.ok) {
        error(resp.status, respData.error);
    }
    return respData as UserChecks;
}

export async function isAdmin(fetch: any): Promise<boolean> {
    const checks = await getUserChecks(fetch);
    return checks.isAdmin;
}
