import { cocClient } from "@/lib/coc";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { getCwlPingSettings, getSettings, recordCwlPingRun } from "@/lib/db/functions";
import { cwlApplicationTable, cwlClanInfoTable, cwlSeasonTable } from "@/lib/db/schema";
import * as Sentry from "@sentry/node";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    REST,
    Routes,
    SeparatorBuilder,
    subtext,
    TextDisplayBuilder,
    type RESTPostAPIChannelMessageJSONBody,
} from "discord.js";
import { eq, sql } from "drizzle-orm";

export type CwlPingClan = { tag: string; name: string; pending: number };

export type CwlPingRunSummary = {
    ranAt: Date;
    seasonId: number | null;
    clansChecked: number;
    clansPinged: number;
    usersPinged: number;
    clans: CwlPingClan[];
    skippedReason?: string;
};

const MENTION_CHUNK_MAX_LENGTH = 1900;
const DISABLED_POLL_MS = 60_000;

const rest = new REST().setToken(config.JPA_DISCORD_BOT_TOKEN);

type Message = RESTPostAPIChannelMessageJSONBody;

function normalizeTag(tag: string): string {
    return `#${tag.trim().toUpperCase().replace(/^#+/, "")}`;
}

async function resolveSeasonId(): Promise<number | null> {
    const settings = await getSettings();
    if (settings?.currentCwlSeasonId != null) return settings.currentCwlSeasonId;

    const latest = await db.select({ id: sql<number | null>`max(${cwlSeasonTable.id})` }).from(cwlSeasonTable);
    return latest[0]?.id ?? null;
}

function chunkUserIds(userIds: string[]): string[][] {
    const chunks: string[][] = [];
    let current: string[] = [];
    let currentLength = 0;

    for (const id of userIds) {
        const mentionLength = id.length + 4;
        if (current.length > 0 && currentLength + mentionLength > MENTION_CHUNK_MAX_LENGTH) {
            chunks.push(current);
            current = [];
            currentLength = 0;
        }
        current.push(id);
        currentLength += mentionLength;
    }
    if (current.length > 0) chunks.push(current);

    return chunks;
}

function buildPingMessages(clanName: string, clanTag: string, userIds: string[]): Message[] {
    const encodedTag = encodeURIComponent(normalizeTag(clanTag));
    const clanLink = `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodedTag}`;
    const chunks = chunkUserIds(userIds);

    const openClanRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Open Clan").setEmoji({ name: "🎮" }).setURL(clanLink),
    );

    const first: Message = {
        flags: MessageFlags.IsComponentsV2,
        allowed_mentions: { parse: [], users: chunks[0] ?? [] },
        components: [
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## ⚔️ Clan War League Summons"),
                    new TextDisplayBuilder().setContent("**Chief! Your clan needs you for Clan War League!**"),
                    new TextDisplayBuilder().setContent(`🏰 **Clan**: ${clanName}`),
                    new TextDisplayBuilder().setContent(`🏷️ **Tag**: \`${normalizeTag(clanTag)}\``),
                    new TextDisplayBuilder().setContent(`👨‍🌾 **Chiefs Needed**: ${userIds.length}`),
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(subtext((chunks[0] ?? []).map((id) => `<@${id}>`).join(" ")) + "\n"),
                    new TextDisplayBuilder().setContent(subtext("⏰ War starts soon, don't keep your clanmates waiting!")),
                )
                .toJSON(),
            openClanRow.toJSON(),
        ],
    };

    const followUps: Message[] = chunks.slice(1).map((chunk) => ({
        flags: MessageFlags.IsComponentsV2,
        allowed_mentions: { parse: [], users: chunk },
        components: [new TextDisplayBuilder().setContent(subtext(chunk.map((id) => `<@${id}>`).join(" "))).toJSON()],
    }));

    return [first, ...followUps];
}

async function send(channelId: string, body: Message) {
    await rest.post(Routes.channelMessages(channelId), { body });
}

async function sendClanPing(channelId: string, clanName: string, clanTag: string, userIds: string[]): Promise<boolean> {
    try {
        for (const message of buildPingMessages(clanName, clanTag, userIds)) await send(channelId, message);
        return true;
    } catch (error) {
        Sentry.captureException(error, { extra: { clanTag } });
        return false;
    }
}

export async function sendTestPing(channelId: string): Promise<void> {
    await send(channelId, {
        flags: MessageFlags.IsComponentsV2,
        components: [new TextDisplayBuilder().setContent("✅ **CWL Ping test**: the bot can post in this channel.").toJSON()],
    });
}

