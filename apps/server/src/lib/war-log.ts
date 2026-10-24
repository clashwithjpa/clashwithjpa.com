import { EventEmitter } from "node:events";
import { cocClient } from "@/lib/coc";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { clanInfoTable, clanWarTable } from "@/lib/db/schema";
import { ClashAPIError, type APIClanWar, type APIWarClan } from "@repo/clashofclans-api";
import * as Sentry from "@sentry/node";
import { and, between, desc, eq, isNotNull, lt, sql } from "drizzle-orm";
import { Redis } from "ioredis";

const redis = new Redis(config.JPA_REDIS_URL);

const POLL_MS = 60_000;
// The CoC API caches a current war for up to two minutes, so anything shorter only re-reads its cache.
const CURRENT_WAR_TTL_SECONDS = 30;
const BACKFILL_TTL_SECONDS = 6 * 60 * 60;
const CLASHKING_URL = "https://api.clashk.ing";

type Side = "clan" | "opponent";
type WarRow = typeof clanWarTable.$inferSelect;

export type WarMember = {
    tag: string;
    name: string;
    th: number;
    pos: number;
    attacks: number;
    stars: number;
    newStars: number;
    destruction: number;
    defenses: number;
    bestDefense: { stars: number; destruction: number } | null;
};

export type WarAttack = {
    order: number;
    side: Side;
    attackerTag: string;
    defenderTag: string;
    attackerPos: number;
    defenderPos: number;
    attackerTh: number;
    defenderTh: number;
    // The attacker's 1st or 2nd hit this war.
    attackNo: number;
    stars: number;
    newStars: number;
    destruction: number;
    duration: number;
    fresh: boolean;
    seenAt: string | null;
};

/** Fired with a clan tag whenever that clan's stored war changes, or after a poll checked it. */
export const warEvents = new EventEmitter();
warEvents.setMaxListeners(0);

const lastChecked = new Map<string, Date>();
export const getLastChecked = (tag: string) => lastChecked.get(normalizeTag(tag)) ?? null;

export function normalizeTag(tag: string): string {
    return `#${tag.trim().toUpperCase().replace(/^#+/, "")}`;
}

