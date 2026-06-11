import type { Option } from "$lib/components/ui/Select.svelte";
import type { GetAuditLog200 } from "@repo/clashofclans-client";
import type { Component } from "svelte";
import TablerArrowBackUp from "~icons/tabler/arrow-back-up";
import TablerArrowRight from "~icons/tabler/arrow-right";
import TablerArrowsLeft from "~icons/tabler/arrows-left";
import TablerArrowsRight from "~icons/tabler/arrows-right";
import TablerCalendarCheck from "~icons/tabler/calendar-check";
import TablerCalendarMinus from "~icons/tabler/calendar-minus";
import TablerCalendarX from "~icons/tabler/calendar-x";
import TablerCoin from "~icons/tabler/coin";
import TablerBan from "~icons/tabler/ban";
import TablerCheck from "~icons/tabler/check";
import TablerClock from "~icons/tabler/clock";
import TablerDownload from "~icons/tabler/download";
import TablerEdit from "~icons/tabler/edit";
import TablerGavel from "~icons/tabler/gavel";
import TablerKey from "~icons/tabler/key";
import TablerList from "~icons/tabler/list";
import TablerLogout from "~icons/tabler/logout";
import TablerLogout2 from "~icons/tabler/logout-2";
import TablerPlus from "~icons/tabler/plus";
import TablerRefresh from "~icons/tabler/refresh";
import TablerSend from "~icons/tabler/send";
import TablerSettings from "~icons/tabler/settings";
import TablerShieldCheck from "~icons/tabler/shield-check";
import TablerShieldHalf from "~icons/tabler/shield-half";
import TablerSwords from "~icons/tabler/swords";
import TablerTrash from "~icons/tabler/trash";
import TablerUser from "~icons/tabler/user";
import TablerUserCheck from "~icons/tabler/user-check";
import TablerUserMinus from "~icons/tabler/user-minus";
import TablerUserPlus from "~icons/tabler/user-plus";
import TablerUsers from "~icons/tabler/users";
import TablerWorld from "~icons/tabler/world";
import TablerX from "~icons/tabler/x";

export type AuditEntry = GetAuditLog200["data"]["entries"][number];
export type AuditAction = AuditEntry["action"];
export type AuditTargetType = NonNullable<AuditEntry["targetType"]>;

type AuditVariant = "blue" | "green" | "red" | "yellow" | "ghost";

type Meta = Record<string, any>;

export interface AuditActionConfig {
    label: string;
    icon: Component;
    variant: AuditVariant;
    describe: (m: Meta, e: AuditEntry) => string;
}

function roleLabel(role: unknown): string {
    if (Array.isArray(role)) return role.join(", ") || "?";
    if (typeof role === "string") return role;
    return "?";
}

function userTargetLabel(e: AuditEntry, m: Meta): string {
    const name = typeof m.targetName === "string" ? m.targetName : null;
    const discordId = typeof m.targetDiscordId === "string" ? m.targetDiscordId : null;
    const idHint = e.targetId ? `#${e.targetId.slice(0, 8)}` : "";
    if (name && discordId) return `${name} (discord:${discordId})`;
    if (name) return `${name} ${idHint}`.trim();
    if (discordId) return `discord:${discordId} ${idHint}`.trim();
    return e.targetId ? `user #${e.targetId}` : "user";
}

