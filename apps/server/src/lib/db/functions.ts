import { db } from "@/lib/db";
import { account, clanApplicationTable, clanInfoTable, cocAccountTable, cwlApplicationTable, cwlClanInfoTable, settingsTable } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function getUserCocAccounts(discordUserId: string) {
    const cocAccounts = await db.select().from(cocAccountTable).where(eq(cocAccountTable.discordUserId, discordUserId));

    return cocAccounts;
}

export async function getCocAccountOwner(cocAccountTag: string) {
    const result = await db
        .select({ discordUserId: cocAccountTable.discordUserId })
        .from(cocAccountTable)
        .where(eq(cocAccountTable.cocAccountTag, cocAccountTag))
        .limit(1);

    return result[0]?.discordUserId ?? null;
}

export async function getDiscordAccountId(userId: string): Promise<string | null> {
    const result = await db
        .select({ accountId: account.accountId })
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, "discord")))
        .limit(1);

    return result[0]?.accountId ?? null;
}

export async function addCocAccount(discordUserId: string, cocAccountTag: string) {
    const result = await db.insert(cocAccountTable).values({ discordUserId, cocAccountTag }).returning();

    return result[0];
}

export async function addClanApplication(discordUserId: string, cocAccountTag: string, cocAccountData: unknown) {
    const result = await db.insert(clanApplicationTable).values({ discordUserId, cocAccountTag, cocAccountData }).returning();

    return result[0];
}

export async function getClans() {
    const result = await db.select().from(clanInfoTable);
    return Object.fromEntries(
        result.map(({ id, ...clan }) => [
            clan.cocClanTag,
            {
                clanTag: clan.cocClanTag,
                clanCode: clan.cocClanCode,
                clanName: clan.cocClanName,
                clanLevel: clan.cocClanLevel,
                discord: {
                    clanRoleId: clan.discordClanRoleId,
                    clanChannelId: clan.discordClanChannelId,
                    memberRoleId: clan.discordMemberRoleId,
                    elderRoleId: clan.discordElderRoleId,
                    coleaderRoleId: clan.discordColeaderRoleId,
                    leaderRoleId: clan.discordLeaderRoleId,
                    leaderId: clan.discordLeaderId,
                },
                requirements: {
                    attacks: clan.attacksRequirement,
                    clangames: clan.clangamesRequirement,
                    donations: clan.donationsRequirement,
                },
            },
        ]),
    );
}

export async function getClansWithRequirements() {
    const result = await db
        .select({
            cocClanTag: clanInfoTable.cocClanTag,
            requiredAttacks: clanInfoTable.attacksRequirement,
            requiredClangames: clanInfoTable.clangamesRequirement,
            requiredDonations: clanInfoTable.donationsRequirement,
        })
        .from(clanInfoTable);

    return Object.fromEntries(
        result.map((clan) => [
            clan.cocClanTag,
            {
                requiredAttacks: clan.requiredAttacks,
                requiredClangames: clan.requiredClangames,
                requiredDonations: clan.requiredDonations,
            },
        ]),
    );
}

export async function getRules(): Promise<string | null> {
    // Descending order by updatedAt to get the latest rules content
    const result = await db.select({ rulesContent: settingsTable.rulesContent }).from(settingsTable).orderBy(desc(settingsTable.updatedAt)).limit(1);

    return result[0]?.rulesContent ?? null;
}

export async function setRules(rulesContent: string): Promise<string> {
    const result = await db
        .insert(settingsTable)
        .values({ rulesContent, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: settingsTable.id,
            set: { rulesContent, updatedAt: new Date() },
        })
        .returning({ rulesContent: settingsTable.rulesContent });

    return result[0]!.rulesContent!;
}

export async function addCwlApplication(data: {
    discordUserId: string;
    discordUsername: string;
    cocAccountName: string;
    cocAccountTag: string;
    cocAccountClan: string;
    cocAccountWeight: number;
    isAlt: boolean;
    preferenceNum: number;
}) {
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const year = now.getFullYear();

    const result = await db
        .insert(cwlApplicationTable)
        .values({
            ...data,
            month,
            year,
        })
        .returning();

    return result[0];
}

export async function getUserCwlApplications(discordUserId: string) {
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const year = now.getFullYear();

    const applications = await db
        .select()
        .from(cwlApplicationTable)
        .where(and(eq(cwlApplicationTable.discordUserId, discordUserId), eq(cwlApplicationTable.month, month), eq(cwlApplicationTable.year, year)));

    return applications;
}

export async function getCwlClans() {
    const result = await db.select().from(cwlClanInfoTable);
    return Object.fromEntries(
        result.map((clan) => [
            clan.cocClanTag,
            {
                clanTag: clan.cocClanTag,
                clanName: clan.cocClanName,
                clanLeague: clan.cocClanLeague,
                clanLeader: clan.cocClanLeader,
                email: clan.email,
            },
        ]),
    );
}
