import { PUBLIC_DISCORD_URL } from "$env/static/public";
import type { APIUser, APIGuild, APIGuildMember } from "discord-api-types/v10";
import info from "../../../data/info.json";
import { error } from "@sveltejs/kit";

export type UserData = APIUser & { inGuild: boolean; isAdmin: boolean };

export async function getUserData(access_token: string): Promise<UserData> {
    const userDataResponse = await fetch(`${PUBLIC_DISCORD_URL}/users/@me`, {
        headers: {
            Authorization: `Bearer ${access_token}`
        }
    });
    if (!userDataResponse.ok) {
        error(userDataResponse.status, userDataResponse.statusText);
    }
    const userData: UserData = await userDataResponse.json();
    const guildDataResponse = await fetch(`${PUBLIC_DISCORD_URL}/users/@me/guilds`, {
        headers: {
            Authorization: `Bearer ${access_token}`
        }
    });
    if (!guildDataResponse.ok) {
        error(guildDataResponse.status, guildDataResponse.statusText);
    }
    const guildData: APIGuild[] = await guildDataResponse.json();
    // Check if user is in guild
    userData.inGuild = guildData.some((guild: APIGuild) => guild.id === info.guildID);
    // If user is in guild, check if they are an admin
    if (userData.inGuild) {
        const userGuildDataResponse = await fetch(`${PUBLIC_DISCORD_URL}/users/@me/guilds/${info.guildID}/member`, {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });
        if (!userGuildDataResponse.ok) {
            error(userGuildDataResponse.status, userGuildDataResponse.statusText);
        }
        const userGuildData: APIGuildMember = await userGuildDataResponse.json();
        userData.isAdmin = userGuildData.roles.some((roleID: string) => info.adminRoleID.includes(roleID));
    }
    return userData;
}
