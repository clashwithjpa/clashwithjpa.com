import { Redis } from "ioredis";
import { config } from "@/lib/config";
import { getCachedSettings } from "@/lib/settings-cache";

const redis = new Redis(config.JPA_REDIS_URL);

const DISCORD_API = "https://discord.com/api/v10";

// Cache the raw guild data (never a "valid" verdict) with short TTLs to avoid
// rate limits while keeping stale-acceptance windows tiny.
const LIST_TTL = 60; // roles & channels lists
const MEMBER_OK_TTL = 60;
const MEMBER_MISS_TTL = 15; // short, so fixing membership reflects quickly
const RATE_LIMIT_KEY = "discord:ratelimit";
const MEMBER_MISS = "\0miss"; // cached "not a member" vs cache miss

// Transient failures: callers fail closed (treat as "could not verify", not "valid").
export class DiscordRateLimitError extends Error {
    constructor(message = "Discord is rate limited, please retry shortly") {
        super(message);
        this.name = "DiscordRateLimitError";
    }
}

export class DiscordUnavailableError extends Error {
    constructor(message = "Could not reach Discord to verify the provided IDs") {
        super(message);
        this.name = "DiscordUnavailableError";
    }
}

async function discordRequest(path: string): Promise<Response> {
    // Honour the cooldown set after a previous 429.
    const cooling = await redis.get(RATE_LIMIT_KEY).catch(() => null);
    if (cooling) throw new DiscordRateLimitError();

    let res: Response;
    try {
        res = await fetch(`${DISCORD_API}${path}`, {
            headers: { Authorization: `Bot ${config.JPA_DISCORD_BOT_TOKEN}` },
        });
    } catch (error) {
        throw new DiscordUnavailableError((error as Error)?.message);
    }

    if (res.status === 429) {
        let retryAfter = 1;
        try {
            const body = (await res.clone().json()) as { retry_after?: number };
            if (typeof body.retry_after === "number") retryAfter = Math.ceil(body.retry_after);
        } catch {
            // default 1s
        }
        await redis.set(RATE_LIMIT_KEY, "1", "EX", Math.max(retryAfter, 1)).catch(() => {});
        throw new DiscordRateLimitError();
    }

    return res;
}

// role id -> role name (cached).
async function getGuildRoles(guildId: string): Promise<Map<string, string>> {
    const key = `discord:guild:${guildId}:roles`;
    const cached = await redis.get(key).catch(() => null);
    if (cached) return new Map<string, string>(JSON.parse(cached));

    const res = await discordRequest(`/guilds/${guildId}/roles`);
    if (!res.ok) throw new DiscordUnavailableError(`Failed to fetch guild roles (HTTP ${res.status})`);

    const roles = (await res.json()) as { id: string; name: string }[];
    const entries = roles.map((r) => [r.id, r.name] as [string, string]);
    await redis.set(key, JSON.stringify(entries), "EX", LIST_TTL).catch(() => {});
    return new Map(entries);
}

// channel id -> channel name (cached).
async function getGuildChannels(guildId: string): Promise<Map<string, string>> {
    const key = `discord:guild:${guildId}:channels`;
    const cached = await redis.get(key).catch(() => null);
    if (cached) return new Map<string, string>(JSON.parse(cached));

    const res = await discordRequest(`/guilds/${guildId}/channels`);
    if (!res.ok) throw new DiscordUnavailableError(`Failed to fetch guild channels (HTTP ${res.status})`);

    const channels = (await res.json()) as { id: string; name: string }[];
    const entries = channels.map((ch) => [ch.id, ch.name] as [string, string]);
    await redis.set(key, JSON.stringify(entries), "EX", LIST_TTL).catch(() => {});
    return new Map(entries);
}

// Display name if the user is in the guild, else null.
async function getGuildMemberName(guildId: string, userId: string): Promise<string | null> {
    const key = `discord:guild:${guildId}:member:${userId}`;
    const cached = await redis.get(key).catch(() => null);
    if (cached !== null) return cached === MEMBER_MISS ? null : cached;

    const res = await discordRequest(`/guilds/${guildId}/members/${userId}`);
    if (res.status === 404) {
        await redis.set(key, MEMBER_MISS, "EX", MEMBER_MISS_TTL).catch(() => {});
        return null;
    }
    if (!res.ok) throw new DiscordUnavailableError(`Failed to fetch guild member (HTTP ${res.status})`);

    const member = (await res.json()) as { nick?: string | null; user?: { username?: string; global_name?: string | null } };
    const name = member.nick || member.user?.global_name || member.user?.username || userId;
    await redis.set(key, name, "EX", MEMBER_OK_TTL).catch(() => {});
    return name;
}

type GuildMember = { nick?: string | null; user?: { id?: string; username?: string } };

