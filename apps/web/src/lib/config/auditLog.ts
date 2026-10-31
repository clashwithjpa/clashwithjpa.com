import type { Option } from "#lib/components/ui/Select.svelte";
import type { Role } from "#lib/config/roles.js";
import type { GetAuditLogStatus200 } from "@repo/clashofclans-client";
import type { Component } from "svelte";
import TablerArrowBackUp from "~icons/tabler/arrow-back-up";
import TablerArrowRight from "~icons/tabler/arrow-right";
import TablerArrowsLeft from "~icons/tabler/arrows-left";
import TablerArrowsRight from "~icons/tabler/arrows-right";
import TablerBan from "~icons/tabler/ban";
import TablerBellRinging from "~icons/tabler/bell-ringing";
import TablerCalendarCheck from "~icons/tabler/calendar-check";
import TablerCalendarMinus from "~icons/tabler/calendar-minus";
import TablerCalendarX from "~icons/tabler/calendar-x";
import TablerCheck from "~icons/tabler/check";
import TablerClock from "~icons/tabler/clock";
import TablerCoin from "~icons/tabler/coin";
import TablerDownload from "~icons/tabler/download";
import TablerEdit from "~icons/tabler/edit";
import TablerGavel from "~icons/tabler/gavel";
import TablerKey from "~icons/tabler/key";
import TablerKeyOff from "~icons/tabler/key-off";
import TablerList from "~icons/tabler/list";
import TablerLogout from "~icons/tabler/logout";
import TablerLogout2 from "~icons/tabler/logout-2";
import TablerMask from "~icons/tabler/mask";
import TablerMaskOff from "~icons/tabler/mask-off";
import TablerPlayerPlay from "~icons/tabler/player-play";
import TablerPlus from "~icons/tabler/plus";
import TablerRefresh from "~icons/tabler/refresh";
import TablerSend from "~icons/tabler/send";
import TablerSettings from "~icons/tabler/settings";
import TablerShieldCheck from "~icons/tabler/shield-check";
import TablerShieldHalf from "~icons/tabler/shield-half";
import TablerShieldLock from "~icons/tabler/shield-lock";
import TablerSwords from "~icons/tabler/swords";
import TablerTrash from "~icons/tabler/trash";
import TablerUser from "~icons/tabler/user";
import TablerUserCheck from "~icons/tabler/user-check";
import TablerUserMinus from "~icons/tabler/user-minus";
import TablerUserPlus from "~icons/tabler/user-plus";
import TablerUsers from "~icons/tabler/users";
import TablerWeight from "~icons/tabler/weight";
import TablerWorld from "~icons/tabler/world";
import TablerX from "~icons/tabler/x";

export type AuditLogData = GetAuditLogStatus200["data"];
export type AuditEntry = AuditLogData["entries"][number];
export type AuditLookup = AuditLogData["lookup"];
export type AuditAction = AuditEntry["action"];
export type AuditTargetType = NonNullable<AuditEntry["targetType"]>;
export type AuditEntity = NonNullable<AuditEntry["subjects"]>[number];
export type AuditEntityType = AuditEntity["type"];
export type AuditChange = NonNullable<AuditEntry["changes"]>[number];
export type AuditValue = AuditChange["before"];
export type AuditItem = NonNullable<AuditEntry["items"]>[number];
export type AuditRef = { ref: AuditEntityType; id: string };

export type AuditVariant = "blue" | "green" | "red" | "yellow" | "purple" | "ghost";

export const VARIANT_TEXT: Record<AuditVariant, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    ghost: "text-stone-400",
};

export const VARIANT_TILE: Record<AuditVariant, string> = {
    blue: "border-blue-700/50 bg-blue-900 text-blue-200",
    green: "border-green-700/50 bg-green-900 text-green-200",
    red: "border-red-700/50 bg-red-900 text-red-200",
    yellow: "border-yellow-700/50 bg-yellow-900 text-yellow-200",
    purple: "border-purple-700/50 bg-purple-900 text-purple-200",
    ghost: "border-stone-700/50 bg-stone-800 text-stone-300",
};

// ── Resolving references ────────────────────────────────────────────────────
// Entries only hold ids. Everything a reader sees (names, avatars, roles, town
// halls, clan names) comes from the response's live `lookup`. A user who no
// longer exists is shown the way GitHub shows deleted accounts: as a ghost.

export const GHOST_NAME = "Ghost";

export type ResolvedUser = {
    id: string | null;
    discordId: string | null;
    name: string;
    image: string | null;
    role: Role | null;
    ghost: boolean;
};

