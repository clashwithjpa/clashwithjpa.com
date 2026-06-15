#!/usr/bin/env bun
/**
 *
 * Tables (see apps/server/src/lib/db/schema/coc.ts):
 *   settings_table        — current_cwl_season_id (active CWL season pointer).
 *   cwl_season_table      — id (PK); newest id is used if settings has none.
 *   cwl_clan_info_table   — coc_clan_tag (PK), coc_clan_name, ...
 *   cwl_application_table — discord_user_id, coc_account_tag, season_id,
 *                           assigned_to (FK -> cwl_clan_info_table.coc_clan_tag)
 *
 * Required env:
 *   JPA_DATABASE_URL          Postgres connection string.
 *   JPA_COC_API_TOKEN         Clash of Clans API token.
 *   DISCORD_WEBHOOK_URL       Discord webhook to post pings to.
 *
 * Optional env:
 *   PUBLIC_COC_API_BASE_URI   CoC API base (default https://cocproxy.royaleapi.dev).
 *   CWL_PING_COUNT            Number of ping passes before exiting (default 15).
 *   CWL_PING_INTERVAL_MINUTES Gap between ping passes (default 30).
 *   CWL_PING_DRY_RUN          "1"/"true" to skip the Discord post (logs only).
 */
import { SQL } from "bun";

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required environment variable: ${name}`);
        process.exit(1);
    }
    return value;
}

function numEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
        console.warn(`Invalid ${name}="${raw}", falling back to ${fallback}`);
        return fallback;
    }
    return n;
}

const config = {
    databaseUrl: requireEnv("JPA_DATABASE_URL"),
    cocApiToken: requireEnv("JPA_COC_API_TOKEN"),
    webhookUrl: requireEnv("DISCORD_WEBHOOK_URL"),
    cocBaseUrl: (process.env.PUBLIC_COC_API_BASE_URI || "https://cocproxy.royaleapi.dev").replace(/\/+$/, ""),
    pingCount: Math.floor(numEnv("CWL_PING_COUNT", 15)),
    intervalMinutes: numEnv("CWL_PING_INTERVAL_MINUTES", 30),
    dryRun: /^(1|true|yes)$/i.test(process.env.CWL_PING_DRY_RUN || ""),
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function log(...args: unknown[]) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}

function normalizeTag(tag: string): string {
    const t = tag.trim().toUpperCase().replace(/^#+/, "");
    return `#${t}`;
}

interface ClanMember {
    tag: string;
}

async function fetchClanMemberTags(clanTag: string, retries = 3): Promise<Set<string>> {
    // CoC tags contain `#`, which must be percent-encoded in the path.
    const url = `${config.cocBaseUrl}/v1/clans/${encodeURIComponent(normalizeTag(clanTag))}/members`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${config.cocApiToken}`,
                    Accept: "application/json",
                },
                signal: AbortSignal.timeout(20_000),
            });

            if (res.ok) {
                const data = (await res.json()) as { items?: ClanMember[] };
                return new Set((data.items ?? []).map((m) => normalizeTag(m.tag)));
            }
            log(`  ⚠ members ${clanTag} attempt ${attempt}/${retries}: HTTP ${res.status}`);
        } catch (err) {
            log(`  ⚠ members ${clanTag} attempt ${attempt}/${retries}: ${String(err)}`);
        }

        if (attempt < retries) await sleep(1000 * attempt);
    }

    log(`  ✗ giving up on members for ${clanTag} after ${retries} attempts`);
    return new Set();
}

const MAX_CONTENT_LENGTH = 1900;

function chunkMentions(userIds: string[]): string[] {
    const mentions = userIds.map((id) => `<@${id}>`);
    const chunks: string[] = [];
    let current = "";

    for (const mention of mentions) {
        if (current.length + mention.length + 1 > MAX_CONTENT_LENGTH) {
            if (current.trim()) chunks.push(current.trim());
            current = mention;
        } else {
            current += ` ${mention}`;
        }
    }
    if (current.trim()) chunks.push(current.trim());

    return chunks;
}

async function sendNotification(userIds: string[], clanName: string, clanTag: string) {
    const encodedTag = encodeURIComponent(normalizeTag(clanTag));
    const clanLink = `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodedTag}`;
    const description =
        `**Chief! Your clan needs you for Clan War League!**\n\n` +
        `Rally to your assigned clan immediately.\n\n` +
        `🎮 **[Tap here to join ${clanName}](${clanLink})**`;

    const embed = {
        title: "⚔️ Clan War League Summons",
        description,
        color: 0xf1c40f, // gold
        fields: [
            { name: "🏰 Clan", value: clanName, inline: true },
            { name: "🏷️ Tag", value: `\`${normalizeTag(clanTag)}\``, inline: true },
            { name: "⚔️ Chiefs Needed", value: String(userIds.length), inline: true },
        ],
        footer: { text: "⏰ War starts soon — don't keep your clanmates waiting!" },
    };

    const chunks = chunkMentions(userIds);

    if (config.dryRun) {
        log(`  [dry-run] would ping ${userIds.length} user(s) for ${clanName} (${normalizeTag(clanTag)})`);
        return;
    }

    const firstPayload: Record<string, unknown> = { username: "Chief Pinger", embeds: [embed] };
    if (chunks.length > 0) firstPayload.content = chunks[0];

    const first = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firstPayload),
    });
    if (!(first.status >= 200 && first.status < 300)) {
        log(`  ✗ webhook failed: HTTP ${first.status} ${await first.text()}`);
        return;
    }

    for (const chunk of chunks.slice(1)) {
        const res = await fetch(config.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "Chief Pinger", content: chunk }),
        });
        if (!(res.status >= 200 && res.status < 300)) {
            log(`  ✗ follow-up webhook failed: HTTP ${res.status} ${await res.text()}`);
        }
        await sleep(300);
    }
}

