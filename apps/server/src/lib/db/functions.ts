import { db } from "@/lib/db";
import { account, clanApplicationTable, clanInfoTable, cocAccountTable, settingsTable } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function getUserCocAccounts(discordUserId: string) {
    const cocAccounts = await db.select().from(cocAccountTable).where(eq(cocAccountTable.discordUserId, discordUserId));

    return cocAccounts;
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

export async function getClansWithRequirements() {
    const result = await db
        .select({
            cocClanTag: clanInfoTable.cocClanTag,
            requiredAttacks: clanInfoTable.attacksRequirement,
            requiredClangames: clanInfoTable.clangamesRequirement,
            requiredDonations: clanInfoTable.donationsRequirement,
        })
        .from(clanInfoTable);

    return result.map((clan) => ({
        [clan.cocClanTag]: {
            requiredAttacks: clan.requiredAttacks,
            requiredClangames: clan.requiredClangames,
            requiredDonations: clan.requiredDonations,
        },
    }));
}

export async function getRules(): Promise<string | null> {
    const result = await db.select({ rulesContent: settingsTable.rulesContent }).from(settingsTable).limit(1);

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
