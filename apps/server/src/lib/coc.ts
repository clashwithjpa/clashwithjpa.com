import type { APIGuildMember } from "discord-api-types/v10";
import type { RESTGetAPIGuildMemberResult } from "discord-api-types/v10";

interface CheckUserInGuildResult {
    exists: boolean;
    member?: APIGuildMember;
    roles?: string[];
    error?: string;
}

/**
 * Checks if a user exists in a Discord guild and retrieves their roles
 * @param guildId - The Discord guild (server) ID
 * @param userId - The Discord user ID to check
 * @param botToken - Discord bot token for authentication (optional if using env var)
 * @returns Result containing user existence, member data, and roles
 */
export async function checkUserInGuild(guildId: string, userId: string, botToken?: string): Promise<CheckUserInGuildResult> {
    const token = botToken || process.env.JPA_DISCORD_BOT_TOKEN;

    if (!token) {
        return {
            exists: false,
            error: "Discord bot token not provided",
        };
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
            method: "GET",
            headers: {
                Authorization: `Bot ${token}`,
                "Content-Type": "application/json",
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

/**
 * Checks if a user has specific role(s) in a Discord guild
 * @param guildId - The Discord guild ID
 * @param userId - The Discord user ID
 * @param roleIds - Single role ID or array of role IDs to check
 * @param botToken - Discord bot token (optional if using env var)
 * @returns Object indicating if user has all roles, any role, and which roles they have
 */
export async function checkUserRoles(
    guildId: string,
    userId: string,
    roleIds: string | string[],
    botToken?: string,
): Promise<{
    hasAllRoles: boolean;
    hasAnyRole: boolean;
    userRoles: string[];
    matchingRoles: string[];
    error?: string;
}> {
    const result = await checkUserInGuild(guildId, userId, botToken);

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
