import { db } from "@/lib/db";
import {
    account,
    clanApplicationStatusEnum,
    clanApplicationTable,
    clanInfoTable,
    cocAccountTable,
    cwlApplicationTable,
    cwlClanInfoTable,
    settingsTable,
    user,
} from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

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

export class MissingDiscordAccountError extends Error {
    constructor(discordUserId: string) {
        super(`Discord account ${discordUserId} is no longer linked`);
        this.name = "MissingDiscordAccountError";
    }
}

type ClanApplicationStatus = (typeof clanApplicationStatusEnum.enumValues)[number];

export async function getClanApplications(opts: { status?: ClanApplicationStatus; limit?: number; offset?: number } = {}) {
    const { status, limit = 50, offset = 0 } = opts;

    const whereClause = status ? eq(clanApplicationTable.status, status) : undefined;

    const [rows, countResult] = await Promise.all([
        db.select().from(clanApplicationTable).where(whereClause).orderBy(desc(clanApplicationTable.createdAt)).limit(limit).offset(offset),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(clanApplicationTable)
            .where(whereClause),
    ]);

    return { applications: rows, total: countResult[0]?.count ?? 0 };
}

export async function updateClanApplicationStatus(id: number, status: ClanApplicationStatus) {
    return db.transaction(async (tx) => {
        const [existing] = await tx.select().from(clanApplicationTable).where(eq(clanApplicationTable.id, id));
        if (!existing) return null;

        if (status === "accepted" && existing.status !== "accepted") {
            const [acct] = await tx
                .select({ userId: account.userId })
                .from(account)
                .where(and(eq(account.accountId, existing.discordUserId), eq(account.providerId, "discord")))
                .limit(1);

            if (!acct) {
                throw new MissingDiscordAccountError(existing.discordUserId);
            }

            await tx
                .insert(cocAccountTable)
                .values({ discordUserId: existing.discordUserId, cocAccountTag: existing.cocAccountTag })
                .onConflictDoNothing({ target: cocAccountTable.cocAccountTag });

            await tx
                .update(user)
                .set({ role: "verified" })
                .where(and(eq(user.id, acct.userId), eq(user.role, "unverified")));
        } else if (existing.status === "accepted" && status !== "accepted") {
            await tx.delete(cocAccountTable).where(eq(cocAccountTable.cocAccountTag, existing.cocAccountTag));

            const [{ count } = { count: 0 }] = await tx
                .select({ count: sql<number>`count(*)::int` })
                .from(cocAccountTable)
                .where(eq(cocAccountTable.discordUserId, existing.discordUserId));

            if (count === 0) {
                const [acct] = await tx
                    .select({ userId: account.userId })
                    .from(account)
                    .where(and(eq(account.accountId, existing.discordUserId), eq(account.providerId, "discord")))
                    .limit(1);
                if (acct) {
                    await tx
                        .update(user)
                        .set({ role: "unverified" })
                        .where(and(eq(user.id, acct.userId), eq(user.role, "verified")));
                }
            }
        }

        const [updated] = await tx.update(clanApplicationTable).set({ status }).where(eq(clanApplicationTable.id, id)).returning();
        return updated ?? null;
    });
}

export async function getAllCwlApplications(
    opts: { month?: string; year?: number; assignedTo?: string | null; limit?: number; offset?: number } = {},
) {
    const { month, year, assignedTo, limit = 50, offset = 0 } = opts;

    const conditions = [];
    if (month) conditions.push(eq(cwlApplicationTable.month, month));
    if (year !== undefined) conditions.push(eq(cwlApplicationTable.year, year));
    if (assignedTo === null) conditions.push(sql`${cwlApplicationTable.assignedTo} IS NULL`);
    else if (assignedTo) conditions.push(eq(cwlApplicationTable.assignedTo, assignedTo));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
        db.select().from(cwlApplicationTable).where(whereClause).orderBy(desc(cwlApplicationTable.appliedAt)).limit(limit).offset(offset),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(cwlApplicationTable)
            .where(whereClause),
    ]);

    return { applications: rows, total: countResult[0]?.count ?? 0 };
}

export async function assignCwlApplication(id: number, clanTag: string | null) {
    const result = await db.update(cwlApplicationTable).set({ assignedTo: clanTag }).where(eq(cwlApplicationTable.id, id)).returning();
    return result[0] ?? null;
}

export async function getSettings() {
    const result = await db.select().from(settingsTable).orderBy(desc(settingsTable.updatedAt)).limit(1);
    return result[0] ?? null;
}

export async function updateSettings(values: {
    applicationsEnabled?: boolean;
    cwlEnabled?: boolean;
    siteMaintenanceMode?: boolean;
    guildId?: string | null;
}) {
    const existing = await db.select({ id: settingsTable.id }).from(settingsTable).limit(1);
    if (existing[0]) {
        const result = await db
            .update(settingsTable)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(settingsTable.id, existing[0].id))
            .returning();
        return result[0]!;
    }
    const result = await db
        .insert(settingsTable)
        .values({ ...values, updatedAt: new Date() })
        .returning();
    return result[0]!;
}

export async function getAllClans() {
    return db.select().from(clanInfoTable).orderBy(clanInfoTable.cocClanCode);
}

export async function createClan(values: typeof clanInfoTable.$inferInsert) {
    const result = await db.insert(clanInfoTable).values(values).returning();
    return result[0]!;
}

export async function updateClan(id: number, values: Partial<typeof clanInfoTable.$inferInsert>) {
    const result = await db.update(clanInfoTable).set(values).where(eq(clanInfoTable.id, id)).returning();
    return result[0] ?? null;
}

export async function deleteClan(id: number) {
    const result = await db.delete(clanInfoTable).where(eq(clanInfoTable.id, id)).returning();
    return result[0] ?? null;
}

export async function getAllCwlClans() {
    return db.select().from(cwlClanInfoTable).orderBy(cwlClanInfoTable.cocClanTag);
}

export async function createCwlClan(values: typeof cwlClanInfoTable.$inferInsert) {
    const result = await db.insert(cwlClanInfoTable).values(values).returning();
    return result[0]!;
}

export async function updateCwlClan(clanTag: string, values: Partial<typeof cwlClanInfoTable.$inferInsert>) {
    const result = await db.update(cwlClanInfoTable).set(values).where(eq(cwlClanInfoTable.cocClanTag, clanTag)).returning();
    return result[0] ?? null;
}

export async function deleteCwlClan(clanTag: string) {
    const result = await db.delete(cwlClanInfoTable).where(eq(cwlClanInfoTable.cocClanTag, clanTag)).returning();
    return result[0] ?? null;
}

export async function getCocAccountsForUser(userId: string) {
    const discordId = await getDiscordAccountId(userId);
    if (!discordId) return [];
    return db.select().from(cocAccountTable).where(eq(cocAccountTable.discordUserId, discordId));
}
