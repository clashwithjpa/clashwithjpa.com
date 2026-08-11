import { cocClient } from "@/lib/coc";
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
    SeparatorBuilder,
    subtext,
    TextDisplayBuilder,
    WebhookClient,
    type WebhookMessageCreateOptions,
} from "discord.js";
import { eq, sql } from "drizzle-orm";

export type CwlPingRunSummary = {
    ranAt: Date;
    seasonId: number | null;
    clansChecked: number;
    clansPinged: number;
    usersPinged: number;
    skippedReason?: string;
};

const MENTION_CHUNK_MAX_LENGTH = 1900;
const DISABLED_POLL_MS = 60_000;

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

function buildPingMessages(clanName: string, clanTag: string, userIds: string[]): WebhookMessageCreateOptions[] {
    const encodedTag = encodeURIComponent(normalizeTag(clanTag));
    const clanLink = `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodedTag}`;
    const chunks = chunkUserIds(userIds);

    const openClanRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Open Clan").setEmoji({ name: "🎮" }).setURL(clanLink),
    );

    const first: WebhookMessageCreateOptions = {
        flags: MessageFlags.IsComponentsV2,
        withComponents: true,
        allowedMentions: { parse: [], users: chunks[0] ?? [] },
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
                ),
            openClanRow,
        ],
    };

    const followUps: WebhookMessageCreateOptions[] = chunks.slice(1).map((chunk) => ({
        username: "Chief Pinger",
        flags: MessageFlags.IsComponentsV2,
        withComponents: true,
        allowedMentions: { parse: [], users: chunk },
        components: [new TextDisplayBuilder().setContent(subtext(chunk.map((id) => `<@${id}>`).join(" ")))],
    }));

    return [first, ...followUps];
}

async function sendClanPing(webhookUrl: string, clanName: string, clanTag: string, userIds: string[]): Promise<boolean> {
    const client = new WebhookClient({ url: webhookUrl });
    const messages = buildPingMessages(clanName, clanTag, userIds);
    try {
        for (const message of messages) await client.send(message);
        return true;
    } catch (error) {
        Sentry.captureException(error, { extra: { clanTag } });
        return false;
    }
}

export async function sendTestPing(webhookUrl: string): Promise<void> {
    const client = new WebhookClient({ url: webhookUrl });
    await client.send({
        username: "Chief Pinger",
        flags: MessageFlags.IsComponentsV2,
        withComponents: true,
        components: [new TextDisplayBuilder().setContent("✅ **CWL Ping test**: this webhook is wired up correctly.")],
    });
}

export async function runCwlPingCheck(): Promise<CwlPingRunSummary> {
    const ranAt = new Date();
    const base: CwlPingRunSummary = { ranAt, seasonId: null, clansChecked: 0, clansPinged: 0, usersPinged: 0 };

    try {
        const pingSettings = await getCwlPingSettings();
        if (!pingSettings?.webhookUrl) {
            const summary = { ...base, skippedReason: "No webhook URL configured" };
            await recordCwlPingRun({ ranAt, summary: summary.skippedReason });
            return summary;
        }

        const seasonId = await resolveSeasonId();
        if (seasonId == null) {
            const summary = { ...base, skippedReason: "No CWL season is configured" };
            await recordCwlPingRun({ ranAt, summary: summary.skippedReason });
            return summary;
        }

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

        if (assigned.length === 0) {
            const summary = { ...base, seasonId, skippedReason: "No assigned CWL applications this season" };
            await recordCwlPingRun({ ranAt, summary: summary.skippedReason });
            return summary;
        }

        const byClan = new Map<string, { clanName: string; applicants: { discordUserId: string; cocAccountTag: string }[] }>();
        for (const row of assigned) {
            const tag = normalizeTag(row.clanTag);
            if (!byClan.has(tag)) byClan.set(tag, { clanName: row.clanName, applicants: [] });
            byClan.get(tag)!.applicants.push({ discordUserId: row.discordUserId, cocAccountTag: row.cocAccountTag });
        }

        let clansPinged = 0;
        let usersPinged = 0;

        for (const [clanTag, { clanName, applicants }] of byClan) {
            try {
                const clan = await cocClient.getClan(clanTag);
                const memberTags = new Set(clan.memberList.map((m) => normalizeTag(m.tag)));

                const pendingUserIds = new Set<string>();
                for (const applicant of applicants) {
                    if (!memberTags.has(normalizeTag(applicant.cocAccountTag))) pendingUserIds.add(applicant.discordUserId);
                }
                if (pendingUserIds.size === 0) continue;

                const ok = await sendClanPing(pingSettings.webhookUrl, clanName, clanTag, [...pendingUserIds]);
                if (ok) {
                    clansPinged++;
                    usersPinged += pendingUserIds.size;
                }
            } catch (error) {
                Sentry.captureException(error, { extra: { clanTag } });
            }
        }

        const summary: CwlPingRunSummary = { ranAt, seasonId, clansChecked: byClan.size, clansPinged, usersPinged };
        const summaryText =
            usersPinged > 0
                ? `Pinged ${usersPinged} user(s) across ${clansPinged} clan(s)`
                : `All caught up — checked ${byClan.size} clan(s), no pings needed`;
        await recordCwlPingRun({ ranAt, summary: summaryText });
        return summary;
    } catch (error) {
        Sentry.captureException(error);
        const summary = { ...base, skippedReason: "Run failed — see server logs" };
        await recordCwlPingRun({ ranAt, summary: summary.skippedReason }).catch(() => {});
        return summary;
    }
}

let scheduled = false;
let running = false;

async function tick(): Promise<void> {
    let delayMs = DISABLED_POLL_MS;
    try {
        const settings = await getCwlPingSettings();
        if (settings?.enabled && !running) {
            running = true;
            try {
                await runCwlPingCheck();
            } finally {
                running = false;
            }
        }
        delayMs = settings?.enabled ? Math.max(1, settings.intervalMinutes) * 60_000 : DISABLED_POLL_MS;
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