export const AUDIT_ACTION_CONFIG: Record<AuditAction, AuditActionConfig> = {
    "clan_application.create": {
        label: "Clan application · submitted",
        icon: TablerSend,
        variant: "blue",
        describe: (m) => `submitted a clan application with ${m.cocAccountTag ?? "?"}`,
    },
    "clan_application.accepted": {
        label: "Clan application · accepted",
        icon: TablerCheck,
        variant: "green",
        describe: (m) => `accepted the clan application from ${m.cocAccountTag ?? "?"}`,
    },
    "clan_application.rejected": {
        label: "Clan application · rejected",
        icon: TablerX,
        variant: "red",
        describe: (m) => `rejected the clan application from ${m.cocAccountTag ?? "?"}`,
    },
    "clan_application.pending": {
        label: "Clan application · pending",
        icon: TablerClock,
        variant: "yellow",
        describe: (m) => `marked the clan application from ${m.cocAccountTag ?? "?"} as pending`,
    },
    "clan_application.delete": {
        label: "Clan application · deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (m) => `deleted the clan application from ${m.cocAccountTag ?? "?"}`,
    },
    "clan_application.clear_accepted": {
        label: "Clan application · cleared accepted",
        icon: TablerTrash,
        variant: "red",
        describe: (m) => `cleared ${m.deleted ?? "?"} accepted clan application${m.deleted === 1 ? "" : "s"}`,
    },
    "cwl_application.create": {
        label: "CWL application · submitted",
        icon: TablerSend,
        variant: "blue",
        describe: (m) =>
            `submitted a CWL application with ${m.cocAccountTag ?? "?"} (pref #${m.preferenceNum ?? "?"}${m.isExternal ? ", external" : ""})`,
    },
    "cwl_application.assign": {
        label: "CWL application · assigned",
        icon: TablerArrowRight,
        variant: "blue",
        describe: (m) => `assigned ${m.cocAccountTag ?? "?"} to CWL clan ${m.assignedClanTag ?? "?"}`,
    },
    "cwl_application.unassign": {
        label: "CWL application · unassigned",
        icon: TablerArrowBackUp,
        variant: "ghost",
        describe: (m) => `unassigned the CWL application for ${m.cocAccountTag ?? "?"}`,
    },
    "cwl_application.bulk_assign": {
        label: "CWL application · bulk assigned",
        icon: TablerArrowsRight,
        variant: "blue",
        describe: (m) => `assigned ${m.count ?? "?"} CWL application${m.count === 1 ? "" : "s"} to CWL clan ${m.assignedClanTag ?? "?"}`,
    },
    "cwl_application.bulk_unassign": {
        label: "CWL application · bulk unassigned",
        icon: TablerArrowsLeft,
        variant: "ghost",
        describe: (m) => `unassigned ${m.count ?? "?"} CWL application${m.count === 1 ? "" : "s"}`,
    },
    "cwl_application.bulk_delete": {
        label: "CWL application · bulk deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (m) => `deleted ${m.count ?? "?"} CWL application${m.count === 1 ? "" : "s"}`,
    },
    "cwl_application.update_notes": {
        label: "CWL application · notes updated",
        icon: TablerEdit,
        variant: "yellow",
        describe: () => `updated CWL application notes`,
    },
    "cwl_bonus.tick": {
        label: "CWL bonus · awarded",
        icon: TablerCalendarCheck,
        variant: "green",
        describe: (m) => `awarded a CWL bonus${m.cocAccountTag ? ` (${m.cocAccountTag})` : ""}`,
    },
    "cwl_bonus.untick": {
        label: "CWL bonus · removed",
        icon: TablerCalendarMinus,
        variant: "ghost",
        describe: () => `removed a CWL bonus`,
    },
    "cwl_season.create": {
        label: "CWL season · created",
        icon: TablerCalendarCheck,
        variant: "green",
        describe: (m) => `created CWL season ${m.name ?? "?"}`,
    },
    "cwl_season.delete": {
        label: "CWL season · deleted",
        icon: TablerCalendarX,
        variant: "red",
        describe: (m) => `deleted CWL season ${m.name ?? "?"}`,
    },
    "settings.update": {
        label: "Settings · updated",
        icon: TablerSettings,
        variant: "yellow",
        describe: (m) => {
            const parts: string[] = [];
            if (m.booleans && typeof m.booleans === "object") {
                for (const [k, v] of Object.entries(m.booleans as Record<string, boolean>)) parts.push(`${k} → ${v ? "on" : "off"}`);
            }
            if (Array.isArray(m.fields) && m.fields.length) parts.push(`updated ${m.fields.join(", ")}`);
            return parts.length ? `changed settings: ${parts.join("; ")}` : "updated the settings";
        },
    },
    "rules.update": {
        label: "Rules · updated",
        icon: TablerGavel,
        variant: "yellow",
        describe: () => "updated the rules",
    },
    "clan.create": {
        label: "Clan · created",
        icon: TablerPlus,
        variant: "green",
        describe: (m) => `created clan ${m.cocClanCode ?? ""} (${m.cocClanTag ?? "?"})`.replace("  ", " "),
    },
    "clan.update": {
        label: "Clan · updated",
        icon: TablerEdit,
        variant: "yellow",
        describe: (m) =>
            Array.isArray(m.fields) && m.fields.length
                ? `updated clan ${m.cocClanCode ?? "?"} (${m.fields.join(", ")})`
                : `updated clan ${m.cocClanCode ?? "?"}`,
    },
    "clan.delete": {
        label: "Clan · deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (m) => `deleted clan ${m.cocClanCode ?? ""} (${m.cocClanTag ?? "?"})`.replace("  ", " "),
    },
    "cwl_clan.create": {
        label: "CWL clan · created",
        icon: TablerPlus,
        variant: "green",
        describe: (m) => `created CWL clan ${m.cocClanName ?? ""} (${m.cocClanTag ?? "?"})`.replace("  ", " "),
    },
    "cwl_clan.update": {
        label: "CWL clan · updated",
        icon: TablerEdit,
        variant: "yellow",
        describe: (m) =>
            Array.isArray(m.fields) && m.fields.length
                ? `updated CWL clan ${m.cocClanTag ?? "?"} (${m.fields.join(", ")})`
                : `updated CWL clan ${m.cocClanTag ?? "?"}`,
    },
    "cwl_clan.delete": {
        label: "CWL clan · deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (m) => `deleted CWL clan ${m.cocClanName ?? ""} (${m.cocClanTag ?? "?"})`.replace("  ", " "),
    },
    "cwl_clan.sync_leagues": {
        label: "CWL clan · leagues synced",
        icon: TablerRefresh,
        variant: "blue",
        describe: (m) => `synced CWL leagues (${m.updated ?? 0} updated, ${m.unchanged ?? 0} unchanged, ${m.failed ?? 0} failed)`,
    },
    "coc_account.create": {
        label: "COC account · added",
        icon: TablerUserPlus,
        variant: "green",
        describe: (m) =>
            `added COC account ${m.cocAccountTag ?? "?"}${m.warWeight != null ? ` (weight ${m.warWeight})` : ""}${m.isExternal ? ", external" : ""}`,
    },
    "coc_account.import": {
        label: "COC account · imported",
        icon: TablerDownload,
        variant: "blue",
        describe: (m) => `imported ${m.count ?? "?"} COC account${m.count === 1 ? "" : "s"}`,
    },
    "coc_account.stats_update": {
        label: "COC account · stats edited",
        icon: TablerEdit,
        variant: "yellow",
        describe: (m) => {
            // War weight edits log through this action too, with the value in metadata.
            if (m.warWeight != null && Array.isArray(m.fields) && m.fields.length === 1 && m.fields[0] === "warWeight")
                return `set the war weight of ${m.cocAccountTag ?? "?"} to ${m.warWeight}`;
            return Array.isArray(m.fields) && m.fields.length
                ? `edited stats for ${m.cocAccountTag ?? "?"} (${m.fields.join(", ")})`
                : `edited stats for ${m.cocAccountTag ?? "?"}`;
        },
    },
    "coc_account.mark_external": {
        label: "COC account · marked external",
        icon: TablerWorld,
        variant: "yellow",
        describe: (m) => `marked ${m.cocAccountTag ?? "?"} as external`,
    },
    "coc_account.mark_main": {
        label: "COC account · marked main",
        icon: TablerShieldCheck,
        variant: "green",
        describe: (m) => `marked ${m.cocAccountTag ?? "?"} as main`,
    },
    "coc_account.sync": {
        label: "COC account · synced",
        icon: TablerRefresh,
        variant: "blue",
        describe: (m) =>
            `synced stats for ${m.updated ?? "?"} account${m.updated === 1 ? "" : "s"} from a sheet${m.notLinked ? ` (${m.notLinked} not linked)` : ""}`,
    },
    "coc_account.delete": {
        label: "COC account · deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (m) => `deleted COC account ${m.cocAccountTag ?? "?"}`,
    },
    "coc_account.bulk_delete": {
        label: "COC account · bulk deleted",
        icon: TablerTrash,
        variant: "red",
        describe: (m) => {
            const tags = Array.isArray(m.cocAccountTags) ? (m.cocAccountTags as string[]) : [];
            const count = typeof m.count === "number" ? m.count : tags.length;
            // Show the tags when the list is short enough to stay readable, mirroring
            // the single delete; otherwise fall back to a plain count.
            const shown = tags.slice(0, 5);
            const suffix = shown.length ? ` (${shown.join(", ")}${tags.length > shown.length ? `, +${tags.length - shown.length} more` : ""})` : "";
            return `deleted ${count} COC account${count === 1 ? "" : "s"}${suffix}`;
        },
    },
    "user.role_set": {
        label: "User · role set",
        icon: TablerShieldHalf,
        variant: "yellow",
        describe: (m, e) => `set the role of ${userTargetLabel(e, m)} to ${roleLabel(m.role)}`,
    },
    "user.create": {
        label: "User · created",
        icon: TablerUserPlus,
        variant: "green",
        describe: (m, e) => `created user ${userTargetLabel(e, m)}${m.role ? ` with role ${roleLabel(m.role)}` : ""}`,
    },
    "user.update": {
        label: "User · updated",
        icon: TablerEdit,
        variant: "yellow",
        describe: (m, e) =>
            `updated user ${userTargetLabel(e, m)}${Array.isArray(m.changedFields) && m.changedFields.length ? ` (${m.changedFields.join(", ")})` : ""}`,
    },
    "user.ban": {
        label: "User · banned",
        icon: TablerBan,
        variant: "red",
        describe: (m, e) => `banned ${userTargetLabel(e, m)}${m.banReason ? ` — ${m.banReason}` : ""}`,
    },
    "user.unban": {
        label: "User · unbanned",
        icon: TablerUserCheck,
        variant: "green",
        describe: (m, e) => `unbanned ${userTargetLabel(e, m)}`,
    },
    "user.remove": {
        label: "User · removed",
        icon: TablerUserMinus,
        variant: "red",
        describe: (m, e) => `removed ${userTargetLabel(e, m)}`,
    },
    "user.password_set": {
        label: "User · password set",
        icon: TablerKey,
        variant: "yellow",
        describe: (m, e) => `set the password for ${userTargetLabel(e, m)}`,
    },
    "user.session_revoked": {
        label: "User · session revoked",
        icon: TablerLogout,
        variant: "red",
        describe: (m, e) => `revoked a session${e.targetId ? ` for ${userTargetLabel(e, m)}` : ""}`,
    },
    "user.sessions_revoked": {
        label: "User · all sessions revoked",
        icon: TablerLogout2,
        variant: "red",
        describe: (m, e) => `revoked all sessions for ${userTargetLabel(e, m)}`,
    },
};

