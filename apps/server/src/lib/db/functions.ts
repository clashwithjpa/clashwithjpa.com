import { db } from "@/lib/db";
import { cocAccountTable, clanApplicationTable, account, clanInfoTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

export async function getClanTags() {
    const result = await db.select({ cocClanTag: clanInfoTable.cocClanTag }).from(clanInfoTable);

    return result.map((clan) => clan.cocClanTag);
}
