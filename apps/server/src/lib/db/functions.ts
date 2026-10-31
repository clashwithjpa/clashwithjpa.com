import { cocClient } from "@/lib/coc";
import { db } from "@/lib/db";
import {
    account,
    apikey,
    apiKeyUsageTable,
    auditLogTable,
    clanApplicationStatusEnum,
    clanApplicationTable,
    clanInfoTable,
    cocAccountTable,
    cwlApplicationTable,
    cwlBonusTable,
    cwlClanInfoTable,
    cwlSeasonTable,
    session,
    settingsTable,
    user,
} from "@/lib/db/schema";
import { and, asc, desc, eq, getTableColumns, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";

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

export async function getUserNameById(userId: string): Promise<string | null> {
    const result = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
    return result[0]?.name ?? null;
}

// Owner of an API key, loaded on every key-authenticated request so the existing
// role guards can run against a real user. Deliberately re-read per request
// rather than trusted from the key row: it's what makes a demotion, a ban, or an
// API-access revocation take effect immediately on keys already in the wild.
export async function getApiKeyOwner(userId: string) {
    const result = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    return result[0] ?? null;
}

export async function getUsersWithDiscordAccounts(): Promise<{ userId: string; discordId: string; discordUsername: string | null }[]> {
    return db
        .select({ userId: user.id, discordId: account.accountId, discordUsername: user.discordUsername })
        .from(user)
        .innerJoin(account, eq(account.userId, user.id));
}

export async function setUserDiscordUsername(userId: string, discordUsername: string): Promise<void> {
    await db.update(user).set({ discordUsername }).where(eq(user.id, userId));
}

// Returns null when no such user exists, so the route can answer 404 instead of
// silently reporting success on a typo'd id.
export async function setUserApiAccess(userId: string, apiAccess: boolean) {
    return db.transaction(async (tx) => {
        const [before] = await tx.select({ apiAccess: user.apiAccess }).from(user).where(eq(user.id, userId)).for("update");
        if (!before) return null;
        const [updated] = await tx.update(user).set({ apiAccess }).where(eq(user.id, userId)).returning({ id: user.id, name: user.name });
        return { ...updated!, previousApiAccess: before.apiAccess ?? false };
    });
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

// Accepts a clan tag or a family clan name and returns the tag. Names that
// match no family clan, or more than one, resolve to null.
export async function resolveFamilyClanTag(clan: string | null | undefined): Promise<string | null> {
    const value = clan?.trim();
    if (!value) return null;
    if (value.startsWith("#")) return value;
    const rows = await db.select({ tag: clanInfoTable.cocClanTag }).from(clanInfoTable).where(eq(clanInfoTable.cocClanName, value)).limit(2);
    return rows.length === 1 ? rows[0]!.tag : null;
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

export async function setRules(rulesContent: string): Promise<{ rules: string; previous: string | null }> {
    const previous = await getRules();
    const result = await db
        .insert(settingsTable)
        .values({ rulesContent, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: settingsTable.id,
            set: { rulesContent, updatedAt: new Date() },
        })
        .returning({ rulesContent: settingsTable.rulesContent });

    return { rules: result[0]!.rulesContent!, previous };
}

export async function getPrivacy(): Promise<string | null> {
    const result = await db.select({ privacyContent: settingsTable.privacyContent }).from(settingsTable).where(eq(settingsTable.id, 1));

    return result[0]?.privacyContent ?? null;
}

export async function setPrivacy(privacyContent: string): Promise<{ privacy: string; previous: string | null }> {
    const previous = await getPrivacy();
    const result = await db
        .insert(settingsTable)
        .values({ privacyContent, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: settingsTable.id,
            set: { privacyContent, updatedAt: new Date() },
        })
        .returning({ privacyContent: settingsTable.privacyContent });

    return { privacy: result[0]!.privacyContent!, previous };
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
    const deleted = await db.delete(clanApplicationTable).where(eq(clanApplicationTable.status, "accepted")).returning({
        id: clanApplicationTable.id,
        cocAccountTag: clanApplicationTable.cocAccountTag,
        discordUserId: clanApplicationTable.discordUserId,
    });
    return deleted;
}

// Returns the previous status and what else the transition did (linked or
// unlinked the account, moved the applicant's role) so the audit entry can say so.
export async function updateClanApplicationStatus(id: number, status: ClanApplicationStatus) {
    return db.transaction(async (tx) => {
        const [existing] = await tx.select().from(clanApplicationTable).where(eq(clanApplicationTable.id, id)).for("update");
        if (!existing) return null;
        const effects: { userId: string | null; accountLinked: boolean; accountUnlinked: boolean; roleChange: { from: string; to: string } | null } =
            {
                userId: null,
                accountLinked: false,
                accountUnlinked: false,
                roleChange: null,
            };

        if (status === "accepted" && existing.status !== "accepted") {
            const [acct] = await tx
                .select({ userId: account.userId })
                .from(account)
                .where(and(eq(account.accountId, existing.discordUserId), eq(account.providerId, "discord")))
                .limit(1);

            if (!acct) {
                throw new MissingDiscordAccountError(existing.discordUserId);
            }

            effects.userId = acct.userId;
            const linked = await tx
                .insert(cocAccountTable)
                .values({ discordUserId: existing.discordUserId, cocAccountTag: existing.cocAccountTag })
                .onConflictDoNothing({ target: cocAccountTable.cocAccountTag })
                .returning({ id: cocAccountTable.id });
            effects.accountLinked = linked.length > 0;

            const promoted = await tx
                .update(user)
                .set({ role: "verified" })
                .where(and(eq(user.id, acct.userId), eq(user.role, "unverified")))
                .returning({ id: user.id });
            if (promoted.length) effects.roleChange = { from: "unverified", to: "verified" };
        } else if (existing.status === "accepted" && status !== "accepted") {
            const unlinked = await tx
                .delete(cocAccountTable)
                .where(eq(cocAccountTable.cocAccountTag, existing.cocAccountTag))
                .returning({ id: cocAccountTable.id });
            effects.accountUnlinked = unlinked.length > 0;

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
                    effects.userId = acct.userId;
                    const demoted = await tx
                        .update(user)
                        .set({ role: "unverified" })
                        .where(and(eq(user.id, acct.userId), eq(user.role, "verified")))
                        .returning({ id: user.id });
                    if (demoted.length) effects.roleChange = { from: "verified", to: "unverified" };
                }
            }
        }

        const [updated] = await tx.update(clanApplicationTable).set({ status }).where(eq(clanApplicationTable.id, id)).returning();
        return updated ? { application: updated, previousStatus: existing.status, effects } : null;
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
        .select({ ...cwlApplicationColumns, image: user.image, ownerRole: user.role, cocAccountId: sql<number>`${cocAccountTable.id}` })
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
    const seasons = await db
        .select()
        .from(cwlSeasonTable)
        .orderBy(desc(cwlSeasonTable.year), desc(sql`extract(month from to_date(${cwlSeasonTable.month}, 'Month'))`), desc(cwlSeasonTable.createdAt));
    return { seasons };
}

export class DuplicateSeasonNameError extends Error {
    constructor(name: string) {
        super(`Season "${name}" already exists`);
        this.name = "DuplicateSeasonNameError";
    }
}

export async function createCwlSeason(data: { name: string; month: string; year: number }) {
    const existing = await db.select({ id: cwlSeasonTable.id }).from(cwlSeasonTable).where(eq(cwlSeasonTable.name, data.name)).limit(1);
    if (existing.length > 0) throw new DuplicateSeasonNameError(data.name);
    const result = await db.insert(cwlSeasonTable).values(data).returning();
    return result[0]!;
}

export async function renameCwlSeason(id: number, name: string) {
    const existing = await db
        .select({ id: cwlSeasonTable.id })
        .from(cwlSeasonTable)
        .where(and(eq(cwlSeasonTable.name, name), sql`${cwlSeasonTable.id} != ${id}`))
        .limit(1);
    if (existing.length > 0) throw new DuplicateSeasonNameError(name);
    const previous = await db.select({ name: cwlSeasonTable.name }).from(cwlSeasonTable).where(eq(cwlSeasonTable.id, id)).limit(1);
    const result = await db.update(cwlSeasonTable).set({ name }).where(eq(cwlSeasonTable.id, id)).returning();
    const season = result[0] ?? null;
    return season ? { season, previousName: previous[0]?.name ?? null } : null;
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
    const [previous] = await db
        .select({ cocAccountTag: cwlBonusTable.cocAccountTag })
        .from(cwlBonusTable)
        .where(and(eq(cwlBonusTable.discordUserId, discordUserId), eq(cwlBonusTable.seasonId, seasonId)));
    if (selected) {
        const result = await db
            .insert(cwlBonusTable)
            .values({ discordUserId, seasonId, cocAccountTag })
            .onConflictDoUpdate({
                target: [cwlBonusTable.discordUserId, cwlBonusTable.seasonId],
                set: { cocAccountTag },
            })
            .returning();
        return { bonus: result[0] ?? null, previous: previous ?? null };
    }
    const result = await db
        .delete(cwlBonusTable)
        .where(and(eq(cwlBonusTable.discordUserId, discordUserId), eq(cwlBonusTable.seasonId, seasonId)))
        .returning();
    return { bonus: result[0] ?? null, previous: previous ?? null };
}

export type CwlAttackDetail = {
    round: number;
    stars: number;
    destruction: number;
    position: number;
    defenderName: string;
    defenderTh: number;
    defenderPosition: number;
    // Highest-ranked enemy base our side hadn't attacked yet when this hit landed; null once every base was hit.
    firstOpenPosition: number | null;
};

// CWL wars report mapPosition with gaps (a 30v30 can run past #40), so positions are
// re-ranked to the 1..N order shown on the in-game war map before being compared.
function mapRanks(members: { tag: string; mapPosition: number }[]) {
    const sorted = [...members].sort((a, b) => a.mapPosition - b.mapPosition);
    return new Map(sorted.map((m, i) => [m.tag.toUpperCase(), i + 1]));
}

// Live-fetches the current CWL for the season's assigned clans and tallies, per
// player, how many of their (up to 7) attacks they used and the stars earned, plus
// a per-attack breakdown (their position, who they hit). Matched to accounts by tag.
export async function getCwlStats(seasonId?: number) {
    if (seasonId === undefined) {
        const settings = await getSettings();
        seasonId = settings?.currentCwlSeasonId ?? undefined;
    }

    // `rounds` holds the ended rounds a member was in the lineup for, so the page can
    // tell missed hits apart from being benched.
    const byTag = new Map<
        string,
        { tag: string; name: string; clanTag: string; attacks: number; stars: number; rounds: number[]; details: CwlAttackDetail[] }
    >();
    const ensure = (tag: string, name: string, clanTag: string) => {
        const key = tag.toUpperCase();
        let e = byTag.get(key);
        if (!e) {
            e = { tag: key, name, clanTag, attacks: 0, stars: 0, rounds: [], details: [] };
            byTag.set(key, e);
        }
        return e;
    };
    const clanRecords = new Map<string, { tag: string; endedRounds: number[]; wins: number; losses: number; ties: number }>();

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
            const record = { tag: clanTag, endedRounds: [] as number[], wins: 0, losses: 0, ties: 0 };
            let group;
            try {
                group = await cocClient.getCWLGroup(tag);
            } catch {
                return; // clan not in CWL this season
            }
            clanRecords.set(clanTag, record);
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
                        const sideRank = mapRanks(side.members);
                        const enemyRank = mapRanks(enemy.members);
                        const sideAttacks = side.members.flatMap((m) => m.attacks ?? []);
                        const firstOpenBefore = (order: number) => {
                            const hit = new Set(sideAttacks.filter((a) => a.order < order).map((a) => enemyRank.get(a.defenderTag.toUpperCase())));
                            for (let rank = 1; rank <= enemy.members.length; rank++) if (!hit.has(rank)) return rank;
                            return null;
                        };
                        const ended = war.state === "warEnded";
                        if (ended) {
                            record.endedRounds.push(roundIdx + 1);
                            // CWL wars are decided on stars, then destruction.
                            const diff = side.stars - enemy.stars || side.destructionPercentage - enemy.destructionPercentage;
                            if (diff > 0) record.wins += 1;
                            else if (diff < 0) record.losses += 1;
                            else record.ties += 1;
                        }
                        for (const m of side.members) {
                            const entry = ensure(m.tag, m.name, clanTag);
                            if (ended) entry.rounds.push(roundIdx + 1);
                            for (const atk of m.attacks ?? []) {
                                const def = enemyByTag.get(atk.defenderTag.toUpperCase());
                                entry.attacks += 1;
                                entry.stars += atk.stars;
                                entry.details.push({
                                    round: roundIdx + 1,
                                    stars: atk.stars,
                                    destruction: atk.destructionPercentage,
                                    position: sideRank.get(m.tag.toUpperCase()) ?? 0,
                                    defenderName: def?.name ?? atk.defenderTag,
                                    defenderTh: def?.townhallLevel ?? 0,
                                    defenderPosition: enemyRank.get(atk.defenderTag.toUpperCase()) ?? 0,
                                    firstOpenPosition: firstOpenBefore(atk.order),
                                });
                            }
                        }
                        break; // our clan's war for this round was found
                    }
                }),
            );
        }),
    );

    const stats = [...byTag.values()].map((e) => ({
        ...e,
        rounds: e.rounds.sort((a, b) => a - b),
        details: e.details.sort((a, b) => a.round - b.round),
    }));
    const records = [...clanRecords.values()].map((c) => ({ ...c, endedRounds: c.endedRounds.sort((a, b) => a - b) }));
    return { stats, clans: records };
}

