import type { APIGuildMember } from "discord-api-types/v10";
import type { RESTGetAPIGuildMemberResult } from "discord-api-types/v10";
import { config } from "@/lib/config";

interface CheckUserInGuildResult {
    exists: boolean;
    member?: APIGuildMember;
    roles?: string[];
    error?: string;
}

export async function checkUserInGuild(guildId: string, userId: string): Promise<CheckUserInGuildResult> {
    const token = config.JPA_DISCORD_BOT_TOKEN;

    if (!token) {
        return {
            exists: false,
            error: "Discord bot token not provided",
        };
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
            headers: {
                Authorization: `Bot ${token}`,
            },
        });

        if (response.status === 404) {
            return {
                exists: false,
                error: "User not found in guild",
            };
        }

        if (!response.ok) {
            const errorText = await response.text();
            return {
                exists: false,
                error: `Discord API error: ${response.status} - ${errorText}`,
            };
        }

        const member = (await response.json()) as RESTGetAPIGuildMemberResult;

        return {
            exists: true,
            member,
            roles: member.roles,
        };
    } catch (error) {
        return {
            exists: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}

export async function checkUserRoles(
    guildId: string,
    userId: string,
    roleIds: string | string[],
): Promise<{
    hasAllRoles: boolean;
    hasAnyRole: boolean;
    userRoles: string[];
    matchingRoles: string[];
    error?: string;
}> {
    const result = await checkUserInGuild(guildId, userId);

    if (!result.exists || result.error) {
        return {
            hasAllRoles: false,
            hasAnyRole: false,
            userRoles: [],
            matchingRoles: [],
            error: result.error,
        };
    }

    const userRoles = result.roles || [];
    const targetRoles = Array.isArray(roleIds) ? roleIds : [roleIds];
    const matchingRoles = targetRoles.filter((roleId) => userRoles.includes(roleId));

    return {
        hasAllRoles: matchingRoles.length === targetRoles.length,
        hasAnyRole: matchingRoles.length > 0,
        userRoles,
        matchingRoles,
    };
}

export async function checkJPAMember(userId: string): Promise<{
    isAuthorized: boolean;
    userRoles: string[];
    matchingRoles: string[];
    error?: string;
}> {
    const GUILD_ID = "1029993902503108678";
    const REQUIRED_ROLE_IDS = ["1252896435913883760", "1367750139527168020", "1030004174148087878"];

    const result = await checkUserRoles(GUILD_ID, userId, REQUIRED_ROLE_IDS);

    return {
        isAuthorized: result.hasAnyRole,
        userRoles: result.userRoles,
        matchingRoles: result.matchingRoles,
        error: result.error,
    };
}