export type ResolvedEntity = {
    type: AuditEntityType;
    id: string | null;
    name: string;
    // Secondary line: tag, league, town hall...
    detail: string | null;
    // No longer exists (deleted user, unlinked account, removed clan).
    gone: boolean;
    user?: ResolvedUser;
    account?: AuditLookup["accounts"][number];
};

export type AuditResolver = ReturnType<typeof createResolver>;

export function createResolver(lookup: AuditLookup) {
    const usersById = new Map(lookup.users.map((u) => [u.id, u]));
    const usersByDiscord = new Map(lookup.users.flatMap((u) => (u.discordId ? [[u.discordId, u] as const] : [])));
    const accounts = new Map(lookup.accounts.map((a) => [a.tag, a]));
    const clans = new Map(lookup.clans.map((c) => [c.tag, c]));
    const cwlClans = new Map(lookup.cwlClans.map((c) => [c.tag, c]));
    const seasons = new Map(lookup.seasons.map((s) => [String(s.id), s]));
    const apiKeys = new Map(lookup.apiKeys.map((k) => [k.id, k]));
    const channels = new Map(lookup.channels.map((c) => [c.id, c]));

    function user(id: string | null | undefined, discordId?: string | null): ResolvedUser {
        const u = (id && usersById.get(id)) || (discordId && usersByDiscord.get(discordId)) || null;
        if (!u) return { id: id ?? null, discordId: discordId ?? null, name: GHOST_NAME, image: null, role: null, ghost: true };
        return { id: u.id, discordId: u.discordId, name: u.name, image: u.image, role: (u.role as Role | null) ?? null, ghost: false };
    }

    function entity(e: { type: AuditEntityType; id: string | null; discordId?: string | null }, fallbackName?: string | null): ResolvedEntity {
        const id = e.id;
        switch (e.type) {
            case "user": {
                const u = user(id, e.discordId);
                return { type: "user", id: u.id, name: u.name, detail: u.discordId, gone: u.ghost, user: u };
            }
            case "coc_account": {
                const a = id ? accounts.get(id) : undefined;
                const name = a?.name ?? fallbackName ?? id ?? "Unknown account";
                return {
                    type: "coc_account",
                    id,
                    name,
                    detail: [name !== id ? id : null, a?.townHall ? `TH ${a.townHall}` : null].filter(Boolean).join(" · ") || null,
                    gone: !a?.linked,
                    account: a,
                };
            }
            case "clan": {
                const c = id ? clans.get(id) : undefined;
                return { type: "clan", id, name: c?.name ?? c?.code ?? fallbackName ?? id ?? "Unknown clan", detail: id, gone: !c };
            }
            case "cwl_clan": {
                const c = id ? cwlClans.get(id) : undefined;
                return {
                    type: "cwl_clan",
                    id,
                    name: c?.name ?? fallbackName ?? id ?? "Unknown CWL clan",
                    detail: [id, c?.league].filter(Boolean).join(" · "),
                    gone: !c,
                };
            }
            case "cwl_season": {
                const s = id ? seasons.get(id) : undefined;
                return { type: "cwl_season", id, name: s?.name ?? fallbackName ?? `Season #${id}`, detail: `Season #${id}`, gone: !s };
            }
            case "api_key": {
                const k = id ? apiKeys.get(id) : undefined;
                return { type: "api_key", id, name: k?.name ?? fallbackName ?? `Key ${id?.slice(0, 8) ?? "?"}`, detail: id, gone: !k };
            }
            case "discord_channel": {
                const ch = id ? channels.get(id) : undefined;
                return { type: "discord_channel", id, name: `#${ch?.name ?? id}`, detail: id, gone: !ch };
            }
        }
    }

    return { user, entity };
}

// Pages are fetched incrementally; their lookups are merged so earlier rows keep resolving.
export function mergeLookups(a: AuditLookup, b: AuditLookup): AuditLookup {
    const by = <T>(xs: T[], ys: T[], key: (x: T) => string) => [...new Map([...xs, ...ys].map((x) => [key(x), x])).values()];
    return {
        users: by(a.users, b.users, (u) => u.id),
        accounts: by(a.accounts, b.accounts, (x) => x.tag),
        clans: by(a.clans, b.clans, (x) => x.tag),
        cwlClans: by(a.cwlClans, b.cwlClans, (x) => x.tag),
        seasons: by(a.seasons, b.seasons, (x) => String(x.id)),
        apiKeys: by(a.apiKeys, b.apiKeys, (x) => x.id),
        channels: by(a.channels, b.channels, (x) => x.id),
    };
}

export const EMPTY_LOOKUP: AuditLookup = { users: [], accounts: [], clans: [], cwlClans: [], seasons: [], apiKeys: [], channels: [] };