export async function assignCwlApplication(id: number, clanTag: string | null) {
    const changed = await db.transaction(async (tx) => {
        const [before] = await tx
            .select({ assignedTo: cwlApplicationTable.assignedTo })
            .from(cwlApplicationTable)
            .where(eq(cwlApplicationTable.id, id))
            .for("update");
        if (!before) return null;
        const [row] = await tx.update(cwlApplicationTable).set({ assignedTo: clanTag }).where(eq(cwlApplicationTable.id, id)).returning();
        return { row: row!, previousAssignedTo: before.assignedTo };
    });
    if (!changed) return null;
    const { row, previousAssignedTo } = changed;
    const [acc] = await db
        .select({ warWeight: cocAccountTable.warWeight, isExternal: cocAccountTable.isExternal, image: user.image })
        .from(cocAccountTable)
        .leftJoin(account, eq(account.accountId, cocAccountTable.discordUserId))
        .leftJoin(user, eq(user.id, account.userId))
        .where(eq(cocAccountTable.cocAccountTag, row.cocAccountTag))
        .limit(1);
    return {
        application: { ...row, cocAccountWeight: acc?.warWeight ?? 0, isExternal: acc?.isExternal ?? false, image: acc?.image ?? null },
        previousAssignedTo,
    };
}

// Assigns (or unassigns when clanTag is null) many CWL applications in a single
// statement. Returns each updated row with its previous assignment.
export async function assignCwlApplicationsBulk(ids: number[], clanTag: string | null) {
    if (ids.length === 0) return { count: 0, rows: [] };
    return db.transaction(async (tx) => {
        const before = await tx
            .select({
                id: cwlApplicationTable.id,
                assignedTo: cwlApplicationTable.assignedTo,
                cocAccountTag: cwlApplicationTable.cocAccountTag,
                cocAccountName: cwlApplicationTable.cocAccountName,
                discordUserId: cwlApplicationTable.discordUserId,
            })
            .from(cwlApplicationTable)
            .where(inArray(cwlApplicationTable.id, ids))
            .for("update");
        if (before.length === 0) return { count: 0, rows: [] };
        await tx.update(cwlApplicationTable).set({ assignedTo: clanTag }).where(inArray(cwlApplicationTable.id, ids));
        return { count: before.length, rows: before };
    });
}