// Paginates the full guild member list. Requires the privileged GUILD_MEMBERS intent.
async function fetchAllGuildMembers(): Promise<GuildMember[]> {
    const settings = await getCachedSettings();
    const guildId = settings?.guildId;
    if (!guildId) throw new DiscordUnavailableError("Discord guild is not configured. Set the Guild ID in admin settings first.");

    const members: GuildMember[] = [];
    let after = "0";
    for (;;) {
        const res = await discordRequest(`/guilds/${guildId}/members?limit=1000&after=${after}`);
        if (!res.ok) throw new DiscordUnavailableError(`Failed to fetch guild members (HTTP ${res.status})`);

        const page = (await res.json()) as GuildMember[];
        members.push(...page);

        if (page.length < 1000) break;
        after = page[page.length - 1]!.user!.id!;
    }
    return members;
}

// Discord id -> username. Non-members are simply absent from the map.
export async function getGuildUsernames(): Promise<Map<string, string>> {
    const usernames = new Map<string, string>();
    for (const m of await fetchAllGuildMembers()) if (m.user?.id && m.user.username) usernames.set(m.user.id, m.user.username);
    return usernames;
}

// Discord id -> guild nickname (only members who set one). Cached for display.
export async function getGuildNicknames(): Promise<Record<string, string>> {
    const cacheKey = "discord:guild:nicknames";
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached) as Record<string, string>;

    const nicknames: Record<string, string> = {};
    for (const m of await fetchAllGuildMembers()) if (m.user?.id && m.nick) nicknames[m.user.id] = m.nick;

    await redis.set(cacheKey, JSON.stringify(nicknames), "EX", 300).catch(() => {});
    return nicknames;
}

export type DiscordIdInput = {
    discordClanRoleId?: string | null;
    discordMemberRoleId?: string | null;
    discordElderRoleId?: string | null;
    discordColeaderRoleId?: string | null;
    discordLeaderRoleId?: string | null;
    discordClanChannelId?: string | null;
    discordLeaderId?: string | null;
};

export type FieldResult = { valid: boolean; name?: string; reason?: string };
export type VerifyResult = { ok: boolean; results: Record<string, FieldResult> };

const ROLE_FIELDS = ["discordClanRoleId", "discordMemberRoleId", "discordElderRoleId", "discordColeaderRoleId", "discordLeaderRoleId"] as const;

const FIELD_LABELS: Record<string, string> = {
    discordClanRoleId: "Clan role",
    discordMemberRoleId: "Member role",
    discordElderRoleId: "Elder role",
    discordColeaderRoleId: "Co-leader role",
    discordLeaderRoleId: "Leader role",
    discordClanChannelId: "Clan channel",
    discordLeaderId: "Leader user",
};

export function discordFieldLabel(field: string): string {
    return FIELD_LABELS[field] ?? field;
}

// Verify each provided (non-empty) Discord ID exists in the configured guild.
export async function verifyClanDiscordIds(input: DiscordIdInput): Promise<VerifyResult> {
    const settings = await getCachedSettings();
    const guildId = settings?.guildId;
    if (!guildId) throw new DiscordUnavailableError("Discord guild is not configured. Set the Guild ID in admin settings first.");

    const results: Record<string, FieldResult> = {};

    const usesRole = ROLE_FIELDS.some((f) => input[f]?.trim());
    if (usesRole) {
        const roles = await getGuildRoles(guildId);
        for (const field of ROLE_FIELDS) {
            const id = input[field]?.trim();
            if (!id) continue;
            const name = roles.get(id);
            results[field] = name ? { valid: true, name } : { valid: false, reason: "Role not found in this server" };
        }
    }

    const channelId = input.discordClanChannelId?.trim();
    if (channelId) {
        const channels = await getGuildChannels(guildId);
        const name = channels.get(channelId);
        results.discordClanChannelId = name ? { valid: true, name: `#${name}` } : { valid: false, reason: "Channel not found in this server" };
    }

    const userId = input.discordLeaderId?.trim();
    if (userId) {
        const name = await getGuildMemberName(guildId, userId);
        results.discordLeaderId = name ? { valid: true, name } : { valid: false, reason: "User is not a member of this server" };
    }

    const ok = Object.values(results).every((r) => r.valid);
    return { ok, results };
}

// For the save routes: message listing invalid fields, or null when all valid.
export async function assertClanDiscordIds(input: DiscordIdInput): Promise<string | null> {
    const { ok, results } = await verifyClanDiscordIds(input);
    if (ok) return null;
    const invalid = Object.entries(results)
        .filter(([, r]) => !r.valid)
        .map(([field]) => discordFieldLabel(field));
    return `Invalid Discord ${invalid.length === 1 ? "ID" : "IDs"}: ${invalid.join(", ")}. They must exist in the server.`;
}