// ── Fields ──────────────────────────────────────────────────────────────────

export type FieldKind = "text" | "number" | "onoff" | "yesno" | "role" | "date" | "status" | "accountType" | "id" | "list" | "hidden" | "tag";

export const FIELDS: Record<string, { label: string; kind?: FieldKind; suffix?: string }> = {
    status: { label: "Status", kind: "status" },
    linkedAccount: { label: "Linked account", kind: "tag" },
    applicantRole: { label: "Applicant role", kind: "role" },
    assignedTo: { label: "Assigned clan" },
    preferenceNum: { label: "Preference", kind: "number" },
    cocAccountClan: { label: "Playing from clan" },
    cocAccountTag: { label: "Account", kind: "tag" },
    awarded: { label: "Bonus awarded", kind: "yesno" },
    name: { label: "Name" },
    month: { label: "Month" },
    year: { label: "Year", kind: "number" },
    applicationsEnabled: { label: "Clan applications", kind: "onoff" },
    cwlEnabled: { label: "CWL signups", kind: "onoff" },
    siteMaintenanceMode: { label: "Maintenance mode", kind: "onoff" },
    guildId: { label: "Discord server", kind: "id" },
    currentCwlSeasonId: { label: "Current CWL season" },
    enabled: { label: "Enabled", kind: "onoff" },
    channelId: { label: "Ping channel" },
    intervalMinutes: { label: "Ping interval", kind: "number", suffix: " min" },
    pendingMembers: { label: "Not joined yet", kind: "number" },
    cocClanCode: { label: "Clan code" },
    cocClanName: { label: "Clan name" },
    cocClanTag: { label: "Clan tag", kind: "tag" },
    cocClanLevel: { label: "Clan level", kind: "number" },
    cocClanLeague: { label: "League" },
    cocClanLeader: { label: "Leader" },
    discordClanRoleId: { label: "Clan role", kind: "id" },
    discordClanChannelId: { label: "Clan channel", kind: "id" },
    discordMemberRoleId: { label: "Member role", kind: "id" },
    discordElderRoleId: { label: "Elder role", kind: "id" },
    discordColeaderRoleId: { label: "Co-leader role", kind: "id" },
    discordLeaderRoleId: { label: "Leader role", kind: "id" },
    discordLeaderId: { label: "Leader (Discord)", kind: "id" },
    attacksRequirement: { label: "Attacks required", kind: "number" },
    donationsRequirement: { label: "Donations required", kind: "number" },
    clangamesRequirement: { label: "Clan games required", kind: "number" },
    warWeight: { label: "War weight", kind: "number" },
    isExternal: { label: "Account type", kind: "accountType" },
    currentClan: { label: "Current clan" },
    townHall: { label: "Town hall", kind: "number" },
    totalDonated: { label: "Donated", kind: "number" },
    totalReceived: { label: "Received", kind: "number" },
    clanGames: { label: "Clan games", kind: "number" },
    capitalGoldLooted: { label: "Capital looted", kind: "number" },
    capitalGoldContributed: { label: "Capital contributed", kind: "number" },
    activityScore: { label: "Activity score", kind: "number" },
    role: { label: "Role", kind: "role" },
    banned: { label: "Banned", kind: "yesno" },
    banReason: { label: "Ban reason" },
    banExpires: { label: "Ban expires", kind: "date" },
    apiAccess: { label: "API access", kind: "onoff" },
    scopes: { label: "Scopes", kind: "list" },
    expiresAt: { label: "Expires", kind: "date" },
    discordUsername: { label: "Discord username" },
    password: { label: "Password", kind: "hidden" },
    email: { label: "Email", kind: "hidden" },
    emailVerified: { label: "Email verified", kind: "hidden" },
    image: { label: "Avatar" },
    length: { label: "Characters", kind: "number" },
    lineCount: { label: "Lines", kind: "number" },
    createdAt: { label: "Created", kind: "date" },
};

// For mid-sentence use: "Clan applications" becomes "clan applications", but "CWL signups" keeps its acronym.
const inline = (label: string) => (/^[A-Z]{2}/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1));

export const fieldLabel = (field: string) => FIELDS[field]?.label ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export const isRef = (v: AuditValue): v is AuditRef => !!v && typeof v === "object" && !Array.isArray(v) && "ref" in v;

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