// Admin-only: permanently delete many CWL applications in a single statement.
// Returns the deleted rows.
export async function deleteCwlApplicationsBulk(ids: number[]) {
    if (ids.length === 0) return { count: 0, rows: [] };
    const rows = await db.delete(cwlApplicationTable).where(inArray(cwlApplicationTable.id, ids)).returning();
    return { count: rows.length, rows };
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
    const previous = await getSettings();
    const result = await db
        .insert(settingsTable)
        .values({ ...values, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: settingsTable.id,
            set: { ...values, updatedAt: new Date() },
        })
        .returning();
    return { settings: result[0]!, previous };
}

// Scoped to just the CWL ping columns so it never collides with `updateSettings`
// (the general PUT /settings upsert used by the isAdmin-gated route).
export async function getCwlPingSettings() {
    const result = await db
        .select({
            id: settingsTable.id,
            enabled: settingsTable.cwlPingEnabled,
            channelId: settingsTable.cwlPingChannelId,
            intervalMinutes: settingsTable.cwlPingIntervalMinutes,
            lastRunAt: settingsTable.cwlPingLastRunAt,
            lastRunSummary: settingsTable.cwlPingLastRunSummary,
        })
        .from(settingsTable)
        .limit(1);
    return result[0] ?? null;
}

export async function updateCwlPingSettings(values: { enabled?: boolean; channelId?: string | null; intervalMinutes?: number }) {
    const previous = await getCwlPingSettings();
    const columns = {
        ...(values.enabled !== undefined ? { cwlPingEnabled: values.enabled } : {}),
        ...(values.channelId !== undefined ? { cwlPingChannelId: values.channelId } : {}),
        ...(values.intervalMinutes !== undefined ? { cwlPingIntervalMinutes: values.intervalMinutes } : {}),
    };
    const result = await db
        .insert(settingsTable)
        .values({ ...columns, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: settingsTable.id,
            set: columns,
        })
        .returning({
            id: settingsTable.id,
            enabled: settingsTable.cwlPingEnabled,
            channelId: settingsTable.cwlPingChannelId,
            intervalMinutes: settingsTable.cwlPingIntervalMinutes,
            lastRunAt: settingsTable.cwlPingLastRunAt,
            lastRunSummary: settingsTable.cwlPingLastRunSummary,
        });
    return { settings: result[0]!, previous };
}

// Deliberately bypasses `updateSettings`'s `updatedAt` bump — a scheduled ping
// run isn't a settings edit, and touching `updatedAt` would make the settings
// page's dirty-check race against the background job.
export async function recordCwlPingRun(summary: { ranAt: Date; summary: string }) {
    await db.update(settingsTable).set({ cwlPingLastRunAt: summary.ranAt, cwlPingLastRunSummary: summary.summary }).where(eq(settingsTable.id, 1));
}

export async function getAllClans() {
    return db.select().from(clanInfoTable).orderBy(clanInfoTable.cocClanCode);
}

export async function createClan(values: typeof clanInfoTable.$inferInsert) {
    const result = await db.insert(clanInfoTable).values(values).returning();
    return result[0]!;
}