// A dry run finds who would be pinged without sending anything or recording a run.
export async function runCwlPingCheck({ dryRun = false } = {}): Promise<CwlPingRunSummary> {
    const ranAt = new Date();
    const base: CwlPingRunSummary = { ranAt, seasonId: null, clansChecked: 0, clansPinged: 0, usersPinged: 0, clans: [] };
    const record = async (summary: string) => {
        if (!dryRun) await recordCwlPingRun({ ranAt, summary });
    };
    const skip = async (skippedReason: string, seasonId: number | null = null) => {
        await record(skippedReason);
        return { ...base, seasonId, skippedReason };
    };

    try {
        const pingSettings = await getCwlPingSettings();
        const channelId = pingSettings?.channelId;
        if (!channelId && !dryRun) return await skip("No channel selected");

        const seasonId = await resolveSeasonId();
        if (seasonId == null) return await skip("No CWL season is configured");

        const assigned = await db
            .select({
                discordUserId: cwlApplicationTable.discordUserId,
                cocAccountTag: cwlApplicationTable.cocAccountTag,
                clanTag: cwlClanInfoTable.cocClanTag,
                clanName: cwlClanInfoTable.cocClanName,
            })
            .from(cwlApplicationTable)
            .innerJoin(cwlClanInfoTable, eq(cwlClanInfoTable.cocClanTag, cwlApplicationTable.assignedTo))
            .where(eq(cwlApplicationTable.seasonId, seasonId));

        if (assigned.length === 0) return await skip("No assigned CWL applications this season", seasonId);

        const byClan = new Map<string, { clanName: string; applicants: { discordUserId: string; cocAccountTag: string }[] }>();
        for (const row of assigned) {
            const tag = normalizeTag(row.clanTag);
            if (!byClan.has(tag)) byClan.set(tag, { clanName: row.clanName, applicants: [] });
            byClan.get(tag)!.applicants.push({ discordUserId: row.discordUserId, cocAccountTag: row.cocAccountTag });
        }

        let clansPinged = 0;
        let usersPinged = 0;
        const clans: CwlPingClan[] = [];

        for (const [clanTag, { clanName, applicants }] of byClan) {
            try {
                const clan = await cocClient.getClan(clanTag);
                const memberTags = new Set(clan.memberList.map((m) => normalizeTag(m.tag)));

                const pendingUserIds = new Set<string>();
                for (const applicant of applicants) {
                    if (!memberTags.has(normalizeTag(applicant.cocAccountTag))) pendingUserIds.add(applicant.discordUserId);
                }
                if (pendingUserIds.size === 0) continue;
                clans.push({ tag: clanTag, name: clanName, pending: pendingUserIds.size });

                const ok = dryRun || (await sendClanPing(channelId!, clanName, clanTag, [...pendingUserIds]));
                if (ok) {
                    clansPinged++;
                    usersPinged += pendingUserIds.size;
                }
            } catch (error) {
                Sentry.captureException(error, { extra: { clanTag } });
            }
        }

        await record(
            usersPinged > 0
                ? `Pinged ${usersPinged} user(s) across ${clansPinged} clan(s)`
                : `All caught up, checked ${byClan.size} clan(s) and no pings needed`,
        );
        return { ranAt, seasonId, clansChecked: byClan.size, clansPinged, usersPinged, clans };
    } catch (error) {
        Sentry.captureException(error);
        await record("Run failed, see server logs").catch(() => {});
        return { ...base, skippedReason: "Run failed, see server logs" };
    }
}

let scheduled = false;
let running = false;

async function tick(): Promise<void> {
    let delayMs = DISABLED_POLL_MS;
    try {
        const settings = await getCwlPingSettings();
        if (settings?.enabled) {
            const intervalMs = Math.max(1, settings.intervalMinutes) * 60_000;
            // Waits out the rest of the interval when the last run (scheduled, manual, or from
            // before a restart) was recent, so redeploys and crash loops don't re-ping everyone.
            const sinceLastMs = settings.lastRunAt ? Date.now() - settings.lastRunAt.getTime() : Infinity;
            if (sinceLastMs >= 0 && sinceLastMs < intervalMs) {
                delayMs = intervalMs - sinceLastMs;
            } else {
                if (!running) {
                    running = true;
                    try {
                        await runCwlPingCheck();
                    } finally {
                        running = false;
                    }
                }
                delayMs = intervalMs;
            }
        }
    } catch (error) {
        Sentry.captureException(error);
    } finally {
        setTimeout(() => void tick(), delayMs);
    }
}

/** Starts the self-scheduling CWL ping loop. Idempotent — safe to import multiple times. */
export function startCwlPingScheduler(): void {
    if (scheduled) return;
    scheduled = true;
    void tick();
}
