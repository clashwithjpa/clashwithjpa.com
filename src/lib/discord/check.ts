import { getAdminConfig } from "$lib/server/functions";
import type { APIChannel, APIGuild, APIRole, APIUser } from "discord-api-types/v10";
import * as schema from "$lib/server/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

type DB = NodePgDatabase<typeof schema> & {
    $client: Pool;
};

// Guild check func
export async function checkGuild(baseURI: string, botToken: string, id: string) {
    const resp = await fetch(`${baseURI}/guilds/${id}`, {
        headers: {
            Authorization: `Bot ${botToken}`
        }
    });
    if (!resp.ok) {
        return { error: true };
    }
    return (await resp.json()) as APIGuild;
}

// Role check func
export async function checkRole(baseURI: string, botToken: string, db: DB, role: string) {
    const adminConfig = await getAdminConfig(db);
    const resp = await fetch(`${baseURI}/guilds/${adminConfig.guildId}/roles/${role}`, {
        headers: {
            Authorization: `Bot ${botToken}`
        }
    });
    if (!resp.ok) {
        return { error: true };
    }
    return (await resp.json()) as APIRole;
}

// User check func
export async function checkUser(baseURI: string, botToken: string, id: string) {
    const resp = await fetch(`${baseURI}/users/${id}`, {
        headers: {
            Authorization: `Bot ${botToken}`
        }
    });
    if (!resp.ok) {
        return { error: true };
    }
    return (await resp.json()) as APIUser;
}

// Channel check funcs
export async function checkChannel(baseURI: string, botToken: string, id: string) {
    const resp = await fetch(`${baseURI}/channels/${id}`, {
        headers: {
            Authorization: `Bot ${botToken}`
        }
    });
    if (!resp.ok) {
        return { error: true };
    }
    return (await resp.json()) as APIChannel;
}