// Plain-text rendering of a value; refs resolve to their live name.
export function formatValue(field: string, v: AuditValue | undefined, r: AuditResolver): string {
    if (v === undefined || v === null || v === "") return "—";
    if (isRef(v)) return r.entity({ type: v.ref, id: v.id }).name;
    const meta = FIELDS[field];
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
    switch (meta?.kind) {
        case "hidden":
            return "Hidden";
        case "onoff":
            return v ? "On" : "Off";
        case "yesno":
            return v ? "Yes" : "No";
        case "accountType":
            return v ? "External" : "Main";
        case "status":
        case "role":
            return String(v).charAt(0).toUpperCase() + String(v).slice(1);
        case "date":
            return dateFmt.format(new Date(String(v)));
        case "number":
            return `${typeof v === "number" ? v.toLocaleString() : v}${meta.suffix ?? ""}`;
    }
    return String(v);
}

// ── Sentences ───────────────────────────────────────────────────────────────
// Each action describes itself as segments: text, entity chips and values. The
// list and sidebar render them with hover cards; `toText` flattens them for
// titles and the dashboard feed.

export type Segment = string | { entity: AuditEntity; fallback?: string | null } | { field: string; value: AuditValue | undefined };

export const subject = (e: AuditEntry, relation: string) => e.subjects?.find((s) => s.relation === relation);
export const change = (e: AuditEntry, field: string) => e.changes?.find((c) => c.field === field);

function refEntity(v: AuditValue | undefined): AuditEntity | null {
    return isRef(v ?? null) ? { type: (v as AuditRef).ref, id: (v as AuditRef).id } : null;
}

const plural = (n: number, noun: string, pluralNoun = `${noun}s`) => `${n.toLocaleString()} ${n === 1 ? noun : pluralNoun}`;

const meta = (e: AuditEntry, key: string) => (e.metadata ?? {})[key];
const metaNum = (e: AuditEntry, key: string) => {
    const v = meta(e, key);
    return typeof v === "number" ? v : 0;
};
const itemCount = (e: AuditEntry) => metaNum(e, "itemsTotal") || e.items?.length || 0;

// A deleted target's name survives in its own delete diff.
const snapshot = (e: AuditEntry, field: string) => {
    const c = change(e, field);
    const v = c?.before ?? c?.after;
    return typeof v === "string" ? v : null;
};

function ent(e: AuditEntry, relation: string, fallback?: string | null): Segment[] {
    const s = subject(e, relation);
    return s ? [{ entity: s, fallback }] : [];
}

function userTarget(e: AuditEntry): Segment[] {
    return e.targetId ? [{ entity: subject(e, "target") ?? { type: "user", id: e.targetId } }] : ["a user"];
}

// "[applicant]'s clan application for [account]" — the possessive reads naturally whoever the applicant is.
function applicationOf(e: AuditEntry, what: string): Segment[] {
    return [...ent(e, "applicant"), `'s ${what} for `, ...ent(e, "account", snapshot(e, "cocAccountTag"))];
}

function fieldList(changes: AuditChange[] | null | undefined): string {
    const labels = (changes ?? []).map((c) => inline(fieldLabel(c.field)));
    if (labels.length <= 3) return labels.join(", ");
    return `${labels.slice(0, 3).join(", ")} and ${labels.length - 3} more`;
}

// One change reads as "from X to Y"; several fall back to naming the fields.
function changeSummary(e: AuditEntry, noun: Segment[]): Segment[] {
    const changes = e.changes ?? [];
    if (changes.length === 1) {
        const c = changes[0]!;
        return [
            `changed the ${inline(fieldLabel(c.field))} of `,
            ...noun,
            " from ",
            { field: c.field, value: c.before },
            " to ",
            { field: c.field, value: c.after },
        ];
    }
    return ["updated ", ...noun, changes.length ? ` (${fieldList(changes)})` : ""];
}

function toggleSummary(e: AuditEntry, fallback: string): Segment[] {
    const changes = e.changes ?? [];
    if (changes.length === 1) {
        const c = changes[0]!;
        const kind = FIELDS[c.field]?.kind;
        if (kind === "onoff") return [`turned ${c.after ? "on" : "off"} ${inline(fieldLabel(c.field))}`];
        return [`set ${inline(fieldLabel(c.field))} to `, { field: c.field, value: c.after }];
    }
    return changes.length ? [`updated ${fallback}: ${fieldList(changes)}`] : [`updated ${fallback}`];
}

function textEdit(e: AuditEntry, what: string): Segment[] {
    const added = metaNum(e, "linesAdded");
    const removed = metaNum(e, "linesRemoved");
    return [`updated the ${what}`, added || removed ? ` (+${added} −${removed} lines)` : ""];
}

export interface AuditActionConfig {
    label: string;
    icon: Component;
    variant: AuditVariant;
    describe: (e: AuditEntry) => Segment[];
}