interface ClanRow {
    coc_clan_tag: string;
    coc_clan_name: string;
}

interface AppRow {
    discord_user_id: string;
    coc_account_tag: string;
    assigned_to: string;
}

async function resolveSeasonId(sql: SQL): Promise<number | null> {
    const settings = (await sql`
        SELECT current_cwl_season_id
        FROM settings_table
        WHERE id = 1
    `) as { current_cwl_season_id: number | null }[];

    const current = settings[0]?.current_cwl_season_id;
    if (current != null) return current;

    const latest = (await sql`
        SELECT MAX(id) AS id
        FROM cwl_season_table
    `) as { id: number | null }[];

    return latest[0]?.id ?? null;
}

async function runOnce(sql: SQL) {
    const seasonId = await resolveSeasonId(sql);
    if (seasonId == null) {
        log("No current CWL season configured and no seasons exist. Nothing to do.");
        return;
    }
    log(`Pinging for CWL season ${seasonId}.`);

    const clans = (await sql`
        SELECT coc_clan_tag, coc_clan_name
        FROM cwl_clan_info_table
        WHERE coc_clan_tag IN (
            SELECT DISTINCT assigned_to
            FROM cwl_application_table
            WHERE assigned_to IS NOT NULL
              AND season_id = ${seasonId}
        )
    `) as ClanRow[];

    if (clans.length === 0) {
        log(`No CWL clans have assigned applicants for season ${seasonId}. Nothing to do.`);
        return;
    }

    const apps = (await sql`
        SELECT discord_user_id, coc_account_tag, assigned_to
        FROM cwl_application_table
        WHERE assigned_to IS NOT NULL
          AND season_id = ${seasonId}
    `) as AppRow[];

    if (apps.length === 0) {
        log(`No assigned CWL applications for season ${seasonId}. Nothing to check.`);
        return;
    }

    const clanByTag = new Map(clans.map((c) => [normalizeTag(c.coc_clan_tag), c]));

    const membersByClan = new Map<string, Set<string>>();
    for (const clan of clans) {
        const tag = normalizeTag(clan.coc_clan_tag);
        const members = await fetchClanMemberTags(tag);
        membersByClan.set(tag, members);
        log(`Clan ${tag} (${clan.coc_clan_name}) has ${members.size} member(s).`);
        await sleep(100);
    }

    const pendingByClan = new Map<string, Set<string>>();
    for (const app of apps) {
        const assigned = normalizeTag(app.assigned_to);
        const members = membersByClan.get(assigned);
        if (!members) continue; // assigned to a clan we couldn't resolve
        if (!members.has(normalizeTag(app.coc_account_tag))) {
            if (!pendingByClan.has(assigned)) pendingByClan.set(assigned, new Set());
            pendingByClan.get(assigned)!.add(app.discord_user_id);
        }
    }

    if (pendingByClan.size === 0) {
        log("✅ All applicants have joined their assigned CWL clans.");
        return;
    }

    for (const [clanTag, userIdSet] of pendingByClan) {
        const userIds = [...userIdSet];
        const clan = clanByTag.get(clanTag);
        const clanName = clan?.coc_clan_name ?? clanTag;
        log(`Notifying ${userIds.length} user(s) for ${clanName} (${clanTag}).`);
        await sendNotification(userIds, clanName, clanTag);
        await sleep(500);
    }
}

async function main() {
    const intervalMs = config.intervalMinutes * 60 * 1000;

    log(`CWL Ping starting — ${config.pingCount} ping pass(es), ${config.intervalMinutes}m apart` + `${config.dryRun ? " (DRY RUN)" : ""}.`);

    const sql = new SQL(config.databaseUrl);

    try {
        for (let run = 1; run <= config.pingCount; run++) {
            log(`--- Run ${run}/${config.pingCount} ---`);
            try {
                await runOnce(sql);
            } catch (err) {
                console.error(`Run ${run} failed:`, err);
            }
            log(`--- Run ${run}/${config.pingCount} finished ---`);

            if (run < config.pingCount) {
                log(`Waiting ${config.intervalMinutes}m before the next run...`);
                await sleep(intervalMs);
            }
        }
        log("Schedule complete. Exiting.");
    } finally {
        await sql.end();
    }
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