// Supercell sends compact ISO 8601 (20240321T060136.000Z), which Date can't parse as-is.
function parseCocTime(s: string): Date {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}.000Z`);
}

function warResult(war: Pick<APIClanWar, "state" | "clan" | "opponent">): string | null {
    if (war.state !== "warEnded") return null;
    const { clan: a, opponent: b } = war;
    if (a.stars !== b.stars) return a.stars > b.stars ? "win" : "lose";
    if (a.destructionPercentage !== b.destructionPercentage) return a.destructionPercentage > b.destructionPercentage ? "win" : "lose";
    return "tie";
}

function warColumns(clanTag: string, war: APIClanWar) {
    return {
        clanTag,
        state: war.state,
        result: warResult(war),
        teamSize: war.teamSize,
        attacksPerMember: war.attacksPerMember ?? 2,
        battleModifier: war.battleModifier ?? null,
        preparationStartTime: parseCocTime(war.preparationStartTime),
        startTime: parseCocTime(war.startTime),
        endTime: parseCocTime(war.endTime),
        opponentTag: war.opponent.tag,
        opponentName: war.opponent.name,
        opponentBadge: war.opponent.badgeUrls?.small ?? null,
        clanStars: war.clan.stars,
        clanDestruction: war.clan.destructionPercentage,
        clanAttacks: war.clan.attacks ?? 0,
        opponentStars: war.opponent.stars,
        opponentDestruction: war.opponent.destructionPercentage,
        opponentAttacks: war.opponent.attacks ?? 0,
        data: war,
    };
}

const attackOrders = (war: APIClanWar) =>
    [...war.clan.members, ...war.opponent.members].flatMap((m) => (m.attacks ?? []).map((a) => String(a.order)));

// ClashKing's copy of a war can end a few seconds off the official one, and a clan's wars
// are a day or more apart, so a war is matched by an end time close to it.
const MATCH_WINDOW_MS = 30 * 60_000;

async function findWar(clanTag: string, endTime: Date) {
    const rows = await db
        .select()
        .from(clanWarTable)
        .where(
            and(
                eq(clanWarTable.clanTag, clanTag),
                between(clanWarTable.endTime, new Date(endTime.getTime() - MATCH_WINDOW_MS), new Date(endTime.getTime() + MATCH_WINDOW_MS)),
            ),
        )
        .limit(1);
    return rows[0] ?? null;
}

async function recordCurrentWar(clanTag: string, war: APIClanWar): Promise<boolean> {
    const now = new Date();
    const columns = warColumns(clanTag, war);
    const existing = await findWar(clanTag, columns.endTime);
    const orders = attackOrders(war);

    if (!existing) {
        // Hits already on the board when tracking starts have no known time; null keeps them from
        // being stamped as "just seen" on the next poll.
        const seen: Record<string, string | null> = Object.fromEntries(orders.map((o) => [o, null]));
        await db
            .insert(clanWarTable)
            .values({ ...columns, source: "live", attackSeenAt: seen, trackedSince: now })
            .onConflictDoNothing();
        return true;
    }

    const seen: Record<string, string | null> = { ...existing.attackSeenAt };
    const fresh = orders.filter((o) => !(o in seen));
    // A backfilled row picked up live has no clock yet, so its existing hits stay timeless too.
    const stamp = existing.trackedSince ? now.toISOString() : null;
    for (const o of fresh) seen[o] = stamp;

    const unchanged =
        existing.source === "live" &&
        !fresh.length &&
        existing.state === war.state &&
        existing.clanStars === columns.clanStars &&
        existing.opponentStars === columns.opponentStars &&
        existing.clanDestruction === columns.clanDestruction &&
        existing.opponentDestruction === columns.opponentDestruction;
    if (unchanged) return false;

    await db
        .update(clanWarTable)
        .set({
            ...columns,
            source: "live",
            attackSeenAt: seen,
            trackedSince: existing.trackedSince ?? now,
            updatedAt: now,
        })
        .where(eq(clanWarTable.id, existing.id));
    return true;
}

async function familyClanTags(): Promise<string[]> {
    const rows = await db.select({ tag: clanInfoTable.cocClanTag }).from(clanInfoTable);
    return rows.map((r) => normalizeTag(r.tag));
}

export async function isFamilyClan(tag: string): Promise<boolean> {
    return (await familyClanTags()).includes(normalizeTag(tag));
}

async function pollClan(tag: string) {
    try {
        const war = await cocClient.getCurrentWar(tag, { cacheTTL: CURRENT_WAR_TTL_SECONDS });
        lastChecked.set(tag, new Date());
        // CWL rounds come through here with one attack each; they belong to the CWL pages, not this log.
        if (war.state !== "notInWar" && war.clan?.tag && (war.attacksPerMember ?? 2) > 1) {
            if (normalizeTag(war.clan.tag) !== tag) return;
            if (await recordCurrentWar(tag, war)) warEvents.emit("update", tag);
        }
        warEvents.emit("checked", tag);
    } catch (error) {
        // A private war log answers 403; that's the clan's setting, not an outage.
        if (error instanceof ClashAPIError && error.status === 403) return;
        Sentry.captureException(error, { extra: { clanTag: tag } });
    }
}

// --- History backfill -------------------------------------------------------------

function orient(war: APIClanWar, tag: string): APIClanWar | null {
    if (normalizeTag(war.clan.tag) === tag) return war;
    if (normalizeTag(war.opponent.tag) === tag) return { ...war, clan: war.opponent, opponent: war.clan };
    return null;
}

async function fetchClashKingWars(tag: string): Promise<APIClanWar[]> {
    const res = await fetch(`${CLASHKING_URL}/v2/clan/${encodeURIComponent(tag)}/wars?limit=60`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`ClashKing answered ${res.status}`);
    const body = (await res.json()) as { items?: APIClanWar[] };
    return (body.items ?? []).flatMap((w) => {
        const war = w?.clan && w.opponent && w.endTime ? orient(w, tag) : null;
        return war && war.state === "warEnded" && (war.attacksPerMember ?? 2) > 1 ? [war] : [];
    });
}

// Rows that never got their final poll (the server was down when the war ended) are
// still stuck mid-war. A stored or summary copy from elsewhere can settle them.
const isStale = (row: WarRow) => row.state !== "warEnded" && row.endTime.getTime() < Date.now();
// A war settled from the war log summary keeps the hits the tracker saw, which can be short of its totals.
const isIncomplete = (row: WarRow) => !!row.data && attackOrders(row.data as APIClanWar).length < row.clanAttacks + row.opponentAttacks;

async function backfillFromClashKing(tag: string): Promise<number> {
    let changed = 0;
    for (const war of await fetchClashKingWars(tag)) {
        const columns = warColumns(tag, war);
        const existing = await findWar(tag, columns.endTime);
        if (!existing) {
            await db
                .insert(clanWarTable)
                .values({ ...columns, source: "clashking" })
                .onConflictDoNothing();
            changed++;
        } else if (!existing.data || isStale(existing) || isIncomplete(existing)) {
            const source = existing.source === "live" ? "live" : "clashking";
            // The stored end time came from the CoC API, which the tracker matches on.
            const { endTime: _, ...update } = columns;
            await db
                .update(clanWarTable)
                .set({ ...update, source, updatedAt: new Date() })
                .where(eq(clanWarTable.id, existing.id));
            changed++;
        }
    }
    return changed;
}

async function backfillFromWarLog(tag: string): Promise<number> {
    let log;
    try {
        log = await cocClient.getClanWarLog(tag, { limit: 60 });
    } catch (error) {
        if (error instanceof ClashAPIError && error.status === 403) return 0;
        throw error;
    }

    let changed = 0;
    for (const entry of log.items) {
        // CWL rounds show up here without an opponent tag or a result.
        if (!entry.result || !entry.opponent.tag) continue;
        const endTime = parseCocTime(entry.endTime);
        const totals = {
            state: "warEnded",
            result: entry.result,
            clanStars: entry.clan.stars,
            clanDestruction: entry.clan.destructionPercentage,
            clanAttacks: entry.clan.attacks ?? 0,
            opponentStars: entry.opponent.stars,
            opponentDestruction: entry.opponent.destructionPercentage,
        };
        const existing = await findWar(tag, endTime);
        if (!existing) {
            await db
                .insert(clanWarTable)
                .values({
                    ...totals,
                    clanTag: tag,
                    source: "warlog",
                    teamSize: entry.teamSize,
                    attacksPerMember: entry.attacksPerMember ?? 2,
                    battleModifier: entry.battleModifier ?? null,
                    endTime,
                    opponentTag: entry.opponent.tag,
                    opponentName: entry.opponent.name ?? null,
                    opponentBadge: entry.opponent.badgeUrls?.small ?? null,
                })
                .onConflictDoNothing();
            changed++;
        } else if (isStale(existing)) {
            await db
                .update(clanWarTable)
                .set({ ...totals, updatedAt: new Date() })
                .where(eq(clanWarTable.id, existing.id));
            changed++;
        }
    }
    return changed;
}

/**
 * Fills a clan's history from ClashKing (full wars, a few days behind) and the public
 * war log (totals only, right up to date). Runs at most once per clan every few hours.
 */
export async function ensureBackfill(tag: string): Promise<void> {
    tag = normalizeTag(tag);
    const key = `war-log:backfill:${tag}`;
    const claimed = await redis.set(key, new Date().toISOString(), "EX", BACKFILL_TTL_SECONDS, "NX");
    if (!claimed) return;

    let changed = 0;
    for (const step of [backfillFromClashKing, backfillFromWarLog]) {
        try {
            changed += await step(tag);
        } catch (error) {
            Sentry.captureException(error, { extra: { clanTag: tag, step: step.name } });
        }
    }
    if (changed) warEvents.emit("update", tag);
}

// --- Reads ------------------------------------------------------------------------

const summaryColumns = {
    id: clanWarTable.id,
    clanTag: clanWarTable.clanTag,
    state: clanWarTable.state,
    result: clanWarTable.result,
    source: clanWarTable.source,
    teamSize: clanWarTable.teamSize,
    attacksPerMember: clanWarTable.attacksPerMember,
    preparationStartTime: clanWarTable.preparationStartTime,
    startTime: clanWarTable.startTime,
    endTime: clanWarTable.endTime,
    opponentTag: clanWarTable.opponentTag,
    opponentName: clanWarTable.opponentName,
    opponentBadge: clanWarTable.opponentBadge,
    clanStars: clanWarTable.clanStars,
    clanDestruction: clanWarTable.clanDestruction,
    clanAttacks: clanWarTable.clanAttacks,
    opponentStars: clanWarTable.opponentStars,
    opponentDestruction: clanWarTable.opponentDestruction,
    opponentAttacks: clanWarTable.opponentAttacks,
    hasDetail: sql<boolean>`${clanWarTable.data} is not null`,
    tracked: sql<boolean>`${clanWarTable.trackedSince} is not null`,
};

export async function getWarLogClans() {
    const [clans, latest] = await Promise.all([
        db
            .select({ tag: clanInfoTable.cocClanTag, code: clanInfoTable.cocClanCode, name: clanInfoTable.cocClanName })
            .from(clanInfoTable)
            .orderBy(clanInfoTable.cocClanCode),
        db
            .selectDistinctOn([clanWarTable.clanTag], {
                ...summaryColumns,
                badge: sql<string | null>`${clanWarTable.data}->'clan'->'badgeUrls'->>'small'`,
                name: sql<string | null>`${clanWarTable.data}->'clan'->>'name'`,
            })
            .from(clanWarTable)
            .orderBy(clanWarTable.clanTag, desc(clanWarTable.endTime)),
    ]);
    const byTag = new Map(latest.map((w) => [w.clanTag, w]));
    return clans.map((clan) => {
        const tag = normalizeTag(clan.tag);
        const war = byTag.get(tag);
        if (!war) return { tag, code: clan.code, name: clan.name, badge: null, war: null };
        const { badge, name, ...summary } = war;
        return { tag, code: clan.code, name: name ?? clan.name, badge, war: summary };
    });
}

export async function listClanWars(tag: string, { limit, before }: { limit: number; before?: number }) {
    const rows = await db
        .select(summaryColumns)
        .from(clanWarTable)
        .where(and(eq(clanWarTable.clanTag, normalizeTag(tag)), before ? lt(clanWarTable.id, before) : undefined))
        .orderBy(desc(clanWarTable.endTime))
        .limit(limit + 1);
    return { wars: rows.slice(0, limit), hasMore: rows.length > limit };
}

function sideMembers(clan: APIWarClan): WarMember[] {
    return [...clan.members]
        .sort((a, b) => a.mapPosition - b.mapPosition)
        .map((m, i) => ({
            tag: m.tag,
            name: m.name,
            th: m.townhallLevel,
            pos: i + 1,
            attacks: m.attacks?.length ?? 0,
            stars: 0,
            newStars: 0,
            destruction: 0,
            defenses: m.opponentAttacks,
            bestDefense: m.bestOpponentAttack ? { stars: m.bestOpponentAttack.stars, destruction: m.bestOpponentAttack.destructionPercentage } : null,
        }));
}

/** Ranks both lineups and replays every hit in order, so each one knows what it added. */
export function deriveWar(war: APIClanWar, seenAt: Record<string, string | null> = {}) {
    const clan = sideMembers(war.clan);
    const opponent = sideMembers(war.opponent);
    const byTag = new Map([...clan, ...opponent].map((m) => [m.tag, m]));

    const raw = [
        ...war.clan.members.flatMap((m) => (m.attacks ?? []).map((a) => ({ ...a, side: "clan" as Side }))),
        ...war.opponent.members.flatMap((m) => (m.attacks ?? []).map((a) => ({ ...a, side: "opponent" as Side }))),
    ].sort((a, b) => a.order - b.order);

    const best = new Map<string, number>();
    const hits = new Map<string, number>();
    const attacks: WarAttack[] = [];
    for (const a of raw) {
        const attacker = byTag.get(a.attackerTag);
        const defender = byTag.get(a.defenderTag);
        if (!attacker || !defender) continue;
        const prev = best.get(a.defenderTag);
        const newStars = Math.max(0, a.stars - (prev ?? 0));
        best.set(a.defenderTag, Math.max(prev ?? 0, a.stars));
        const attackNo = (hits.get(a.attackerTag) ?? 0) + 1;
        hits.set(a.attackerTag, attackNo);

        attacker.stars += a.stars;
        attacker.newStars += newStars;
        attacker.destruction += a.destructionPercentage;

        attacks.push({
            order: a.order,
            side: a.side,
            attackerTag: a.attackerTag,
            defenderTag: a.defenderTag,
            attackerPos: attacker.pos,
            defenderPos: defender.pos,
            attackerTh: attacker.th,
            defenderTh: defender.th,
            attackNo,
            stars: a.stars,
            newStars,
            destruction: a.destructionPercentage,
            duration: a.duration,
            fresh: prev === undefined,
            seenAt: seenAt[String(a.order)] ?? null,
        });
    }
    return { clan, opponent, attacks };
}

function toDetail(row: WarRow) {
    const war = row.data as APIClanWar | null;
    const derived = war ? deriveWar(war, row.attackSeenAt) : null;
    const side = (s: Side) => {
        const live = war?.[s];
        return {
            tag: s === "clan" ? row.clanTag : row.opponentTag,
            name: live?.name ?? (s === "opponent" ? row.opponentName : null),
            badge: live?.badgeUrls?.small ?? (s === "opponent" ? row.opponentBadge : null),
            stars: s === "clan" ? row.clanStars : row.opponentStars,
            destruction: s === "clan" ? row.clanDestruction : row.opponentDestruction,
            attacks: s === "clan" ? row.clanAttacks : row.opponentAttacks,
            members: derived?.[s] ?? [],
        };
    };
    return {
        id: row.id,
        clanTag: row.clanTag,
        state: row.state,
        result: row.result,
        source: row.source,
        teamSize: row.teamSize,
        attacksPerMember: row.attacksPerMember,
        battleModifier: row.battleModifier,
        preparationStartTime: row.preparationStartTime?.toISOString() ?? null,
        startTime: row.startTime?.toISOString() ?? null,
        endTime: row.endTime.toISOString(),
        trackedSince: row.trackedSince?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
        hasDetail: !!war,
        clan: side("clan"),
        opponent: side("opponent"),
        attacks: derived?.attacks ?? [],
    };
}
export type WarDetail = ReturnType<typeof toDetail>;

export async function getWarDetail(tag: string, id: number): Promise<WarDetail | null> {
    const rows = await db
        .select()
        .from(clanWarTable)
        .where(and(eq(clanWarTable.id, id), eq(clanWarTable.clanTag, normalizeTag(tag))))
        .limit(1);
    return rows[0] ? toDetail(rows[0]) : null;
}

// Every open live stream of a clan asks for the same latest war on each update, so it is
// built once per change rather than once per viewer.
const latestCache = new Map<string, Promise<WarDetail | null>>();
warEvents.on("update", (tag: string) => latestCache.delete(tag));

export function getLatestWarDetail(tag: string): Promise<WarDetail | null> {
    tag = normalizeTag(tag);
    let cached = latestCache.get(tag);
    if (!cached) {
        cached = db
            .select()
            .from(clanWarTable)
            .where(eq(clanWarTable.clanTag, tag))
            .orderBy(desc(clanWarTable.endTime))
            .limit(1)
            .then((rows) => (rows[0] ? toDetail(rows[0]) : null));
        cached.catch(() => latestCache.delete(tag));
        latestCache.set(tag, cached);
    }
    return cached;
}

export type PlayerWarStats = {
    tag: string;
    name: string;
    th: number;
    wars: number;
    attacksUsed: number;
    attacksAvailable: number;
    missed: number;
    missedStreak: number;
    stars: number;
    newStars: number;
    triples: number;
    zeroes: number;
    avgDestruction: number;
    mirrorFirst: number;
    firstAttacks: number;
    defenses: number;
    triplesConceded: number;
    // Attacks used per war, newest first; null where the player wasn't in that war.
    recent: (number | null)[];
};

/** Per-player totals over the clan's last `limit` finished wars that have full detail. */
export async function getPlayerWarStats(tag: string, limit: number) {
    const rows = await db
        .select({ id: clanWarTable.id, endTime: clanWarTable.endTime, data: clanWarTable.data, apm: clanWarTable.attacksPerMember })
        .from(clanWarTable)
        .where(and(eq(clanWarTable.clanTag, normalizeTag(tag)), eq(clanWarTable.state, "warEnded"), isNotNull(clanWarTable.data)))
        .orderBy(desc(clanWarTable.endTime))
        .limit(limit);

    const players = new Map<string, PlayerWarStats>();
    const destructionSum = new Map<string, number>();
    // A streak counts back from the newest war and stops at the first one with no missed hit.
    const streakClosed = new Set<string>();
    rows.forEach((row, warIndex) => {
        const { clan, attacks } = deriveWar(row.data as APIClanWar);
        for (const m of clan) {
            let p = players.get(m.tag);
            if (!p) {
                // Rows run newest first, so the first sighting carries the current name and TH.
                p = {
                    tag: m.tag,
                    name: m.name,
                    th: m.th,
                    wars: 0,
                    attacksUsed: 0,
                    attacksAvailable: 0,
                    missed: 0,
                    missedStreak: 0,
                    stars: 0,
                    newStars: 0,
                    triples: 0,
                    zeroes: 0,
                    avgDestruction: 0,
                    mirrorFirst: 0,
                    firstAttacks: 0,
                    defenses: 0,
                    triplesConceded: 0,
                    recent: Array(rows.length).fill(null),
                };
                players.set(m.tag, p);
            }
            const missed = Math.max(0, row.apm - m.attacks);
            p.wars++;
            p.attacksUsed += m.attacks;
            p.attacksAvailable += row.apm;
            p.missed += missed;
            if (!streakClosed.has(m.tag)) {
                if (missed > 0) p.missedStreak++;
                else streakClosed.add(m.tag);
            }
            p.stars += m.stars;
            p.newStars += m.newStars;
            destructionSum.set(m.tag, (destructionSum.get(m.tag) ?? 0) + m.destruction);
            p.defenses += m.defenses;
            if (m.bestDefense?.stars === 3) p.triplesConceded++;
            p.recent[warIndex] = m.attacks;
        }
        for (const a of attacks) {
            if (a.side !== "clan") continue;
            const p = players.get(a.attackerTag);
            if (!p) continue;
            if (a.stars === 3) p.triples++;
            if (a.stars === 0) p.zeroes++;
            if (a.attackNo === 1) {
                p.firstAttacks++;
                if (a.attackerPos === a.defenderPos) p.mirrorFirst++;
            }
        }
    });

    const stats = [...players.values()].map((p) => ({
        ...p,
        avgDestruction: p.attacksUsed ? Math.round(((destructionSum.get(p.tag) ?? 0) / p.attacksUsed) * 10) / 10 : 0,
    }));
    return { wars: rows.map((r) => ({ id: r.id, endTime: r.endTime.toISOString() })), players: stats };
}

// --- Scheduler --------------------------------------------------------------------

let started = false;

async function tick(): Promise<void> {
    try {
        const tags = await familyClanTags();
        for (const tag of tags) await pollClan(tag);
    } catch (error) {
        Sentry.captureException(error);
    } finally {
        setTimeout(() => void tick(), POLL_MS);
    }
}

/** Starts the self-scheduling war tracker. Idempotent. */
export function startWarTracker(): void {
    if (started) return;
    started = true;
    void tick();
}
