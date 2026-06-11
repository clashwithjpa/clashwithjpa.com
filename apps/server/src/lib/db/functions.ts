import { cocClient } from "@/lib/coc";
import { db } from "@/lib/db";
import {
    account,
    auditLogTable,
    clanApplicationStatusEnum,
    clanApplicationTable,
    clanInfoTable,
    cocAccountTable,
    cwlApplicationTable,
    cwlBonusTable,
    cwlClanInfoTable,
    cwlSeasonTable,
    settingsTable,
    user,
} from "@/lib/db/schema";
import { and, asc, desc, eq, getTableColumns, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

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

export async function addCocAccount(discordUserId: string, cocAccountTag: string, opts: { warWeight?: number; isExternal?: boolean } = {}) {
    const result = await db
        .insert(cocAccountTable)
        .values({ discordUserId, cocAccountTag, warWeight: opts.warWeight, isExternal: opts.isExternal })
        .returning();

    return result[0];
}

export async function addClanApplication(discordUserId: string, cocAccountTag: string, cocAccountData: unknown) {
    const result = await db.insert(clanApplicationTable).values({ discordUserId, cocAccountTag, cocAccountData }).returning();

    return result[0]!;
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
    cocAccountClan: string | null;
    preferenceNum: number;
    seasonId: number;
}) {
    const result = await db.insert(cwlApplicationTable).values(data).returning();
    return result[0]!;
}

// Shared CWL application projection. isExternal is derived from the linked CoC
// account via the cwl_application_table.cocAccountTag -> coc_account_table FK,
// replacing the old per-application isAlt flag.
const cwlApplicationColumns = {
    id: cwlApplicationTable.id,
    discordUserId: cwlApplicationTable.discordUserId,
    discordUsername: cwlApplicationTable.discordUsername,
    cocAccountName: cwlApplicationTable.cocAccountName,
    cocAccountTag: cwlApplicationTable.cocAccountTag,
    cocAccountClan: cwlApplicationTable.cocAccountClan,
    cocAccountWeight: sql<number>`coalesce(${cocAccountTable.warWeight}, 0)`,
    isExternal: sql<boolean>`coalesce(${cocAccountTable.isExternal}, false)`,
    seasonId: cwlApplicationTable.seasonId,
    seasonName: cwlSeasonTable.name,
    month: cwlSeasonTable.month,
    year: cwlSeasonTable.year,
    preferenceNum: cwlApplicationTable.preferenceNum,
    appliedAt: cwlApplicationTable.appliedAt,
    assignedTo: cwlApplicationTable.assignedTo,
};

export async function getUserCwlApplications(discordUserId: string) {
    const applications = await db
        .select(cwlApplicationColumns)
        .from(cwlApplicationTable)
        .leftJoin(cocAccountTable, eq(cocAccountTable.cocAccountTag, cwlApplicationTable.cocAccountTag))
        .leftJoin(cwlSeasonTable, eq(cwlSeasonTable.id, cwlApplicationTable.seasonId))
        .where(eq(cwlApplicationTable.discordUserId, discordUserId));

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

    // Resolve the applicant's Discord profile (avatar/name) and site role by joining
    // the better-auth account table (discordUserId is the Discord accountId) to the user.
    const [rows, countResult] = await Promise.all([
        db
            .select({
                id: clanApplicationTable.id,
                cocAccountTag: clanApplicationTable.cocAccountTag,
                cocAccountData: clanApplicationTable.cocAccountData,
                discordUserId: clanApplicationTable.discordUserId,
                status: clanApplicationTable.status,
                createdAt: clanApplicationTable.createdAt,
                image: user.image,
                discordUsername: user.name,
                discordRole: user.role,
            })
            .from(clanApplicationTable)
            .leftJoin(account, eq(account.accountId, clanApplicationTable.discordUserId))
            .leftJoin(user, eq(user.id, account.userId))
            .where(whereClause)
            .orderBy(desc(clanApplicationTable.createdAt))
            .limit(limit)
            .offset(offset),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(clanApplicationTable)
            .where(whereClause),
    ]);

    return { applications: rows, total: countResult[0]?.count ?? 0 };
}

