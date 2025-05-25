import { API_TOKEN, DISCORD_BOT_TOKEN } from "$env/static/private";
import { PUBLIC_API_BASE_URI, PUBLIC_DISCORD_URL } from "$env/static/public";
import type { UserData } from "$lib/auth/user";
import { checkClan, getClanWarData } from "$lib/coc/clan";
import { checkChannel, checkRole, checkUser } from "$lib/discord/check";
import { getClansPublicData } from "$lib/server/functions";
import { clanTable, type InsertClan } from "$lib/server/schema";
import { json } from "@sveltejs/kit";
import { eq, inArray } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const isAdmin = (user: UserData | null) => user && user.isAdmin;

interface ClanVerifyPamas {
    clanTag: string;
    leaderID: string;
    channelID: string;
    clanRoleID: string;
    memberRoleID: string;
    elderRoleID: string;
    coleaderRoleID: string;
    leaderRoleID: string;
}

interface NewClanParams extends ClanVerifyPamas {
    clanCode: string;
    attacksRequirement: number;
    donationsRequirement: number;
    clangamesRequirement: number;
}

const verifyClan = async (locals: App.Locals, value: ClanVerifyPamas) => {
    const clanData = await checkClan(PUBLIC_API_BASE_URI, API_TOKEN, value.clanTag);
    if ("error" in clanData) {
        return { error: "Invalid Clan Tag", status: 400 };
    }
    const clanWarData = await getClanWarData(PUBLIC_API_BASE_URI, API_TOKEN, value.clanTag);
    if ("error" in clanWarData) {
        return { error: "Unable to fetch data", status: 400 };
    }

    const leader = await checkUser(PUBLIC_DISCORD_URL, DISCORD_BOT_TOKEN, value.leaderID);
    if ("error" in leader) {
        return { error: "Invalid Leader ID", status: 400 };
    }
    const channel = await checkChannel(PUBLIC_DISCORD_URL, DISCORD_BOT_TOKEN, value.channelID);
    if ("error" in channel) {
        return { error: "Invalid Channel ID", status: 400 };
    }

    for (const role of [value.clanRoleID, value.memberRoleID, value.elderRoleID, value.coleaderRoleID, value.leaderRoleID]) {
        if (role) {
            const roleData = await checkRole(PUBLIC_DISCORD_URL, DISCORD_BOT_TOKEN, locals.db, role);
            if ("error" in roleData) {
                const roleNames = {
                    [value.clanRoleID]: "Clan",
                    [value.memberRoleID]: "Member",
                    [value.elderRoleID]: "Elder",
                    [value.coleaderRoleID]: "Co-Leader",
                    [value.leaderRoleID]: "Leader"
                };
                return {
                    error: `Invalid ${roleNames[role]} Role ID`,
                    status: 400
                };
            }
        }
    }

    return { clanData, clanWarData };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleAddClan = async (locals: App.Locals, value: NewClanParams) => {
    const clan = await verifyClan(locals, value);
    if ("error" in clan) {
        return { error: clan.error, status: clan.status };
    }
    const { clanData, clanWarData } = clan;

    const dbData: InsertClan = {
        clanCode: value.clanCode,
        clanName: clanData.name,
        clanTag: clanData.tag,
        clanLevel: clanData.clanLevel,
        clanRoleID: value.clanRoleID,
        memberRoleID: value.memberRoleID,
        elderRoleID: value.elderRoleID,
        coleaderRoleID: value.coleaderRoleID,
        leaderRoleID: value.leaderRoleID,
        leaderID: value.leaderID,
        channelID: value.channelID,
        attacksRequirement: value.attacksRequirement,
        donationsRequirement: value.donationsRequirement,
        clangamesRequirement: value.clangamesRequirement,
        clanData: clanData,
        clanCurrentWar: clanWarData
    };
    await locals.db.insert(clanTable).values(dbData);
    return clanData;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleClanUpdate = async (locals: App.Locals, value: NewClanParams) => {
    const clan = await verifyClan(locals, value);
    if ("error" in clan) {
        return { error: clan.error, status: clan.status };
    }
    const { clanData, clanWarData } = clan;

    const dbData: InsertClan = {
        clanCode: value.clanCode,
        clanName: clanData.name,
        clanTag: clanData.tag,
        clanLevel: clanData.clanLevel,
        clanRoleID: value.clanRoleID,
        memberRoleID: value.memberRoleID,
        elderRoleID: value.elderRoleID,
        coleaderRoleID: value.coleaderRoleID,
        leaderRoleID: value.leaderRoleID,
        leaderID: value.leaderID,
        channelID: value.channelID,
        attacksRequirement: value.attacksRequirement,
        donationsRequirement: value.donationsRequirement,
        clangamesRequirement: value.clangamesRequirement,
        clanData: clanData,
        clanCurrentWar: clanWarData
    };

    await locals.db.update(clanTable).set(dbData).where(eq(clanTable.clanTag, value.clanTag));
    return clanData;
};

const syncClanData = async (locals: App.Locals) => {
    const clans = await getClansPublicData(locals.db);
    for (let i = 0; i < clans.length; i++) {
        const clan = clans[i];
        const clanData = await checkClan(PUBLIC_API_BASE_URI, API_TOKEN, clan.clanTag);
        const currentWar = await getClanWarData(PUBLIC_API_BASE_URI, API_TOKEN, clan.clanTag);
        if ("error" in clanData) {
            return { error: clanData.error, status: 400 };
        } else if ("error" in currentWar) {
            return { error: currentWar, status: 400 };
        }
        await locals.db.update(clanTable).set({ clanData: clanData, clanCurrentWar: currentWar }).where(eq(clanTable.clanTag, clan.clanTag));
    }
    return { success: true };
};

export const POST: RequestHandler = async ({ locals, request }) => {
    const user = locals.user;
    const body = await request.json();

    if (!isAdmin(user)) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = body;

    if (key === "add_clan") {
        const result = await handleAddClan(locals, value);
        if ("error" in result) {
            return json({ error: result.error }, { status: result.status });
        }
        return json(result);
    } else if (key === "update_clan") {
        const result = await handleClanUpdate(locals, value);
        if ("error" in result) {
            return json({ error: result.error }, { status: result.status });
        }
        return json(result);
    } else if (key === "sync_clans") {
        const res = await syncClanData(locals);
        if ("error" in res) {
            return json({ error: res.error }, { status: 400 });
        }
        return json(res);
    }

    return json({ error: "Invalid key" }, { status: 400 });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
    const user = locals.user;
    const body = await request.json();

    if (!isAdmin(user)) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = body;

    if (key === "remove_clan") {
        await locals.db.delete(clanTable).where(inArray(clanTable.clanTag, value));
        return json({ success: true });
    }

    return json({ error: "Invalid key" }, { status: 400 });
};