export const AUDIT_ACTION_CONFIG: Record<AuditAction, AuditActionConfig> = {
    "clan_application.create": {
        label: "Clan application · submitted",
        icon: TablerSend,
        variant: "blue",
        describe: (e) => ["applied to join with ", ...ent(e, "account")],
    },
    "clan_application.accepted": {
        label: "Clan application · accepted",
        icon: TablerCheck,
        variant: "green",
        describe: (e) => ["accepted ", ...applicationOf(e, "clan application")],
    },
    "clan_application.rejected": {
        label: "Clan application · rejected",
        icon: TablerX,
        variant: "red",
        describe: (e) => ["rejected ", ...applicationOf(e, "clan application")],
    },
    "clan_application.pending": {
        label: "Clan application · pending",
        icon: TablerClock,
        variant: "yellow",
        describe: (e) => ["moved ", ...applicationOf(e, "clan application"), " back to pending"],
    },
    "clan_application.delete": {
        label: "Clan application · deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (e) => ["deleted ", ...applicationOf(e, "clan application")],
    },
    "clan_application.clear_accepted": {
        label: "Clan application · cleared accepted",
        icon: TablerTrash,
        variant: "red",
        describe: (e) => [`cleared ${plural(metaNum(e, "deleted") || itemCount(e), "accepted clan application")}`],
    },
    "cwl_application.create": {
        label: "CWL application · submitted",
        icon: TablerSend,
        variant: "blue",
        describe: (e) => [
            ...(e.subjects?.find((s) => s.relation === "applicant")?.id === e.actorId
                ? ["signed up "]
                : ["signed up ", ...ent(e, "applicant"), "'s "]),
            ...ent(e, "account"),
            " for CWL in ",
            ...ent(e, "season"),
        ],
    },
    "cwl_application.assign": {
        label: "CWL application · assigned",
        icon: TablerArrowRight,
        variant: "blue",
        describe: (e) => {
            const to = refEntity(change(e, "assignedTo")?.after);
            return ["assigned ", ...ent(e, "account"), " to ", ...(to ? [{ entity: to }] : ["a CWL clan"])];
        },
    },
    "cwl_application.unassign": {
        label: "CWL application · unassigned",
        icon: TablerArrowBackUp,
        variant: "ghost",
        describe: (e) => {
            const from = refEntity(change(e, "assignedTo")?.before);
            return ["unassigned ", ...ent(e, "account"), ...(from ? [" from ", { entity: from }] : [])];
        },
    },
    "cwl_application.bulk_assign": {
        label: "CWL application · bulk assigned",
        icon: TablerArrowsRight,
        variant: "blue",
        describe: (e) => [`assigned ${plural(itemCount(e), "account")} to `, ...ent(e, "assigned clan")],
    },
    "cwl_application.bulk_unassign": {
        label: "CWL application · bulk unassigned",
        icon: TablerArrowsLeft,
        variant: "ghost",
        describe: (e) => [`unassigned ${plural(itemCount(e), "account")} from their CWL clans`],
    },
    "cwl_application.bulk_delete": {
        label: "CWL application · bulk deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (e) => [`deleted ${plural(metaNum(e, "count") || itemCount(e), "CWL application")}`],
    },
    "cwl_application.update_notes": {
        label: "CWL application · notes updated",
        icon: TablerEdit,
        variant: "yellow",
        describe: () => ["updated CWL application notes"],
    },
    "cwl_bonus.tick": {
        label: "CWL bonus · awarded",
        icon: TablerCalendarCheck,
        variant: "green",
        describe: (e) => [
            "awarded ",
            ...ent(e, "member"),
            " a CWL bonus",
            ...(subject(e, "account") ? [" for ", ...ent(e, "account")] : []),
            " in ",
            ...ent(e, "season"),
        ],
    },
    "cwl_bonus.untick": {
        label: "CWL bonus · removed",
        icon: TablerCalendarMinus,
        variant: "ghost",
        describe: (e) => ["removed ", ...ent(e, "member"), "'s CWL bonus in ", ...ent(e, "season")],
    },
    "cwl_season.create": {
        label: "CWL season · created",
        icon: TablerCalendarCheck,
        variant: "green",
        describe: (e) => ["created CWL season ", ...ent(e, "target", snapshot(e, "name"))],
    },
    "cwl_season.rename": {
        label: "CWL season · renamed",
        icon: TablerEdit,
        variant: "yellow",
        describe: (e) => [
            "renamed CWL season ",
            { field: "name", value: change(e, "name")?.before },
            " to ",
            { field: "name", value: change(e, "name")?.after },
        ],
    },
    "cwl_season.delete": {
        label: "CWL season · deleted",
        icon: TablerCalendarX,
        variant: "red",
        describe: (e) => ["deleted CWL season ", { field: "name", value: snapshot(e, "name") }],
    },
    "settings.update": {
        label: "Settings · updated",
        icon: TablerSettings,
        variant: "yellow",
        describe: (e) => toggleSummary(e, "settings"),
    },
    "cwl_ping.settings_update": {
        label: "CWL ping · settings updated",
        icon: TablerBellRinging,
        variant: "yellow",
        describe: (e) => {
            const only = e.changes?.length === 1 ? e.changes[0] : null;
            if (only?.field === "enabled") return [`turned ${only.after ? "on" : "off"} the CWL ping`];
            return toggleSummary(e, "CWL ping settings");
        },
    },
    "cwl_ping.manual_run": {
        label: "CWL ping · manual run",
        icon: TablerPlayerPlay,
        variant: "blue",
        describe: (e) =>
            meta(e, "skippedReason")
                ? [`ran the CWL ping, which skipped: ${String(meta(e, "skippedReason"))}`]
                : [`ran the CWL ping, pinging ${plural(metaNum(e, "usersPinged"), "member")} across ${plural(metaNum(e, "clansPinged"), "clan")}`],
    },
    "rules.update": {
        label: "Rules · updated",
        icon: TablerGavel,
        variant: "yellow",
        describe: (e) => textEdit(e, "rules"),
    },
    "privacy.update": {
        label: "Privacy policy · updated",
        icon: TablerShieldLock,
        variant: "yellow",
        describe: (e) => textEdit(e, "privacy policy"),
    },
    "clan.create": {
        label: "Clan · created",
        icon: TablerPlus,
        variant: "green",
        describe: (e) => ["added family clan ", ...ent(e, "target", snapshot(e, "cocClanName"))],
    },
    "clan.update": {
        label: "Clan · updated",
        icon: TablerEdit,
        variant: "yellow",
        describe: (e) => changeSummary(e, ent(e, "target")),
    },
    "clan.delete": {
        label: "Clan · deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (e) => ["removed family clan ", ...ent(e, "target", snapshot(e, "cocClanName") ?? snapshot(e, "cocClanCode"))],
    },
    "cwl_clan.create": {
        label: "CWL clan · created",
        icon: TablerPlus,
        variant: "green",
        describe: (e) => ["added CWL clan ", ...ent(e, "target", snapshot(e, "cocClanName"))],
    },
    "cwl_clan.update": {
        label: "CWL clan · updated",
        icon: TablerEdit,
        variant: "yellow",
        describe: (e) => changeSummary(e, ent(e, "target")),
    },
    "cwl_clan.delete": {
        label: "CWL clan · deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (e) => ["removed CWL clan ", ...ent(e, "target", snapshot(e, "cocClanName"))],
    },
    "cwl_clan.sync_leagues": {
        label: "CWL clan · leagues synced",
        icon: TablerRefresh,
        variant: "blue",
        describe: (e) => [
            `synced CWL clans from the game, ${plural(metaNum(e, "updated"), "clan")} changed`,
            metaNum(e, "failed") ? `, ${metaNum(e, "failed")} failed` : "",
        ],
    },
    "coc_account.create": {
        label: "COC account · added",
        icon: TablerUserPlus,
        variant: "green",
        describe: (e) =>
            subject(e, "owner")?.id === e.actorId
                ? ["linked their account ", ...ent(e, "target")]
                : ["linked ", ...ent(e, "target"), " to ", ...ent(e, "owner")],
    },
    "coc_account.import": {
        label: "COC account · imported",
        icon: TablerDownload,
        variant: "blue",
        describe: (e) => [`imported ${plural(metaNum(e, "count") || itemCount(e), "account")}`],
    },
    "coc_account.stats_update": {
        label: "COC account · stats edited",
        icon: TablerEdit,
        variant: "yellow",
        describe: (e) => changeSummary(e, ent(e, "target")),
    },
    "coc_account.weight_update": {
        label: "COC account · war weight",
        icon: TablerWeight,
        variant: "yellow",
        describe: (e) => changeSummary(e, ent(e, "target")),
    },
    "coc_account.mark_external": {
        label: "COC account · marked external",
        icon: TablerWorld,
        variant: "yellow",
        describe: (e) => ["marked ", ...ent(e, "target"), " as external"],
    },
    "coc_account.mark_main": {
        label: "COC account · marked main",
        icon: TablerShieldCheck,
        variant: "green",
        describe: (e) => ["marked ", ...ent(e, "target"), " as main"],
    },
    "coc_account.sync": {
        label: "COC account · synced",
        icon: TablerRefresh,
        variant: "blue",
        describe: (e) => [
            `synced stats from a Google Sheet, ${plural(metaNum(e, "changed"), "account")} changed of ${metaNum(e, "updated").toLocaleString()} matched`,
        ],
    },
    "coc_account.sync_war_weights": {
        label: "COC account · war weights synced",
        icon: TablerRefresh,
        variant: "blue",
        describe: (e) => [`synced war weights from FWA, ${plural(metaNum(e, "changed"), "weight")} changed`],
    },
    "coc_account.delete": {
        label: "COC account · deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (e) => ["deleted ", ...ent(e, "target"), ...(subject(e, "owner") ? [" owned by ", ...ent(e, "owner")] : [])],
    },
    "coc_account.bulk_delete": {
        label: "COC account · bulk deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (e) => [`deleted ${plural(metaNum(e, "count") || itemCount(e), "account")}`],
    },
    "user.role_set": {
        label: "User · role set",
        icon: TablerShieldHalf,
        variant: "yellow",
        describe: (e) => {
            const c = change(e, "role");
            return c
                ? ["changed ", ...userTarget(e), "'s role from ", { field: "role", value: c.before }, " to ", { field: "role", value: c.after }]
                : ["changed the role of ", ...userTarget(e)];
        },
    },
    "user.create": {
        label: "User · created",
        icon: TablerUserPlus,
        variant: "green",
        describe: (e) => ["created ", ...userTarget(e)],
    },
    "user.update": {
        label: "User · updated",
        icon: TablerEdit,
        variant: "yellow",
        describe: (e) => ["updated ", ...userTarget(e), e.changes?.length ? ` (${fieldList(e.changes)})` : ""],
    },
    "user.ban": {
        label: "User · banned",
        icon: TablerBan,
        variant: "red",
        describe: (e) => {
            const reason = change(e, "banReason")?.after;
            return ["banned ", ...userTarget(e), typeof reason === "string" && reason ? `: ${reason}` : ""];
        },
    },
    "user.unban": {
        label: "User · unbanned",
        icon: TablerUserCheck,
        variant: "green",
        describe: (e) => ["unbanned ", ...userTarget(e)],
    },
    "user.remove": {
        label: "User · removed",
        icon: TablerUserMinus,
        variant: "red",
        describe: (e) => ["removed ", ...userTarget(e)],
    },
    "user.password_set": {
        label: "User · password set",
        icon: TablerKey,
        variant: "yellow",
        describe: (e) => ["set the password for ", ...userTarget(e)],
    },
    "user.session_revoked": {
        label: "User · session revoked",
        icon: TablerLogout,
        variant: "red",
        describe: (e) => ["signed ", ...userTarget(e), " out of one session"],
    },
    "user.sessions_revoked": {
        label: "User · all sessions revoked",
        icon: TablerLogout2,
        variant: "red",
        describe: (e) => [
            "signed ",
            ...userTarget(e),
            " out everywhere",
            metaNum(e, "sessionsRevoked") ? ` (${plural(metaNum(e, "sessionsRevoked"), "session")})` : "",
        ],
    },
    "user.impersonate": {
        label: "User · impersonation started",
        icon: TablerMask,
        variant: "purple",
        describe: (e) => ["started impersonating ", ...userTarget(e)],
    },
    "user.impersonate_stop": {
        label: "User · impersonation stopped",
        icon: TablerMaskOff,
        variant: "ghost",
        describe: (e) => ["stopped impersonating ", ...userTarget(e)],
    },
    "user.api_access_granted": {
        label: "User · API access granted",
        icon: TablerKey,
        variant: "green",
        describe: (e) => ["granted API access to ", ...userTarget(e)],
    },
    "user.api_access_revoked": {
        label: "User · API access revoked",
        icon: TablerKeyOff,
        variant: "red",
        // Revoking access also disables every live key, which is the part a reader needs.
        describe: (e) => [
            "revoked API access from ",
            ...userTarget(e),
            metaNum(e, "disabledKeys") ? `, disabling ${plural(metaNum(e, "disabledKeys"), "key")}` : "",
        ],
    },
    "user.usernames_refreshed": {
        label: "User · Discord usernames refreshed",
        icon: TablerRefresh,
        variant: "blue",
        describe: (e) => [`refreshed Discord usernames, ${plural(metaNum(e, "updated"), "user")} changed`],
    },
    "api_key.create": {
        label: "API key · created",
        icon: TablerPlus,
        variant: "green",
        describe: (e) => ["created the API key ", ...ent(e, "target", snapshot(e, "name"))],
    },
    "api_key.update": {
        label: "API key · updated",
        icon: TablerEdit,
        variant: "yellow",
        describe: (e) => changeSummary(e, ["the API key ", ...ent(e, "target", snapshot(e, "name"))]),
    },
    "api_key.delete": {
        label: "API key · revoked",
        icon: TablerTrash,
        variant: "red",
        describe: (e) => ["revoked the API key ", ...ent(e, "target", snapshot(e, "name"))],
    },
};

