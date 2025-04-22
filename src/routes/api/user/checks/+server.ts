import { PUBLIC_DISCORD_URL } from "$env/static/public";
import type { UserChecks } from "$lib/auth/user";
import { getAdminConfig } from "$lib/server/functions";
import { json } from "@sveltejs/kit";
import type { APIGuild, APIGuildMember } from "discord-api-types/v10";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, cookies, setHeaders }) => {
    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    const user = locals.user;
    const accessToken = cookies.get("access_token");
    if (!user || !accessToken) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    let checks: UserChecks = { inGuild: false, isAdmin: false };
    const adminConfig = await getAdminConfig(locals.db);

    const guildDataResponse = await fetch(`${PUBLIC_DISCORD_URL}/users/@me/guilds`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    if (!guildDataResponse.ok) {
        return json({ error: guildDataResponse.statusText }, { status: guildDataResponse.status });
    }
    const guildData: APIGuild[] = await guildDataResponse.json();

    checks.inGuild = guildData.some((guild: APIGuild) => guild.id === adminConfig.guildId);
    if (checks.inGuild) {
        const userGuildDataResponse = await fetch(`${PUBLIC_DISCORD_URL}/users/@me/guilds/${adminConfig.guildId}/member`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        if (!userGuildDataResponse.ok) {
            return json({ error: userGuildDataResponse.statusText }, { status: userGuildDataResponse.status });
        }
        const userGuildData: APIGuildMember = await userGuildDataResponse.json();

        const adminMembers = adminConfig.adminMembersId;
        const adminRoles = adminConfig.adminRolesId;

        checks.isAdmin = adminMembers.includes(user.id) || userGuildData.roles.some((roleID: string) => adminRoles.includes(roleID));
    }

    return json(checks);
};
