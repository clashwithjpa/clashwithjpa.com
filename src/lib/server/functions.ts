import { DISCORD_BOT_TOKEN } from "$env/static/private";
import { PUBLIC_DISCORD_URL } from "$env/static/public";
import * as schema from "$lib/server/schema";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { and, desc, eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

const HEADERS = {
    "Content-Type": "application/json",
    Authorization: `Bot ${DISCORD_BOT_TOKEN}`
};

const GUILD_ID = "1029993902503108678";
const VERIFIED_MEMBER_ROLE_ID = "1252896435913883760";

export type DB = NeonHttpDatabase<typeof schema> & {
    $client: NeonQueryFunction<false, false>;
};

export async function isApplicationEnabled(db: DB) {
    const status = await db.query.settingsTable.findFirst({
        where: eq(schema.settingsTable.key, "applications_enabled")
    });
    return status?.value as boolean;
}

export async function isCWLEnabled(db: DB) {
    const status = await db.query.settingsTable.findFirst({
        where: eq(schema.settingsTable.key, "cwl_enabled")
    });
    return status?.value as boolean;
}

export async function createClanApplication(db: DB, data: schema.InsertClanApplication) {
    await db.insert(schema.clanApplicationTable).values(data);
}

export async function getApplications(db: DB) {
    return db.query.clanApplicationTable.findMany();
}

export async function getClanApplicationFromTag(db: DB, tag: schema.SelectClanApplication["tag"]) {
    return db.query.clanApplicationTable.findFirst({
        where: eq(schema.clanApplicationTable.tag, tag)
    });
}

export async function getClanApplicationFromDiscordId(db: DB, discordId: schema.SelectClanApplication["discordId"]) {
    return db.query.clanApplicationTable.findMany({
        where: eq(schema.clanApplicationTable.discordId, discordId)
    });
}

async function addRole(guildId: string, roleId: string, userId: string) {
    const response = await fetch(`${PUBLIC_DISCORD_URL}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
        method: "PUT",
        headers: HEADERS
    });
    if (!response.ok) {
        throw new Error(`Failed to add role: ${response.statusText}`);
    }
}

export async function acceptApplication(db: DB, tag: schema.SelectClanApplication["tag"], discordId: schema.SelectUser["discordId"]) {
    await db.update(schema.clanApplicationTable).set({ status: "accepted" }).where(eq(schema.clanApplicationTable.tag, tag));
    await db.insert(schema.userTable).values({ discordId: discordId }).onConflictDoNothing({ target: schema.userTable.discordId });
    await db.insert(schema.cocTable).values({ userId: discordId, tag: tag });
    await addRole(GUILD_ID, VERIFIED_MEMBER_ROLE_ID, discordId);
}

export async function rejectApplication(db: DB, tag: schema.SelectClanApplication["tag"]) {
    await db.update(schema.clanApplicationTable).set({ status: "rejected" }).where(eq(schema.clanApplicationTable.tag, tag));
}

export async function deleteApplication(db: DB, tag: schema.SelectClanApplication["tag"], discordId: schema.SelectUser["discordId"]) {
    await db
        .delete(schema.clanApplicationTable)
        .where(and(eq(schema.clanApplicationTable.tag, tag), eq(schema.clanApplicationTable.discordId, discordId)));
}

export async function getClansPublicData(db: DB) {
    return db.query.clanTable.findMany({
        orderBy: desc(schema.clanTable.clanLevel)
    });
}

/**
 * Use this function only for saving clan names where the clan names are not checked against the database because the "Other" entry is not in the database.
 */
export async function getClanNames(db: DB) {
    let dbClanNames = await db.query.clanTable.findMany({
        orderBy: desc(schema.clanTable.clanLevel),
        columns: {
            clanName: true
        }
    });
    dbClanNames.push({
        clanName: "Other"
    });
    return dbClanNames.map((clan) => clan.clanName);
}

export async function getRules(db: DB) {
    const rules = await db.query.settingsTable.findFirst({
        where: eq(schema.settingsTable.key, "rules")
    });
    return JSON.parse(JSON.stringify(rules)).value;
}

export async function getAdminConfig(db: DB) {
    const adminRolesId = await db.query.settingsTable.findFirst({
        where: eq(schema.settingsTable.key, "admin_roles_id")
    });
    const adminMembersId = await db.query.settingsTable.findFirst({
        where: eq(schema.settingsTable.key, "admin_members_id")
    });
    const guildId = await db.query.settingsTable.findFirst({
        where: eq(schema.settingsTable.key, "guild_id")
    });

    return {
        adminRolesId: adminRolesId?.value as string[],
        adminMembersId: adminMembersId?.value as string[],
        // @ts-expect-error annoying
        guildId: guildId?.value.id as string
    };
}

export async function getUsers(db: DB) {
    return db.query.userTable.findMany({
        orderBy: desc(schema.userTable.discordId),
        with: {
            cocAccounts: true
        }
    });
}

export async function getUserAccounts(db: DB, discordId: schema.SelectUser["discordId"]) {
    return db.query.userTable.findFirst({
        where: eq(schema.userTable.discordId, discordId),
        with: {
            cocAccounts: true
        }
    });
}

export async function getAllCWLApplications(db: DB) {
    return db.query.cwlTable.findMany();
}

export async function getCWLApplications(db: DB, discordId: schema.SelectCWL["userId"]) {
    return db.query.cwlTable.findMany({
        where: eq(schema.cwlTable.userId, discordId)
    });
}

export async function getCWLApplicationByTag(db: DB, tag: schema.SelectCWL["accountTag"], month: string, year: number) {
    return db.query.cwlTable.findFirst({
        where: and(eq(schema.cwlTable.accountTag, tag), eq(schema.cwlTable.month, month), eq(schema.cwlTable.year, year))
    });
}

export async function insertCWLApplication(db: DB, data: schema.InsertCWL) {
    await db.insert(schema.cwlTable).values(data);
}