export async function deleteClanApplication(id: number) {
    const [deleted] = await db.delete(clanApplicationTable).where(eq(clanApplicationTable.id, id)).returning();
    return deleted ?? null;
}

export async function deleteAcceptedClanApplications() {
    const deleted = await db
        .delete(clanApplicationTable)
        .where(eq(clanApplicationTable.status, "accepted"))
        .returning({ id: clanApplicationTable.id });
    return deleted.length;
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

export async function getAllCwlApplications(opts: { seasonId?: number; assignedTo?: string | null; limit?: number; offset?: number } = {}) {
    let { seasonId } = opts;
    const { assignedTo, limit, offset } = opts;

    if (seasonId === undefined) {
        const settings = await getSettings();
        seasonId = settings?.currentCwlSeasonId ?? undefined;
    }
    if (seasonId === undefined) return { applications: [], total: 0, seasonId: null };

    const conditions = [eq(cwlApplicationTable.seasonId, seasonId)];
    if (assignedTo === null) conditions.push(sql`${cwlApplicationTable.assignedTo} IS NULL`);
    else if (assignedTo) conditions.push(eq(cwlApplicationTable.assignedTo, assignedTo));

    const whereClause = and(...conditions);

    // Without an explicit limit we return the whole result set (the admin grid
    // loads a full CWL season client-side); paginate only when limit is given.
    let rowsQuery = db
        .select({ ...cwlApplicationColumns, image: user.image, cocAccountId: sql<number>`${cocAccountTable.id}` })
        .from(cwlApplicationTable)
        .leftJoin(cocAccountTable, eq(cocAccountTable.cocAccountTag, cwlApplicationTable.cocAccountTag))
        .leftJoin(cwlSeasonTable, eq(cwlSeasonTable.id, cwlApplicationTable.seasonId))
        .leftJoin(account, eq(account.accountId, cwlApplicationTable.discordUserId))
        .leftJoin(user, eq(user.id, account.userId))
        .where(whereClause)
        .orderBy(desc(cwlApplicationTable.appliedAt))
        .$dynamic();
    if (limit !== undefined) rowsQuery = rowsQuery.limit(limit);
    if (offset !== undefined) rowsQuery = rowsQuery.offset(offset);

    const [rows, countResult] = await Promise.all([
        rowsQuery,
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(cwlApplicationTable)
            .where(whereClause),
    ]);

    return { applications: rows, total: countResult[0]?.count ?? 0, seasonId };
}

export async function getBonusData(seasonId?: number) {
    if (seasonId === undefined) {
        const settings = await getSettings();
        seasonId = settings?.currentCwlSeasonId ?? undefined;
    }
    if (seasonId === undefined) return { rows: [], total: 0, seasonId: null };

    const rows = await db
        .select({
            id: cwlApplicationTable.id,
            cocAccountId: sql<number>`${cocAccountTable.id}`,
            seasonId: cwlApplicationTable.seasonId,
            discordUserId: cwlApplicationTable.discordUserId,
            discordUsername: cwlApplicationTable.discordUsername,
            image: user.image,
            cocAccountName: cwlApplicationTable.cocAccountName,
            cocAccountTag: cwlApplicationTable.cocAccountTag,
            cocAccountClan: cwlApplicationTable.cocAccountClan,
            preferenceNum: cwlApplicationTable.preferenceNum,
            assignedTo: cwlApplicationTable.assignedTo,
            notes: cwlApplicationTable.notes,
            isExternal: sql<boolean>`coalesce(${cocAccountTable.isExternal}, false)`,
            warWeight: sql<number>`coalesce(${cocAccountTable.warWeight}, 0)`,
            currentClan: cocAccountTable.currentClan,
            townHall: sql<number>`coalesce(${cocAccountTable.townHall}, 0)`,
            totalDonated: sql<number>`coalesce(${cocAccountTable.totalDonated}, 0)`,
            totalReceived: sql<number>`coalesce(${cocAccountTable.totalReceived}, 0)`,
            clanGames: sql<number>`coalesce(${cocAccountTable.clanGames}, 0)`,
            capitalGoldLooted: sql<number>`coalesce(${cocAccountTable.capitalGoldLooted}, 0)`,
            capitalGoldContributed: sql<number>`coalesce(${cocAccountTable.capitalGoldContributed}, 0)`,
            activityScore: sql<number>`coalesce(${cocAccountTable.activityScore}, 0)`,
            ownerName: user.name,
            ownerImage: user.image,
            ownerRole: user.role,
        })
        .from(cwlApplicationTable)
        .leftJoin(cocAccountTable, eq(cocAccountTable.cocAccountTag, cwlApplicationTable.cocAccountTag))
        .leftJoin(account, eq(account.accountId, cwlApplicationTable.discordUserId))
        .leftJoin(user, eq(user.id, account.userId))
        .where(and(eq(cwlApplicationTable.seasonId, seasonId), eq(cocAccountTable.isExternal, false)))
        .orderBy(desc(cocAccountTable.warWeight), asc(cocAccountTable.id));

    return { rows, total: rows.length, seasonId };
}

export async function getCwlSeasons() {
    const seasons = await db.select().from(cwlSeasonTable).orderBy(desc(cwlSeasonTable.year), desc(cwlSeasonTable.id));
    return { seasons };
}

export async function createCwlSeason(data: { name: string; month: string; year: number }) {
    const result = await db.insert(cwlSeasonTable).values(data).returning();
    return result[0]!;
}

export async function deleteCwlSeason(id: number) {
    const result = await db.delete(cwlSeasonTable).where(eq(cwlSeasonTable.id, id)).returning();
    return result[0] ?? null;
}

export async function getBonusLedger() {
    const bonuses = await db
        .select({
            discordUserId: cwlBonusTable.discordUserId,
            seasonId: cwlBonusTable.seasonId,
            cocAccountTag: cwlBonusTable.cocAccountTag,
        })
        .from(cwlBonusTable);
    return { bonuses };
}

export async function setUserSeasonBonus(data: { discordUserId: string; seasonId: number; cocAccountTag: string | null; selected: boolean }) {
    const { discordUserId, seasonId, cocAccountTag, selected } = data;
    if (selected) {
        const result = await db
            .insert(cwlBonusTable)
            .values({ discordUserId, seasonId, cocAccountTag })
            .onConflictDoUpdate({
                target: [cwlBonusTable.discordUserId, cwlBonusTable.seasonId],
                set: { cocAccountTag },
            })
            .returning();
        return result[0] ?? null;
    }
    const result = await db
        .delete(cwlBonusTable)
        .where(and(eq(cwlBonusTable.discordUserId, discordUserId), eq(cwlBonusTable.seasonId, seasonId)))
        .returning();
    return result[0] ?? null;
}

export type CwlAttackDetail = {
    round: number;
    stars: number;
    destruction: number;
    position: number;
    defenderName: string;
    defenderTh: number;
    defenderPosition: number;
};

// Live-fetches the current CWL for the season's assigned clans and tallies, per
// player, how many of their (up to 7) attacks they used and the stars earned, plus
// a per-attack breakdown (their position, who they hit). Matched to accounts by tag.
export async function getCwlStats(seasonId?: number) {
    if (seasonId === undefined) {
        const settings = await getSettings();
        seasonId = settings?.currentCwlSeasonId ?? undefined;
    }

    const byTag = new Map<string, { tag: string; name: string; attacks: number; stars: number; details: CwlAttackDetail[] }>();
    const ensure = (tag: string, name: string) => {
        const key = tag.toUpperCase();
        let e = byTag.get(key);
        if (!e) {
            e = { tag: key, name, attacks: 0, stars: 0, details: [] };
            byTag.set(key, e);
        }
        return e;
    };

    // Only fetch clans that have at least one applicant assigned to them this season.
    const clanRows =
        seasonId === undefined
            ? []
            : await db
                  .selectDistinct({ tag: cwlApplicationTable.assignedTo })
                  .from(cwlApplicationTable)
                  .where(and(eq(cwlApplicationTable.seasonId, seasonId), sql`${cwlApplicationTable.assignedTo} IS NOT NULL`));
    const clans = clanRows.map((c) => c.tag).filter((t): t is string => Boolean(t));

    await Promise.all(
        clans.map(async (tag) => {
            const clanTag = tag.toUpperCase();
            let group;
            try {
                group = await cocClient.getCWLGroup(tag);
            } catch {
                return; // clan not in CWL this season
            }
            await Promise.all(
                group.rounds.map(async (round, roundIdx) => {
                    for (const warTag of round.warTags) {
                        if (!warTag || warTag === "#0") continue;
                        let war;
                        try {
                            war = await cocClient.getCWLWar(warTag);
                        } catch {
                            continue;
                        }
                        const isClan = war.clan.tag.toUpperCase() === clanTag;
                        const isOpponent = war.opponent.tag.toUpperCase() === clanTag;
                        if (!isClan && !isOpponent) continue;
                        const side = isClan ? war.clan : war.opponent;
                        const enemy = isClan ? war.opponent : war.clan;
                        const enemyByTag = new Map(enemy.members.map((m) => [m.tag.toUpperCase(), m]));
                        for (const m of side.members) {
                            const entry = ensure(m.tag, m.name);
                            for (const atk of m.attacks ?? []) {
                                const def = enemyByTag.get(atk.defenderTag.toUpperCase());
                                entry.attacks += 1;
                                entry.stars += atk.stars;
                                entry.details.push({
                                    round: roundIdx + 1,
                                    stars: atk.stars,
                                    destruction: atk.destructionPercentage,
                                    position: m.mapPosition,
                                    defenderName: def?.name ?? atk.defenderTag,
                                    defenderTh: def?.townhallLevel ?? 0,
                                    defenderPosition: def?.mapPosition ?? 0,
                                });
                            }
                        }
                        break; // our clan's war for this round was found
                    }
                }),
            );
        }),
    );

    const stats = [...byTag.values()].map((e) => ({ ...e, details: e.details.sort((a, b) => a.round - b.round) }));
    return { stats };
}

export async function updateCwlApplicationNotes(id: number, notes: string | null) {
    const result = await db
        .update(cwlApplicationTable)
        .set({ notes })
        .where(eq(cwlApplicationTable.id, id))
        .returning({ id: cwlApplicationTable.id, notes: cwlApplicationTable.notes });
    return result[0] ?? null;
}

export async function assignCwlApplication(id: number, clanTag: string | null) {
    const result = await db.update(cwlApplicationTable).set({ assignedTo: clanTag }).where(eq(cwlApplicationTable.id, id)).returning();
    const row = result[0];
    if (!row) return null;
    const [acc] = await db
        .select({ warWeight: cocAccountTable.warWeight, isExternal: cocAccountTable.isExternal, image: user.image })
        .from(cocAccountTable)
        .leftJoin(account, eq(account.accountId, cocAccountTable.discordUserId))
        .leftJoin(user, eq(user.id, account.userId))
        .where(eq(cocAccountTable.cocAccountTag, row.cocAccountTag))
        .limit(1);
    return { ...row, cocAccountWeight: acc?.warWeight ?? 0, isExternal: acc?.isExternal ?? false, image: acc?.image ?? null };
}

// Assigns (or unassigns when clanTag is null) many CWL applications in a single
// statement. Returns the ids that were actually updated.
export async function assignCwlApplicationsBulk(ids: number[], clanTag: string | null) {
    if (ids.length === 0) return { count: 0, ids: [] as number[] };
    const updated = await db
        .update(cwlApplicationTable)
        .set({ assignedTo: clanTag })
        .where(inArray(cwlApplicationTable.id, ids))
        .returning({ id: cwlApplicationTable.id });
    return { count: updated.length, ids: updated.map((r) => r.id) };
}

// Admin-only: permanently delete many CWL applications in a single statement.
// Returns the ids that were actually deleted.
export async function deleteCwlApplicationsBulk(ids: number[]) {
    if (ids.length === 0) return { count: 0, ids: [] as number[] };
    const deleted = await db.delete(cwlApplicationTable).where(inArray(cwlApplicationTable.id, ids)).returning({ id: cwlApplicationTable.id });
    return { count: deleted.length, ids: deleted.map((r) => r.id) };
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
    currentCwlSeasonId?: number | null;
}) {
    const result = await db
        .insert(settingsTable)
        .values({ ...values, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: settingsTable.id,
            set: { ...values, updatedAt: new Date() },
        })
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

export async function getAllCocAccounts(opts: { search?: string; limit?: number; offset?: number; sortBy?: string; sortDir?: "asc" | "desc" } = {}) {
    const { search, limit = 50, offset = 0, sortBy, sortDir = "asc" } = opts;

    // Whitelist of sortable columns mapped to their grid field/colId.
    const sortColumns = {
        ownerName: user.name,
        cocAccountTag: cocAccountTable.cocAccountTag,
        discordUserId: cocAccountTable.discordUserId,
        warWeight: cocAccountTable.warWeight,
        isExternal: cocAccountTable.isExternal,
        currentClan: cocAccountTable.currentClan,
        townHall: cocAccountTable.townHall,
        totalDonated: cocAccountTable.totalDonated,
        totalReceived: cocAccountTable.totalReceived,
        clanGames: cocAccountTable.clanGames,
        capitalGoldLooted: cocAccountTable.capitalGoldLooted,
        capitalGoldContributed: cocAccountTable.capitalGoldContributed,
        activityScore: cocAccountTable.activityScore,
    } as const;
    const sortColumn = sortBy && sortBy in sortColumns ? sortColumns[sortBy as keyof typeof sortColumns] : null;
    // Default to heaviest war weight first when no explicit sort is requested.
    const primaryOrder = sortColumn ? (sortDir === "asc" ? asc(sortColumn) : desc(sortColumn)) : desc(cocAccountTable.warWeight);
    // Tiebreak on id so rows with equal sort values keep a stable order across
    // paged re-fetches (otherwise they swap places when the grid refreshes).
    const orderBy = [primaryOrder, asc(cocAccountTable.id)];

    // cocAccountTable.discordUserId stores the Discord accountId; join the
    // better-auth account table to resolve the owning user, then the user table
    // for their display name (sourced from Discord at sign-in).
    const whereClause = search
        ? or(
              ilike(cocAccountTable.cocAccountTag, `%${search}%`),
              ilike(cocAccountTable.discordUserId, `%${search}%`),
              ilike(user.name, `%${search}%`),
          )
        : undefined;

    const [rows, countResult] = await Promise.all([
        db
            .select({
                id: cocAccountTable.id,
                discordUserId: cocAccountTable.discordUserId,
                cocAccountTag: cocAccountTable.cocAccountTag,
                warWeight: cocAccountTable.warWeight,
                isExternal: cocAccountTable.isExternal,
                currentClan: cocAccountTable.currentClan,
                townHall: cocAccountTable.townHall,
                totalDonated: cocAccountTable.totalDonated,
                totalReceived: cocAccountTable.totalReceived,
                clanGames: cocAccountTable.clanGames,
                capitalGoldLooted: cocAccountTable.capitalGoldLooted,
                capitalGoldContributed: cocAccountTable.capitalGoldContributed,
                activityScore: cocAccountTable.activityScore,
                ownerUserId: account.userId,
                ownerName: user.name,
                ownerImage: user.image,
                ownerRole: user.role,
            })
            .from(cocAccountTable)
            .leftJoin(account, eq(account.accountId, cocAccountTable.discordUserId))
            .leftJoin(user, eq(user.id, account.userId))
            .where(whereClause)
            .orderBy(...orderBy)
            .limit(limit)
            .offset(offset),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(cocAccountTable)
            .leftJoin(account, eq(account.accountId, cocAccountTable.discordUserId))
            .leftJoin(user, eq(user.id, account.userId))
            .where(whereClause),
    ]);

    return { accounts: rows, total: countResult[0]?.count ?? 0 };
}

export type CocAccountSheetStats = {
    cocAccountTag: string;
    currentClan: string | null;
    townHall: number;
    totalDonated: number;
    totalReceived: number;
    clanGames: number;
    capitalGoldLooted: number;
    capitalGoldContributed: number;
    activityScore: number;
};

// Tags vary in case/whitespace/leading-# across sources; normalize before matching.
const normalizeCocTag = (tag: string) => {
    const t = tag.trim().toUpperCase().replace(/\s+/g, "");
    return t.startsWith("#") ? t : `#${t}`;
};

export async function syncCocAccountStats(rows: CocAccountSheetStats[]) {
    const existing = await db
        .select({ id: cocAccountTable.id, cocAccountTag: cocAccountTable.cocAccountTag, ownerName: user.name })
        .from(cocAccountTable)
        .leftJoin(account, eq(account.accountId, cocAccountTable.discordUserId))
        .leftJoin(user, eq(user.id, account.userId));
    const accByTag = new Map(existing.map((a) => [normalizeCocTag(a.cocAccountTag), a]));

    const matched: { id: number; row: CocAccountSheetStats }[] = [];
    const matchedIds = new Set<number>();
    const notFound: string[] = [];
    for (const row of rows) {
        const acc = accByTag.get(normalizeCocTag(row.cocAccountTag));
        if (!acc) notFound.push(row.cocAccountTag);
        else {
            matched.push({ id: acc.id, row });
            matchedIds.add(acc.id);
        }
    }

    if (matched.length > 0) {
        await db.transaction(async (tx) => {
            for (const { id, row } of matched) {
                await tx
                    .update(cocAccountTable)
                    .set({
                        currentClan: row.currentClan,
                        townHall: row.townHall,
                        totalDonated: row.totalDonated,
                        totalReceived: row.totalReceived,
                        clanGames: row.clanGames,
                        capitalGoldLooted: row.capitalGoldLooted,
                        capitalGoldContributed: row.capitalGoldContributed,
                        activityScore: row.activityScore,
                    })
                    .where(eq(cocAccountTable.id, id));
            }
        });
    }

    // Linked accounts that had no matching row in the sheet.
    const notInSheet = existing.filter((a) => !matchedIds.has(a.id)).map((a) => ({ cocAccountTag: a.cocAccountTag, ownerName: a.ownerName }));

    return { updated: matched.length, notFound, notInSheet };
}

export async function getAdminUsers(
    opts: { search?: string; limit?: number; offset?: number; sortBy?: string; sortDirection?: "asc" | "desc" } = {},
) {
    const { search, limit = 50, offset = 0, sortBy, sortDirection = "asc" } = opts;

    const sortColumns = {
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
    } as const;
    const sortColumn = sortBy && sortBy in sortColumns ? sortColumns[sortBy as keyof typeof sortColumns] : user.createdAt;
    const orderBy = sortDirection === "desc" ? desc(sortColumn) : asc(sortColumn);

    const discordJoin = and(eq(account.userId, user.id), eq(account.providerId, "discord"));

    const whereClause = search ? or(ilike(user.name, `%${search}%`), ilike(account.accountId, `%${search}%`)) : undefined;

    const [rows, countResult] = await Promise.all([
        db
            .select({ ...getTableColumns(user), discordId: account.accountId })
            .from(user)
            .leftJoin(account, discordJoin)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(user)
            .leftJoin(account, discordJoin)
            .where(whereClause),
    ]);

    return { users: rows, total: countResult[0]?.count ?? 0 };
}

export async function updateCocAccountWarWeight(id: number, warWeight: number) {
    const result = await db.update(cocAccountTable).set({ warWeight }).where(eq(cocAccountTable.id, id)).returning();
    return result[0] ?? null;
}

// Admin-only toggle of the external flag. Used to revert a member-marked
// external account back to a main account (members can only set it one-way).
export async function updateCocAccountExternal(id: number, isExternal: boolean) {
    const result = await db.update(cocAccountTable).set({ isExternal }).where(eq(cocAccountTable.id, id)).returning();
    return result[0] ?? null;
}

// Admin-only: manually edit the sheet-synced stat columns from the grid.
// Only the provided fields are written, so a single-cell edit touches one column.
// The next sheet sync will overwrite these with the sheet's values.
export type CocAccountStatsUpdate = Partial<{
    currentClan: string | null;
    totalDonated: number;
    totalReceived: number;
    clanGames: number;
    capitalGoldLooted: number;
    capitalGoldContributed: number;
    activityScore: number;
}>;
export async function updateCocAccountStats(id: number, values: CocAccountStatsUpdate) {
    const result = await db.update(cocAccountTable).set(values).where(eq(cocAccountTable.id, id)).returning();
    return result[0] ?? null;
}

// Admin-only: permanently delete a CoC account. Cascades to that tag's CWL
// applications (cwlApplicationTable.cocAccountTag has onDelete: "cascade").
export async function deleteCocAccount(id: number) {
    const result = await db.delete(cocAccountTable).where(eq(cocAccountTable.id, id)).returning();
    return result[0] ?? null;
}

// Admin-only: permanently delete many CoC accounts in a single statement.
// Cascades to each tag's CWL applications. Returns the deleted ids and tags.
export async function deleteCocAccountsBulk(ids: number[]) {
    if (ids.length === 0) return { count: 0, accounts: [] as { id: number; cocAccountTag: string }[] };
    const deleted = await db
        .delete(cocAccountTable)
        .where(inArray(cocAccountTable.id, ids))
        .returning({ id: cocAccountTable.id, cocAccountTag: cocAccountTable.cocAccountTag });
    return { count: deleted.length, accounts: deleted };
}

// Member self-service: convert one of their OWN accounts to external (one-way).
// Scoped to discordUserId so a member can only touch their own accounts, and only
// ever sets isExternal to true — reverting to a main account is staff-only (see
// updateCocAccountExternal). War weight is left untouched; members never edit it.
export async function setUserCocAccountExternal(id: number, discordUserId: string) {
    const result = await db
        .update(cocAccountTable)
        .set({ isExternal: true })
        .where(and(eq(cocAccountTable.id, id), eq(cocAccountTable.discordUserId, discordUserId)))
        .returning();
    return result[0] ?? null;
}

export async function getAuditLog(
    opts: {
        actorId?: string;
        action?: string;
        targetType?: string;
        targetId?: string;
        before?: Date;
        after?: Date;
        limit?: number;
        offset?: number;
    } = {},
) {
    const { actorId, action, targetType, targetId, before, after, limit = 50, offset = 0 } = opts;

    const conditions = [];
    if (actorId) conditions.push(eq(auditLogTable.actorId, actorId));
    if (action) conditions.push(eq(auditLogTable.action, action));
    if (targetType) conditions.push(eq(auditLogTable.targetType, targetType));
    if (targetId) conditions.push(eq(auditLogTable.targetId, targetId));
    if (after) conditions.push(gte(auditLogTable.createdAt, after));
    if (before) conditions.push(lte(auditLogTable.createdAt, before));
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const discordJoin = and(eq(account.userId, auditLogTable.actorId), eq(account.providerId, "discord"));
    const [rows, countResult] = await Promise.all([
        db
            .select({
                id: auditLogTable.id,
                actorId: auditLogTable.actorId,
                actorName: auditLogTable.actorName,
                actorCurrentName: user.name,
                actorCurrentImage: user.image,
                actorCurrentRole: user.role,
                actorDiscordId: account.accountId,
                action: auditLogTable.action,
                targetType: auditLogTable.targetType,
                targetId: auditLogTable.targetId,
                metadata: auditLogTable.metadata,
                createdAt: auditLogTable.createdAt,
            })
            .from(auditLogTable)
            .leftJoin(user, eq(auditLogTable.actorId, user.id))
            .leftJoin(account, discordJoin)
            .where(whereClause)
            .orderBy(desc(auditLogTable.createdAt))
            .limit(limit)
            .offset(offset),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(auditLogTable)
            .where(whereClause),
    ]);

    return { entries: rows, total: countResult[0]?.count ?? 0 };
}

export async function importCocAccountsForUser(userId: string, discordUserId: string, accounts: { tag: string; weight: number }[]) {
    return db.transaction(async (tx) => {
        const inserted = await tx
            .insert(cocAccountTable)
            .values(
                accounts.map((a) => ({
                    discordUserId,
                    cocAccountTag: a.tag,
                    warWeight: a.weight,
                })),
            )
            .onConflictDoNothing({ target: cocAccountTable.cocAccountTag })
            .returning();

        if (inserted.length > 0) {
            await tx
                .update(user)
                .set({ role: "verified" })
                .where(and(eq(user.id, userId), eq(user.role, "unverified")));
        }

        return inserted;
    });
}