const FALLBACK_CONFIG: AuditActionConfig = {
    label: "Unknown action",
    icon: TablerSettings,
    variant: "ghost",
    describe: (e) => [`${e.action}${e.targetType ? ` on ${e.targetType}` : ""}${e.targetId ? ` #${e.targetId}` : ""}`],
};

export function actionConfig(action: string): AuditActionConfig {
    return AUDIT_ACTION_CONFIG[action as AuditAction] ?? FALLBACK_CONFIG;
}

// Rows written before the revamp carry only free-form metadata. They keep the
// action label plus whichever identifiers that metadata happened to hold.
const LEGACY_KEYS = [
    "cocAccountTag",
    "cocClanTag",
    "cocClanCode",
    "cocClanName",
    "name",
    "targetName",
    "assignedClanTag",
    "count",
    "deleted",
    "updated",
];

function isLegacy(e: AuditEntry) {
    return !e.subjects && !e.changes && !e.items && !e.context;
}

export function describe(e: AuditEntry): Segment[] {
    const cfg = actionConfig(e.action);
    if (!isLegacy(e)) return cfg.describe(e);
    const m = e.metadata ?? {};
    const details = LEGACY_KEYS.flatMap((k) => (typeof m[k] === "string" || typeof m[k] === "number" ? [String(m[k])] : []));
    const what = cfg.label.split(" · ").reverse().join(" ").toLowerCase();
    return [`${what}${details.length ? `: ${details.join(", ")}` : ""}`];
}

export function toText(segments: Segment[], r: AuditResolver): string {
    return segments
        .map((s) => {
            if (typeof s === "string") return s;
            if ("entity" in s) return r.entity(s.entity, s.fallback).name;
            return formatValue(s.field, s.value, r);
        })
        .join("");
}

export function describeText(e: AuditEntry, r: AuditResolver): string {
    return toText(describe(e), r);
}

export function actorOf(e: AuditEntry, r: AuditResolver): ResolvedUser | null {
    return e.actorId ? r.user(e.actorId) : null;
}

export const AUDIT_TARGET_LABELS: Record<AuditTargetType, string> = {
    clan_application: "Clan applications",
    cwl_application: "CWL applications",
    cwl_bonus: "CWL bonus",
    cwl_season: "CWL seasons",
    settings: "Settings",
    rules: "Rules",
    privacy: "Privacy",
    clan: "Clans",
    cwl_clan: "CWL clans",
    coc_account: "COC accounts",
    user: "Users",
    api_key: "API keys",
};

export const AUDIT_TARGET_ICONS: Record<AuditTargetType, Component> = {
    clan_application: TablerUserPlus,
    cwl_application: TablerSwords,
    cwl_bonus: TablerCoin,
    cwl_season: TablerCalendarCheck,
    settings: TablerSettings,
    rules: TablerGavel,
    privacy: TablerShieldLock,
    clan: TablerShieldHalf,
    cwl_clan: TablerSwords,
    coc_account: TablerUser,
    user: TablerUsers,
    api_key: TablerKey,
};

export const auditActionOptions: Option[] = [
    { label: "All actions", value: "", icon: TablerList },
    ...(Object.entries(AUDIT_ACTION_CONFIG) as [AuditAction, AuditActionConfig][]).map(([value, cfg]) => ({
        label: cfg.label,
        value,
        icon: cfg.icon,
    })),
];

export const auditTargetOptions: Option[] = [
    { label: "All targets", value: "", icon: TablerList },
    ...(Object.entries(AUDIT_TARGET_LABELS) as [AuditTargetType, string][]).map(([value, label]) => ({
        label,
        value,
        icon: AUDIT_TARGET_ICONS[value],
    })),
];

// Where an action came from, orthogonal to what it did. Filtering by it answers
// "what have the bots been changing?" without wading through web traffic.
export const auditSourceOptions: Option[] = [
    { label: "All sources", value: "", icon: TablerList },
    { label: "Web", value: "web", icon: TablerWorld },
    { label: "API", value: "api", icon: TablerKey },
];

export const auditRangeOptions: Option[] = [
    { label: "Any time", value: "", icon: TablerClock },
    { label: "Last 24 hours", value: "1", icon: TablerClock },
    { label: "Last 7 days", value: "7", icon: TablerClock },
    { label: "Last 30 days", value: "30", icon: TablerClock },
    { label: "Last 90 days", value: "90", icon: TablerClock },
];