export const AUDIT_TARGET_LABELS: Record<AuditTargetType, string> = {
    clan_application: "Clan applications",
    cwl_application: "CWL applications",
    cwl_bonus: "CWL bonus",
    cwl_season: "CWL seasons",
    settings: "Settings",
    rules: "Rules",
    clan: "Clans",
    cwl_clan: "CWL clans",
    coc_account: "COC accounts",
    user: "Users",
};

export const AUDIT_TARGET_ICONS: Record<AuditTargetType, Component> = {
    clan_application: TablerUserPlus,
    cwl_application: TablerSwords,
    cwl_bonus: TablerCoin,
    cwl_season: TablerCalendarCheck,
    settings: TablerSettings,
    rules: TablerGavel,
    clan: TablerShieldHalf,
    cwl_clan: TablerSwords,
    coc_account: TablerUser,
    user: TablerUsers,
};

const FALLBACK_CONFIG: AuditActionConfig = {
    label: "Unknown action",
    icon: TablerSettings,
    variant: "ghost",
    describe: (_m, e) => `${e.action}${e.targetType ? ` on ${e.targetType}` : ""}${e.targetId ? ` #${e.targetId}` : ""}`,
};

export function actionConfig(action: string): AuditActionConfig {
    return AUDIT_ACTION_CONFIG[action as AuditAction] ?? FALLBACK_CONFIG;
}

export function describeAction(e: AuditEntry): string {
    return (
        actionConfig(e.action)
            .describe((e.metadata ?? {}) as Meta, e)[0]
            .toUpperCase() +
        actionConfig(e.action)
            .describe((e.metadata ?? {}) as Meta, e)
            .slice(1)
    );
}

export function actorLabel(e: AuditEntry): string {
    return e.actorCurrentName ?? e.actorName ?? (e.actorId ? `User ${e.actorId.slice(0, 8)}` : "System");
}

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