export async function updateClan(id: number, values: Partial<typeof clanInfoTable.$inferInsert>) {
    return db.transaction(async (tx) => {
        const [before] = await tx.select().from(clanInfoTable).where(eq(clanInfoTable.id, id)).for("update");
        if (!before) return null;
        const [clan] = await tx.update(clanInfoTable).set(values).where(eq(clanInfoTable.id, id)).returning();
        return { clan: clan!, before };
    });
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

export const SHEET_STAT_FIELDS = [
    "currentClan",
    "townHall",
    "totalDonated",
    "totalReceived",
    "clanGames",
    "capitalGoldLooted",
    "capitalGoldContributed",
    "activityScore",
] as const;

// `updated` counts every matched account (what the sheet covered); `changed`
// holds only the rows whose values differ, and only those are written.
export async function syncCocAccountStats(rows: CocAccountSheetStats[]) {
    const existing = await db
        .select({ ...getTableColumns(cocAccountTable), ownerName: user.name })
        .from(cocAccountTable)
        .leftJoin(account, eq(account.accountId, cocAccountTable.discordUserId))
        .leftJoin(user, eq(user.id, account.userId));
    const accByTag = new Map(existing.map((a) => [normalizeCocTag(a.cocAccountTag), a]));

    const changed: { before: (typeof existing)[number]; row: CocAccountSheetStats }[] = [];
    const matchedIds = new Set<number>();
    const notFound: string[] = [];
    for (const row of rows) {
        const acc = accByTag.get(normalizeCocTag(row.cocAccountTag));
        if (!acc) notFound.push(row.cocAccountTag);
        else {
            matchedIds.add(acc.id);
            if (SHEET_STAT_FIELDS.some((f) => acc[f] !== row[f])) changed.push({ before: acc, row });
        }
    }

    if (changed.length > 0) {
        await db.transaction(async (tx) => {
            for (const { before, row } of changed) {
                const id = before.id;
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

    return { updated: matchedIds.size, changed, notFound, notInSheet };
}

export type CocAccountWarWeightRow = { cocAccountTag: string; warWeight: number };

// notInFwa excludes external accounts, which legitimately aren't in a JPA clan's FWA roster.
export async function syncCocAccountWarWeights(rows: CocAccountWarWeightRow[]) {
    const existing = await db
        .select({
            id: cocAccountTable.id,
            cocAccountTag: cocAccountTable.cocAccountTag,
            discordUserId: cocAccountTable.discordUserId,
            isExternal: cocAccountTable.isExternal,
            warWeight: cocAccountTable.warWeight,
            ownerName: user.name,
        })
        .from(cocAccountTable)
        .leftJoin(account, eq(account.accountId, cocAccountTable.discordUserId))
        .leftJoin(user, eq(user.id, account.userId));
    const accByTag = new Map(existing.map((a) => [normalizeCocTag(a.cocAccountTag), a]));

    const weightById = new Map<number, number>();
    const changed: { before: (typeof existing)[number]; warWeight: number }[] = [];
    for (const row of rows) {
        const acc = accByTag.get(normalizeCocTag(row.cocAccountTag));
        if (!acc) continue;
        weightById.set(acc.id, row.warWeight);
        if (acc.warWeight !== row.warWeight) changed.push({ before: acc, warWeight: row.warWeight });
    }

    // Only rows whose weight moved are written; FWA re-syncs are mostly no-ops.
    if (changed.length > 0) {
        await db.transaction(async (tx) => {
            for (const { before, warWeight } of changed) {
                await tx.update(cocAccountTable).set({ warWeight }).where(eq(cocAccountTable.id, before.id));
            }
        });
    }

    const notInFwa = existing
        .filter((a) => !a.isExternal && !weightById.has(a.id))
        .map((a) => ({ cocAccountTag: a.cocAccountTag, ownerName: a.ownerName }));

    return { updated: weightById.size, changed, notInFwa };
}

export async function getAdminUsers(
    opts: {
        search?: string;
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortDirection?: "asc" | "desc";
        role?: string;
        apiAccess?: boolean;
        includeEmail?: boolean;
    } = {},
) {
    const { search, limit = 50, offset = 0, sortBy, sortDirection = "asc", role, apiAccess, includeEmail = false } = opts;

    const sortColumns = {
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
    } as const;
    const sortColumn = sortBy && sortBy in sortColumns ? sortColumns[sortBy as keyof typeof sortColumns] : user.createdAt;
    const orderBy = sortDirection === "desc" ? desc(sortColumn) : asc(sortColumn);

    const discordJoin = and(eq(account.userId, user.id), eq(account.providerId, "discord"));

    const searchClause = search ? or(ilike(user.name, `%${search}%`), ilike(account.accountId, `%${search}%`)) : undefined;
    // A missing role is bucketed as "unverified" to match the UI's role badges,
    // so filtering by "unverified" must also catch users with a null role.
    const roleClause = role ? (role === "unverified" ? or(eq(user.role, "unverified"), isNull(user.role)) : eq(user.role, role)) : undefined;
    // `is not true` rather than `= false`: users whose column was never set still
    // count as lacking access.
    const apiAccessClause = apiAccess === undefined ? undefined : apiAccess ? eq(user.apiAccess, true) : sql`${user.apiAccess} is not true`;
    const whereClause = and(searchClause, roleClause, apiAccessClause);

    // Counts ignore the role and api-access filters (but respect search) so the
    // badge bar stays stable while one of them is selected.
    const roleExpr = sql<string>`coalesce(${user.role}, 'unverified')`;

    // Not `user.updatedAt` — drizzle's `$onUpdate` stamps that on any write to the
    // row, so an admin toggling a flag would read as the user being active.
    // `.mapWith` gives the subquery a selected column's driver mapping; without it
    // postgres' naive timestamp parses as local rather than UTC.
    const lastActiveAt = sql<Date | null>`(select max(${session.updatedAt}) from ${session} where ${session.userId} = ${user.id})`.mapWith(
        session.updatedAt,
    );

    const { email: emailColumn, emailVerified: emailVerifiedColumn, ...userColumns } = getTableColumns(user);
    const selection = { ...userColumns, discordId: account.accountId, lastActiveAt };

    const [rows, countResult, roleCountRows, apiAccessCountRow] = await Promise.all([
        db
            .select(includeEmail ? { ...selection, email: emailColumn, emailVerified: emailVerifiedColumn } : selection)
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
        db
            .select({ role: roleExpr, count: sql<number>`count(*)::int` })
            .from(user)
            .leftJoin(account, discordJoin)
            .where(searchClause)
            .groupBy(roleExpr),
        db
            .select({
                granted: sql<number>`(count(*) filter (where ${user.apiAccess} = true))::int`,
                none: sql<number>`(count(*) filter (where ${user.apiAccess} is not true))::int`,
            })
            .from(user)
            .leftJoin(account, discordJoin)
            .where(searchClause),
    ]);

    const roleCounts = Object.fromEntries(roleCountRows.map((r) => [r.role, r.count]));
    return {
        users: rows,
        total: countResult[0]?.count ?? 0,
        roleCounts,
        apiAccessCounts: { granted: apiAccessCountRow[0]?.granted ?? 0, none: apiAccessCountRow[0]?.none ?? 0 },
    };
}

// Reads the row under lock in the same transaction as the write, so the audit
// entry's "before" is exactly what this update replaced.
async function updateCocAccountWithBefore(id: number, values: Partial<typeof cocAccountTable.$inferInsert>) {
    return db.transaction(async (tx) => {
        const [before] = await tx.select().from(cocAccountTable).where(eq(cocAccountTable.id, id)).for("update");
        if (!before) return null;
        const [account] = await tx.update(cocAccountTable).set(values).where(eq(cocAccountTable.id, id)).returning();
        return { account: account!, before };
    });
}

export async function updateCocAccountWarWeight(id: number, warWeight: number) {
    return updateCocAccountWithBefore(id, { warWeight });
}

// Admin-only toggle of the external flag. Used to revert a member-marked
// external account back to a main account (members can only set it one-way).
export async function updateCocAccountExternal(id: number, isExternal: boolean) {
    return updateCocAccountWithBefore(id, { isExternal });
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
    return updateCocAccountWithBefore(id, values);
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
    if (ids.length === 0) return { count: 0, accounts: [] as (typeof cocAccountTable.$inferSelect)[] };
    const deleted = await db.delete(cocAccountTable).where(inArray(cocAccountTable.id, ids)).returning();
    return { count: deleted.length, accounts: deleted };
}

// Member self-service: convert one of their OWN accounts to external (one-way).
// Scoped to discordUserId so a member can only touch their own accounts, and only
// ever sets isExternal to true — reverting to a main account is staff-only (see
// updateCocAccountExternal). War weight is left untouched; members never edit it.
export async function setUserCocAccountExternal(id: number, discordUserId: string) {
    return db.transaction(async (tx) => {
        const owned = and(eq(cocAccountTable.id, id), eq(cocAccountTable.discordUserId, discordUserId));
        const [before] = await tx.select().from(cocAccountTable).where(owned).for("update");
        if (!before) return null;
        const [account] = await tx.update(cocAccountTable).set({ isExternal: true }).where(owned).returning();
        return { account: account!, before };
    });
}

type AuditLogFilters = {
    actorId?: string;
    // Events this user did or was the subject of.
    involvingUserId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    source?: string;
    q?: string;
    before?: Date;
    after?: Date;
};

// Users referenced by id, as `subjects @> [...]` containment so the GIN index serves it.
function involvesUsers(userIds: string[]) {
    return or(
        inArray(auditLogTable.actorId, userIds),
        and(eq(auditLogTable.targetType, "user"), inArray(auditLogTable.targetId, userIds)),
        ...userIds.map((id) => sql`${auditLogTable.subjects} @> ${JSON.stringify([{ type: "user", id }])}::jsonb`),
    );
}

const SEARCH_MATCH_LIMIT = 25;

async function auditLogWhere(f: AuditLogFilters) {
    const conditions = [];
    if (f.actorId) conditions.push(eq(auditLogTable.actorId, f.actorId));
    if (f.involvingUserId) conditions.push(involvesUsers([f.involvingUserId]));
    if (f.action) conditions.push(eq(auditLogTable.action, f.action));
    if (f.targetType) conditions.push(eq(auditLogTable.targetType, f.targetType));
    if (f.targetId) conditions.push(eq(auditLogTable.targetId, f.targetId));
    if (f.source) conditions.push(eq(auditLogTable.source, f.source));
    if (f.after) conditions.push(gte(auditLogTable.createdAt, f.after));
    if (f.before) conditions.push(lte(auditLogTable.createdAt, f.before));
    if (f.q) {
        const pattern = `%${f.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
        // Entries hold ids and tags, not names, so a name search resolves them first.
        const [users, clans, cwlClans, accounts] = await Promise.all([
            db
                .selectDistinct({ id: user.id })
                .from(user)
                .leftJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "discord")))
                .where(or(ilike(user.name, pattern), ilike(account.accountId, pattern), eq(user.id, f.q)))
                .limit(SEARCH_MATCH_LIMIT),
            db
                .select({ id: clanInfoTable.cocClanTag })
                .from(clanInfoTable)
                .where(or(ilike(clanInfoTable.cocClanName, pattern), ilike(clanInfoTable.cocClanCode, pattern)))
                .limit(SEARCH_MATCH_LIMIT),
            db
                .select({ id: cwlClanInfoTable.cocClanTag })
                .from(cwlClanInfoTable)
                .where(ilike(cwlClanInfoTable.cocClanName, pattern))
                .limit(SEARCH_MATCH_LIMIT),
            db
                .selectDistinct({ id: cwlApplicationTable.cocAccountTag })
                .from(cwlApplicationTable)
                .where(ilike(cwlApplicationTable.cocAccountName, pattern))
                .limit(SEARCH_MATCH_LIMIT),
        ]);
        const contains = (type: string, rows: { id: string }[]) =>
            rows.map((r) => sql`${auditLogTable.subjects} @> ${JSON.stringify([{ type, id: r.id }])}::jsonb`);
        conditions.push(
            or(
                ilike(auditLogTable.targetId, pattern),
                // Tags and ids typed directly.
                sql`${auditLogTable.subjects}::text ilike ${pattern}`,
                ...(users.length ? [involvesUsers(users.map((u) => u.id))] : []),
                ...contains("clan", clans),
                ...contains("cwl_clan", cwlClans),
                ...contains("coc_account", accounts),
            ),
        );
    }
    return conditions.length ? and(...conditions) : undefined;
}

export type AuditLogRow = typeof auditLogTable.$inferSelect;

type AuditRefLike = { type?: string; ref?: string; id?: string | null; discordId?: string | null };

// Entries store references only (see AuditEntity in lib/audit.ts). This walks a
// page of them, collects every referenced id by kind, and fetches each kind in
// one query, Discord's `users` alongside `audit_log_entries` pattern. Anything
// missing from the result no longer exists: a user renders as a ghost, the
// rest fall back to their id or tag.
async function resolveAuditRefs(rows: AuditLogRow[]) {
    const want: Record<string, Set<string>> = {};
    const discordIds = new Set<string>();
    const add = (type: string | undefined, id: string | null | undefined) => {
        if (!type || !id) return;
        (want[type] ??= new Set()).add(id);
    };
    const addEntity = (e: AuditRefLike | null | undefined) => {
        if (!e) return;
        if (e.type === "user" && !e.id && e.discordId) discordIds.add(e.discordId);
        else add(e.type, e.id);
    };
    const addChanges = (changes: unknown) => {
        for (const ch of (changes ?? []) as { before?: unknown; after?: unknown }[]) {
            for (const v of [ch.before, ch.after]) {
                if (v && typeof v === "object" && !Array.isArray(v)) {
                    const r = v as AuditRefLike;
                    add(r.ref, r.id);
                }
            }
        }
    };
    for (const r of rows) {
        add("user", r.actorId);
        if (r.targetType === "user") add("user", r.targetId);
        const impersonatorId = r.context?.impersonatorId;
        if (typeof impersonatorId === "string") add("user", impersonatorId);
        for (const e of (r.subjects ?? []) as AuditRefLike[]) addEntity(e);
        addChanges(r.changes);
        for (const i of (r.items ?? []) as { entity?: AuditRefLike; owner?: AuditRefLike; changes?: unknown }[]) {
            addEntity(i.entity);
            addEntity(i.owner);
            addChanges(i.changes);
        }
    }

    const ids = (type: string) => [...(want[type] ?? [])];
    const userIds = ids("user");
    const tags = ids("coc_account");
    const clanTags = ids("clan");
    const cwlClanTags = ids("cwl_clan");
    const seasonIds = ids("cwl_season").map(Number).filter(Number.isInteger);
    const keyIds = ids("api_key");

    const userMatch = [
        ...(userIds.length ? [inArray(user.id, userIds)] : []),
        ...(discordIds.size ? [inArray(account.accountId, [...discordIds])] : []),
    ];
    const [users, accounts, cwlNames, appNames, clans, cwlClans, seasons, apiKeys] = await Promise.all([
        userMatch.length
            ? db
                  .select({ id: user.id, name: user.name, image: user.image, role: user.role, discordId: account.accountId })
                  .from(user)
                  .leftJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "discord")))
                  .where(or(...userMatch))
            : [],
        tags.length
            ? db
                  .select({ tag: cocAccountTable.cocAccountTag, townHall: cocAccountTable.townHall, ownerDiscordId: cocAccountTable.discordUserId })
                  .from(cocAccountTable)
                  .where(inArray(cocAccountTable.cocAccountTag, tags))
            : [],
        // coc_account_table stores no player name; the newest application carrying the tag does.
        tags.length
            ? db
                  .selectDistinctOn([cwlApplicationTable.cocAccountTag], {
                      tag: cwlApplicationTable.cocAccountTag,
                      name: cwlApplicationTable.cocAccountName,
                  })
                  .from(cwlApplicationTable)
                  .where(inArray(cwlApplicationTable.cocAccountTag, tags))
                  .orderBy(cwlApplicationTable.cocAccountTag, desc(cwlApplicationTable.appliedAt))
            : [],
        tags.length
            ? db
                  .select({
                      tag: clanApplicationTable.cocAccountTag,
                      name: sql<string | null>`${clanApplicationTable.cocAccountData}->>'name'`,
                      townHall: sql<number | null>`(${clanApplicationTable.cocAccountData}->>'townHallLevel')::int`,
                  })
                  .from(clanApplicationTable)
                  .where(inArray(clanApplicationTable.cocAccountTag, tags))
            : [],
        clanTags.length
            ? db
                  .select({ tag: clanInfoTable.cocClanTag, name: clanInfoTable.cocClanName, code: clanInfoTable.cocClanCode })
                  .from(clanInfoTable)
                  .where(inArray(clanInfoTable.cocClanTag, clanTags))
            : [],
        cwlClanTags.length
            ? db
                  .select({ tag: cwlClanInfoTable.cocClanTag, name: cwlClanInfoTable.cocClanName, league: cwlClanInfoTable.cocClanLeague })
                  .from(cwlClanInfoTable)
                  .where(inArray(cwlClanInfoTable.cocClanTag, cwlClanTags))
            : [],
        seasonIds.length
            ? db.select({ id: cwlSeasonTable.id, name: cwlSeasonTable.name }).from(cwlSeasonTable).where(inArray(cwlSeasonTable.id, seasonIds))
            : [],
        keyIds.length ? db.select({ id: apikey.id, name: apikey.name }).from(apikey).where(inArray(apikey.id, keyIds)) : [],
    ]);

    const live = new Map(accounts.map((a) => [a.tag, a]));
    const cwlName = new Map(cwlNames.map((r) => [r.tag, r.name]));
    const app = new Map(appNames.map((r) => [r.tag, r]));
    return {
        users,
        // Every referenced tag comes back, deleted ones included, so the name derived from applications still shows.
        accounts: tags.map((tag) => ({
            tag,
            name: cwlName.get(tag) ?? app.get(tag)?.name ?? null,
            townHall: live.get(tag)?.townHall || app.get(tag)?.townHall || null,
            ownerDiscordId: live.get(tag)?.ownerDiscordId ?? null,
            linked: live.has(tag),
        })),
        clans,
        cwlClans,
        seasons,
        apiKeys,
        // Names come from Discord, which this module can't reach without an import cycle; the route resolves them.
        channelIds: ids("discord_channel"),
    };
}

export type AuditLookup = Awaited<ReturnType<typeof resolveAuditRefs>>;

export async function getAuditLog(opts: AuditLogFilters & { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0, ...filters } = opts;
    const where = await auditLogWhere(filters);
    const [entries, countResult] = await Promise.all([
        db.select().from(auditLogTable).where(where).orderBy(desc(auditLogTable.createdAt), desc(auditLogTable.id)).limit(limit).offset(offset),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(auditLogTable)
            .where(where),
    ]);
    return { entries, lookup: await resolveAuditRefs(entries), total: countResult[0]?.count ?? 0 };
}

export async function getAuditLogEntry(id: number) {
    const [entry] = await db.select().from(auditLogTable).where(eq(auditLogTable.id, id)).limit(1);
    if (!entry) return null;
    return { entry, lookup: await resolveAuditRefs([entry]) };
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

// Analytics aggregations for the admin dashboard. Aggregated in-DB so the client
// only receives chart-ready numbers; trends are bucketed by UTC day.

// Inclusive UTC start-of-day `days - 1` days ago (today included).
function utcWindowStart(days: number): Date {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    return start;
}

// Fills missing days with zero for a continuous series.
function fillDailySeries(rows: { date: string; count: number }[], days: number): { date: string; count: number }[] {
    const counts = new Map(rows.map((r) => [r.date, Number(r.count)]));
    const out: { date: string; count: number }[] = [];
    const cursor = utcWindowStart(days);
    for (let i = 0; i < days; i++) {
        const key = cursor.toISOString().slice(0, 10);
        out.push({ date: key, count: counts.get(key) ?? 0 });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
}

export async function getUserJoinTrend(days: number) {
    const rows = await db
        .select({
            date: sql<string>`to_char(date_trunc('day', ${user.createdAt}), 'YYYY-MM-DD')`,
            count: sql<number>`count(*)::int`,
        })
        .from(user)
        .where(gte(user.createdAt, utcWindowStart(days)))
        .groupBy(sql`date_trunc('day', ${user.createdAt})`);
    return { data: fillDailySeries(rows, days) };
}

export async function getAuditTrend(days: number) {
    const rows = await db
        .select({
            date: sql<string>`to_char(date_trunc('day', ${auditLogTable.createdAt}), 'YYYY-MM-DD')`,
            count: sql<number>`count(*)::int`,
        })
        .from(auditLogTable)
        .where(gte(auditLogTable.createdAt, utcWindowStart(days)))
        .groupBy(sql`date_trunc('day', ${auditLogTable.createdAt})`);
    return { data: fillDailySeries(rows, days) };
}

export async function getAuditCategories() {
    const categoryExpr = sql<string>`replace(coalesce(${auditLogTable.targetType}, 'other'), '_', ' ')`;
    const rows = await db
        .select({ category: categoryExpr, count: sql<number>`count(*)::int` })
        .from(auditLogTable)
        .groupBy(categoryExpr)
        .orderBy(desc(sql`count(*)`));
    return { data: rows };
}

// Admins (reviewer role and above) ranked by audit action count, with current
// profile info and each actor's top action types for the hover card. All time
// unless `days` is given.
export async function getTopAdminActivity(limit: number, days?: number) {
    const inWindow = days ? gte(auditLogTable.createdAt, utcWindowStart(days)) : undefined;
    const discordJoin = and(eq(account.userId, auditLogTable.actorId), eq(account.providerId, "discord"));
    const actors = await db
        .select({
            actorId: auditLogTable.actorId,
            name: user.name,
            image: user.image,
            role: user.role,
            discordId: account.accountId,
            count: sql<number>`count(*)::int`,
        })
        .from(auditLogTable)
        .innerJoin(user, eq(auditLogTable.actorId, user.id))
        .leftJoin(account, discordJoin)
        .where(and(inArray(user.role, ["reviewer", "manager", "admin", "superadmin"]), inWindow))
        .groupBy(auditLogTable.actorId, user.name, user.image, user.role, account.accountId)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);

    if (actors.length === 0) return { data: [] };

    const actorIds = actors.map((a) => a.actorId).filter((id): id is string => id !== null);
    const actionRows = await db
        .select({
            actorId: auditLogTable.actorId,
            action: auditLogTable.action,
            count: sql<number>`count(*)::int`,
        })
        .from(auditLogTable)
        .where(and(inArray(auditLogTable.actorId, actorIds), inWindow))
        .groupBy(auditLogTable.actorId, auditLogTable.action)
        .orderBy(desc(sql`count(*)`));

    const topActions = new Map<string, { action: string; count: number }[]>();
    for (const row of actionRows) {
        if (!row.actorId) continue;
        const list = topActions.get(row.actorId) ?? [];
        if (list.length < 3) list.push({ action: row.action, count: row.count });
        topActions.set(row.actorId, list);
    }

    return { data: actors.map((a) => ({ ...a, topActions: a.actorId ? (topActions.get(a.actorId) ?? []) : [] })) };
}

// Resolves the requested season (or the configured current one) to id + name.
async function resolveSeason(seasonId?: number): Promise<{ id: number; name: string } | null> {
    if (seasonId === undefined) {
        const settings = await getSettings();
        seasonId = settings?.currentCwlSeasonId ?? undefined;
    }
    if (seasonId === undefined) return null;
    const [season] = await db
        .select({ id: cwlSeasonTable.id, name: cwlSeasonTable.name })
        .from(cwlSeasonTable)
        .where(eq(cwlSeasonTable.id, seasonId));
    return season ?? null;
}

export async function getCwlAssignmentStats(seasonId?: number) {
    const season = await resolveSeason(seasonId);
    if (!season) return { assigned: 0, unassigned: 0, seasonId: null, seasonName: null };
    const [row] = await db
        .select({
            assigned: sql<number>`(count(*) filter (where ${cwlApplicationTable.assignedTo} is not null))::int`,
            unassigned: sql<number>`(count(*) filter (where ${cwlApplicationTable.assignedTo} is null))::int`,
        })
        .from(cwlApplicationTable)
        .where(eq(cwlApplicationTable.seasonId, season.id));
    return { assigned: row?.assigned ?? 0, unassigned: row?.unassigned ?? 0, seasonId: season.id, seasonName: season.name };
}

export async function getCwlParticipationStats(seasonId?: number) {
    const season = await resolveSeason(seasonId);
    if (!season) return { participated: 0, totalUsers: 0, seasonId: null, seasonName: null };
    const [[participation], [totals]] = await Promise.all([
        db
            .select({ participated: sql<number>`count(distinct ${cwlApplicationTable.discordUserId})::int` })
            .from(cwlApplicationTable)
            .where(eq(cwlApplicationTable.seasonId, season.id)),
        db.select({ total: sql<number>`count(*)::int` }).from(user),
    ]);
    return {
        participated: participation?.participated ?? 0,
        totalUsers: totals?.total ?? 0,
        seasonId: season.id,
        seasonName: season.name,
    };
}

export async function getAdminOverview() {
    const since = utcWindowStart(30);
    const [[users], [accounts], [joins], settings] = await Promise.all([
        db
            .select({
                total: sql<number>`count(*)::int`,
                newLast30d: sql<number>`(count(*) filter (where ${user.createdAt} >= ${since}))::int`,
                banned: sql<number>`(count(*) filter (where ${user.banned}))::int`,
            })
            .from(user),
        db
            .select({
                total: sql<number>`count(*)::int`,
                external: sql<number>`(count(*) filter (where ${cocAccountTable.isExternal}))::int`,
            })
            .from(cocAccountTable),
        db
            .select({ pending: sql<number>`count(*)::int` })
            .from(clanApplicationTable)
            .where(eq(clanApplicationTable.status, "pending")),
        getSettings(),
    ]);
    return {
        users: { total: users?.total ?? 0, newLast30d: users?.newLast30d ?? 0, banned: users?.banned ?? 0 },
        cocAccounts: { total: accounts?.total ?? 0, external: accounts?.external ?? 0 },
        pendingJoinApplications: joins?.pending ?? 0,
        status: {
            applicationsEnabled: settings?.applicationsEnabled ?? false,
            cwlEnabled: settings?.cwlEnabled ?? false,
            maintenance: settings?.siteMaintenanceMode ?? false,
        },
    };
}

// One season's CWL roster at a glance: totals, per-clan placement and the town
// hall spread of everyone who applied.
export async function getCwlSeasonOverview(seasonId?: number) {
    const season = await resolveSeason(seasonId);
    if (!season) return { seasonId: null, seasonName: null, applications: 0, applicants: 0, assigned: 0, bonuses: 0, byClan: [], byTownHall: [] };
    const inSeason = eq(cwlApplicationTable.seasonId, season.id);
    const [[totals], [bonuses], byClan, byTownHall] = await Promise.all([
        db
            .select({
                applications: sql<number>`count(*)::int`,
                applicants: sql<number>`count(distinct ${cwlApplicationTable.discordUserId})::int`,
                assigned: sql<number>`(count(*) filter (where ${cwlApplicationTable.assignedTo} is not null))::int`,
            })
            .from(cwlApplicationTable)
            .where(inSeason),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(cwlBonusTable)
            .where(eq(cwlBonusTable.seasonId, season.id)),
        db
            .select({
                tag: cwlClanInfoTable.cocClanTag,
                name: cwlClanInfoTable.cocClanName,
                league: cwlClanInfoTable.cocClanLeague,
                count: sql<number>`count(${cwlApplicationTable.id})::int`,
            })
            .from(cwlClanInfoTable)
            .leftJoin(cwlApplicationTable, and(eq(cwlApplicationTable.assignedTo, cwlClanInfoTable.cocClanTag), inSeason))
            .groupBy(cwlClanInfoTable.cocClanTag, cwlClanInfoTable.cocClanName, cwlClanInfoTable.cocClanLeague)
            .orderBy(desc(sql`count(${cwlApplicationTable.id})`), asc(cwlClanInfoTable.cocClanName)),
        db
            .select({ townHall: sql<number>`coalesce(${cocAccountTable.townHall}, 0)`, count: sql<number>`count(*)::int` })
            .from(cwlApplicationTable)
            .leftJoin(cocAccountTable, eq(cocAccountTable.cocAccountTag, cwlApplicationTable.cocAccountTag))
            .where(inSeason)
            .groupBy(sql`coalesce(${cocAccountTable.townHall}, 0)`)
            .orderBy(desc(sql`coalesce(${cocAccountTable.townHall}, 0)`)),
    ]);
    return {
        seasonId: season.id,
        seasonName: season.name,
        applications: totals?.applications ?? 0,
        applicants: totals?.applicants ?? 0,
        assigned: totals?.assigned ?? 0,
        bonuses: bonuses?.count ?? 0,
        byClan,
        byTownHall,
    };
}

/* ---------------------------------- API keys --------------------------------- */

// Ownership check for every stats query below. Returns null for a key that
// doesn't exist *or* isn't the caller's, so the routes can answer 404 either
// way and key ids stay unenumerable.
export async function getOwnedApiKey(keyId: string, userId: string) {
    const rows = await db
        .select({
            id: apikey.id,
            name: apikey.name,
            start: apikey.start,
            prefix: apikey.prefix,
            enabled: apikey.enabled,
            permissions: apikey.permissions,
            requestCount: apikey.requestCount,
            remaining: apikey.remaining,
            rateLimitEnabled: apikey.rateLimitEnabled,
            rateLimitMax: apikey.rateLimitMax,
            rateLimitTimeWindow: apikey.rateLimitTimeWindow,
            lastRequest: apikey.lastRequest,
            expiresAt: apikey.expiresAt,
            createdAt: apikey.createdAt,
        })
        .from(apikey)
        .where(and(eq(apikey.id, keyId), eq(apikey.referenceId, userId)))
        .limit(1);
    return rows[0] ?? null;
}

export async function countApiKeysForUser(userId: string): Promise<number> {
    const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(apikey)
        .where(eq(apikey.referenceId, userId));
    return row?.count ?? 0;
}

// Disables every key belonging to a user. Called when API access is revoked —
// without this the grant flag flips but live credentials keep working.
export async function disableApiKeysForUser(userId: string): Promise<number> {
    const rows = await db.update(apikey).set({ enabled: false }).where(eq(apikey.referenceId, userId)).returning({ id: apikey.id });
    return rows.length;
}

export async function getApiKeyUsageDaily(keyId: string, days: number) {
    const rows = await db
        .select({
            date: sql<string>`to_char(date_trunc('day', ${apiKeyUsageTable.createdAt}), 'YYYY-MM-DD')`,
            count: sql<number>`count(*)::int`,
        })
        .from(apiKeyUsageTable)
        .where(and(eq(apiKeyUsageTable.keyId, keyId), gte(apiKeyUsageTable.createdAt, utcWindowStart(days))))
        .groupBy(sql`date_trunc('day', ${apiKeyUsageTable.createdAt})`);
    return { data: fillDailySeries(rows, days) };
}

export async function getApiKeyUsageSummary(keyId: string, days: number) {
    const [row] = await db
        .select({
            requests: sql<number>`count(*)::int`,
            errors: sql<number>`count(*) filter (where ${apiKeyUsageTable.status} >= 400)::int`,
            p50: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${apiKeyUsageTable.durationMs}), 0)::int`,
            p95: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${apiKeyUsageTable.durationMs}), 0)::int`,
        })
        .from(apiKeyUsageTable)
        .where(and(eq(apiKeyUsageTable.keyId, keyId), gte(apiKeyUsageTable.createdAt, utcWindowStart(days))));

    const requests = row?.requests ?? 0;
    const errors = row?.errors ?? 0;
    return {
        requests,
        errors,
        errorRate: requests > 0 ? errors / requests : 0,
        p50DurationMs: row?.p50 ?? 0,
        p95DurationMs: row?.p95 ?? 0,
    };
}

export async function getApiKeyUsageEndpoints(keyId: string, days: number, limit: number) {
    const rows = await db
        .select({
            method: apiKeyUsageTable.method,
            path: apiKeyUsageTable.path,
            count: sql<number>`count(*)::int`,
            avgDurationMs: sql<number>`coalesce(avg(${apiKeyUsageTable.durationMs}), 0)::int`,
        })
        .from(apiKeyUsageTable)
        .where(and(eq(apiKeyUsageTable.keyId, keyId), gte(apiKeyUsageTable.createdAt, utcWindowStart(days))))
        .groupBy(apiKeyUsageTable.method, apiKeyUsageTable.path)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);
    return { data: rows };
}

export async function getApiKeyUsageStatus(keyId: string, days: number) {
    // 429 is split out of the 4xx bucket deliberately — "you're being throttled"
    // is a different problem from "you're sending bad requests", and collapsing
    // them hides the one a consumer can act on.
    const statusClassExpr = sql<string>`
        case
            when ${apiKeyUsageTable.status} = 429 then '429'
            when ${apiKeyUsageTable.status} >= 500 then '5xx'
            when ${apiKeyUsageTable.status} >= 400 then '4xx'
            when ${apiKeyUsageTable.status} >= 300 then '3xx'
            else '2xx'
        end`;
    const rows = await db
        .select({ statusClass: statusClassExpr, count: sql<number>`count(*)::int` })
        .from(apiKeyUsageTable)
        .where(and(eq(apiKeyUsageTable.keyId, keyId), gte(apiKeyUsageTable.createdAt, utcWindowStart(days))))
        .groupBy(statusClassExpr)
        .orderBy(desc(sql`count(*)`));
    return { data: rows };
}
