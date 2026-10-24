import type { GetWarLogClans200, GetWarLogPlayers200, GetWarLogWar200, GetWarLogWars200 } from "@repo/clashofclans-client";

export type WarDetail = GetWarLogWar200["data"]["war"];
export type WarSummary = GetWarLogWars200["data"]["wars"][number];
export type WarAttack = WarDetail["attacks"][number];
export type WarMember = WarDetail["clan"]["members"][number];
export type PlayerStats = GetWarLogPlayers200["data"]["players"][number];
export type WarLogClan = GetWarLogClans200["data"]["clans"][number];
export type Side = WarAttack["side"];

// Checked with the dataviz palette validator against the plank surface. A green/red
// pair fails for deuteranopia, so the opponent wears the theme's blurple instead.
export const SIDE_COLOR = { clan: "#58a221", opponent: "#7b87f6" } as const;

export const tagToSlug = (tag: string) => tag.replace(/^#+/, "").toUpperCase();
export const slugToTag = (slug: string) => `#${tagToSlug(decodeURIComponent(slug))}`;
export const warLogHref = (tag: string) => `/wars/log/${tagToSlug(tag)}`;

export const STATE_LABEL: Record<string, string> = { preparation: "Preparation", inWar: "Battle day", warEnded: "War ended" };
export const RESULT_LABEL: Record<string, string> = { win: "Victory", lose: "Defeat", tie: "Draw" };
export const RESULT_TEXT: Record<string, string> = { win: "text-[#b9f07a]", lose: "text-[#ff8a75]", tie: "text-white" };

export const isActive = (state: string) => state === "inWar" || state === "preparation";

/** Attacks the clan never made. Only final once the war is over. */
export const missedAttacks = (w: Pick<WarSummary, "teamSize" | "attacksPerMember" | "clanAttacks">) =>
    Math.max(0, w.teamSize * w.attacksPerMember - w.clanAttacks);

const pad = (n: number) => n.toString().padStart(2, "0");

export function formatCountdown(ms: number) {
    if (ms <= 0) return "any second";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return h ? `${h}h ${pad(m)}m` : `${m}m ${pad(s)}s`;
}

export const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;

export function formatAgo(iso: string | null, now: number) {
    if (!iso) return "";
    const sec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (sec < 45) return "just now";
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ${pad(min % 60)}m ago`;
    return formatShortDate(iso);
}

export const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
