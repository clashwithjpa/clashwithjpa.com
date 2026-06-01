#!/usr/bin/env bun
/**
 * CWL Ping — standalone container.
 *
 * Pings (via a Discord webhook) every CWL applicant who has been assigned to a
 * clan but has NOT yet joined that clan in-game. Runs on a schedule: one ping
 * pass immediately, then repeats every `CWL_PING_INTERVAL_MINUTES` until
 * `CWL_PING_DURATION_HOURS` have elapsed, then exits.
 *
 * Zero runtime dependencies: uses Bun's built-in SQL (Postgres) and `fetch`.
 *
 * Tables (see apps/server/src/lib/db/schema/coc.ts):
 *   cwl_clan_info_table   — coc_clan_tag (PK), coc_clan_name, ...
 *   cwl_application_table — discord_user_id, coc_account_tag, assigned_to (FK
 *                           -> cwl_clan_info_table.coc_clan_tag)
 *
 * Required env:
 *   JPA_DATABASE_URL          Postgres connection string.
 *   JPA_COC_API_TOKEN         Clash of Clans API token.
 *   DISCORD_WEBHOOK_URL       Discord webhook to post pings to.
 *
 * Optional env:
 *   PUBLIC_COC_API_BASE_URI   CoC API base (default https://cocproxy.royaleapi.dev).
 *   CWL_PING_DURATION_HOURS   How long to keep pinging (default 12).
 *   CWL_PING_INTERVAL_MINUTES Gap between ping passes (default 60).
 *   CWL_PING_DRY_RUN          "1"/"true" to skip the Discord post (logs only).
 */
import { SQL } from "bun";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

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
    durationHours: numEnv("CWL_PING_DURATION_HOURS", 12),
    intervalMinutes: numEnv("CWL_PING_INTERVAL_MINUTES", 60),
    dryRun: /^(1|true|yes)$/i.test(process.env.CWL_PING_DRY_RUN || ""),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function log(...args: unknown[]) {
    console.log(`[${new Date().toISOString()}]`, ...args);
}

/** Normalize a player/clan tag for comparison: uppercase, single leading `#`. */
function normalizeTag(tag: string): string {
    const t = tag.trim().toUpperCase().replace(/^#+/, "");
    return `#${t}`;
}

// ---------------------------------------------------------------------------
// Clash of Clans API
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Discord notifier
// ---------------------------------------------------------------------------

const MAX_CONTENT_LENGTH = 1900;

/** Split mentions into chunks that each fit under Discord's content limit. */
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

    // First message carries the embed + the first mention chunk.
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

    // Follow-up messages for any remaining mention chunks.
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

// ---------------------------------------------------------------------------
// One ping pass
// ---------------------------------------------------------------------------

interface ClanRow {
    coc_clan_tag: string;
    coc_clan_name: string;
}

interface AppRow {
    discord_user_id: string;
    coc_account_tag: string;
    assigned_to: string;
}

async function runOnce(sql: SQL) {
    const clans = (await sql`
        SELECT coc_clan_tag, coc_clan_name
        FROM cwl_clan_info_table
    `) as ClanRow[];

    if (clans.length === 0) {
        log("No CWL clans found in cwl_clan_info_table. Nothing to do.");
        return;
    }

    // Only assigned applications are relevant.
    const apps = (await sql`
        SELECT discord_user_id, coc_account_tag, assigned_to
        FROM cwl_application_table
        WHERE assigned_to IS NOT NULL
    `) as AppRow[];

    if (apps.length === 0) {
        log("No assigned CWL applications. Nothing to check.");
        return;
    }

    const clanByTag = new Map(clans.map((c) => [normalizeTag(c.coc_clan_tag), c]));

    // Live membership per clan.
    const membersByClan = new Map<string, Set<string>>();
    for (const clan of clans) {
        const tag = normalizeTag(clan.coc_clan_tag);
        const members = await fetchClanMemberTags(tag);
        membersByClan.set(tag, members);
        log(`Clan ${tag} (${clan.coc_clan_name}) has ${members.size} member(s).`);
        await sleep(100);
    }

    // Group not-yet-joined applicants by their assigned clan.
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

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

async function main() {
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const deadline = Date.now() + config.durationHours * 60 * 60 * 1000;

    log(`CWL Ping starting — pinging every ${config.intervalMinutes}m for ${config.durationHours}h` + `${config.dryRun ? " (DRY RUN)" : ""}.`);

    const sql = new SQL(config.databaseUrl);

    try {
        let run = 0;
        while (true) {
            run++;
            log(`--- Run ${run} ---`);
            try {
                await runOnce(sql);
            } catch (err) {
                console.error(`Run ${run} failed:`, err);
            }
            log(`--- Run ${run} finished ---`);

            if (Date.now() + intervalMs > deadline) break;
            log(`Waiting ${config.intervalMinutes}m before the next run...`);
            await sleep(intervalMs);
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
