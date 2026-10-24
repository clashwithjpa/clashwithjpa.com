import type { MetaCard } from "@/lib/card/page";
import { config } from "@/lib/config";
import { getFwaPoints } from "@/lib/fwa-points";
import { getLatestWarDetail, getWarDetail, listClanWars, normalizeTag, type WarDetail } from "@/lib/war-log";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    escapeMarkdown,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    time,
    TimestampStyles,
} from "discord.js";

// Discord reads this card from the shared page's HTML (a "Link Component Embed"). It takes the
// same components as a Components v2 message, minus anything interactive: link buttons only.
// No separators, by the site's own rule for Discord cards.

type Side = "clan" | "opponent";

const ACCENT = { inWar: 0xd23624, preparation: 0xe68e2e, win: 0x58a221, lose: 0xc22a1a, tie: 0x78716c } as const;
const RESULT = { win: "🏆 **Victory**", lose: "💀 **Defeat**", tie: "🤝 **Draw**" } as Record<string, string>;
const MAX_NAMES = 8;

const slug = (tag: string) => tag.replace(/^#/, "");
const unix = (iso: string) => Math.floor(Date.parse(iso) / 1000);
// Code blocks can't escape, so a backtick in a name would end the block early.
const plain = (s: string) => s.replace(/`/g, "'");
// Player names go in inline code, so they read as names and need no markdown escaping.
const player = (name: string, max = 16) => `\`${plain(cut(name, max))}\``;
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
const stars = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);
// Badge URLs carry their size in the path; the card thumbnail wants the big one.
const bigBadge = (url: string | null) => url?.replace("/badges/70/", "/badges/512/") ?? null;

function sideStats(war: WarDetail, side: Side) {
    const hits = war.attacks.filter((a) => a.side === side);
    const fresh = hits.filter((a) => a.fresh);
    const avg = (f: (a: (typeof hits)[number]) => number) => (hits.length ? hits.reduce((n, a) => n + f(a), 0) / hits.length : 0);
    return {
        triples: hits.filter((a) => a.stars === 3).length,
        avgStars: avg((a) => a.stars),
        freshTriple: fresh.length ? (fresh.filter((a) => a.stars === 3).length / fresh.length) * 100 : 0,
        mirror: hits.length ? (hits.filter((a) => a.attackerPos === a.defenderPos).length / hits.length) * 100 : 0,
        avgTime: avg((a) => a.duration),
    };
}

// A fixed-width side-by-side table, kept narrow enough not to wrap on a phone.
function statTable(war: WarDetail, us: string) {
    const a = sideStats(war, "clan");
    const b = sideStats(war, "opponent");
    const total = war.teamSize * war.attacksPerMember;
    // Value columns fit the longer clan name, up to a width that still reads on a phone.
    const left = plain(us);
    const right = plain(war.opponent.name ?? "Them");
    const col = Math.min(15, Math.max(9, left.length + 2, right.length + 2));
    const rows: [string, string, string][] = [
        ["", cut(left, col - 1), cut(right, col - 1)],
        ["Stars", String(war.clan.stars), String(war.opponent.stars)],
        ["Destruction", pct(war.clan.destruction), pct(war.opponent.destruction)],
        // The war log summary only counts our own hits.
        ["Hits used", `${war.clan.attacks}/${total}`, war.hasDetail ? `${war.opponent.attacks}/${total}` : "?"],
    ];
    if (war.hasDetail && war.attacks.length) {
        rows.push(
            ["Triples", String(a.triples), String(b.triples)],
            ["Avg ★/hit", a.avgStars.toFixed(2), b.avgStars.toFixed(2)],
            ["Fresh 3★", pct(a.freshTriple, 0), pct(b.freshTriple, 0)],
            ["Mirror hits", pct(a.mirror, 0), pct(b.mirror, 0)],
            ["Avg hit time", `${Math.round(a.avgTime)}s`, `${Math.round(b.avgTime)}s`],
        );
    }
    return "```\n" + rows.map(([l, x, y]) => `${l.padEnd(12)}${x.padStart(col)}${y.padStart(col)}`).join("\n") + "\n```";
}

function spread(war: WarDetail, side: Side) {
    const counts = new Map<number, number>();
    for (const m of war[side].members) counts.set(m.th, (counts.get(m.th) ?? 0) + 1);
    return [...counts]
        .sort((x, y) => y[0] - x[0])
        .slice(0, 5)
        .map(([th, n]) => `TH${th}×${n}`)
        .join(" · ");
}

function nameList(names: string[]) {
    const shown = names.slice(0, MAX_NAMES).map((n) => player(n));
    return shown.join(", ") + (names.length > MAX_NAMES ? ` +${names.length - MAX_NAMES}` : "");
}

// Who still has hits in hand, or who left hits unused once the war is over.
function attackers(war: WarDetail) {
    if (war.state === "preparation" || !war.hasDetail) return null;
    const groups = new Map<number, string[]>();
    for (const m of war.clan.members) {
        const left = war.attacksPerMember - m.attacks;
        if (left > 0) groups.set(left, [...(groups.get(left) ?? []), m.name]);
    }
    const ended = war.state === "warEnded";
    if (!groups.size) return ended ? "✅ **Every attack was used.**" : "✅ **Everyone has attacked.**";
    const total = [...groups].reduce((n, [left, names]) => n + left * names.length, 0);
    const head = ended ? `❌ **${total} missed hit${total === 1 ? "" : "s"}**` : `⏳ **${total} hit${total === 1 ? "" : "s"} still in hand**`;
    const lines = [...groups]
        .sort((x, y) => y[0] - x[0])
        .map(([left, names]) => `**${war.attacksPerMember - left}/${war.attacksPerMember}** ${nameList(names)}`);
    return [head, ...lines].join("\n");
}

function topHitters(war: WarDetail) {
    const best = war.clan.members
        .filter((m) => m.attacks)
        .sort((x, y) => y.newStars - x.newStars || y.destruction - x.destruction)
        .slice(0, 3);
    if (!best.length) return null;
    return `🏅 **Top hitters** ${best.map((m) => `${player(m.name)} ${m.newStars}★`).join(" · ")}`;
}

function latestHits(war: WarDetail) {
    if (war.state !== "inWar" || !war.attacks.length) return null;
    const names = new Map([...war.clan.members, ...war.opponent.members].map((m) => [m.tag, m.name]));
    const lines = war.attacks
        .slice(-3)
        .reverse()
        .map((a) => {
            const who = `${a.attackerPos}. ${player(names.get(a.attackerTag) ?? "?", 14)} → ${a.defenderPos}. ${player(names.get(a.defenderTag) ?? "?", 14)}`;
            const side = a.side === "clan" ? "🟢" : "🔵";
            return `${side} ${who} ${stars(a.stars)} ${a.destruction}%`;
        });
    return ["🔥 **Latest hits**", ...lines].join("\n");
}

function headline(war: WarDetail) {
    if (war.state === "inWar") return `⚔️ **Battle day** · ends ${time(unix(war.endTime), TimestampStyles.RelativeTime)}`;
    if (war.state === "preparation" && war.startTime)
        return `🛡️ **Preparation** · battle starts ${time(unix(war.startTime), TimestampStyles.RelativeTime)}`;
    return `${RESULT[war.result ?? ""] ?? "🏁 **War ended**"} · ${time(unix(war.endTime), TimestampStyles.LongDate)}`;
}

/** The link card for a clan's war log, or one of its wars when `warId` is set. */
export async function buildWarCard(tag: string, warId?: number): Promise<MetaCard> {
    tag = normalizeTag(tag);
    const [war, history] = await Promise.all([warId ? getWarDetail(tag, warId) : getLatestWarDetail(tag), listClanWars(tag, { limit: 20 })]);
    const site = config.JPA_APP_URL.replace(/\/$/, "");
    const url = `${site}/wars/log/${slug(tag)}${war && warId ? `?war=${war.id}` : ""}`;
    // A score-only war has no lineup, so our own name and badge come from the latest war.
    const latest = war && !war.clan.name ? await getLatestWarDetail(tag) : war;
    const clanName = war?.clan.name ?? latest?.clan.name ?? null;
    const badge = bigBadge(war?.clan.badge ?? latest?.clan.badge ?? null);

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Open war log").setEmoji({ name: "📜" }).setURL(url),
        new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Clan in game")
            .setEmoji({ name: "🎮" })
            .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`),
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("All wars").setEmoji({ name: "⚔️" }).setURL(`${site}/wars`),
    );
    const footer = new TextDisplayBuilder().setContent(`-# Updated ${time(new Date(), TimestampStyles.RelativeTime)}`);

    if (!war) {
        const title = `${clanName ?? tag} War Log`;
        const component = new ContainerBuilder()
            .setAccentColor(ACCENT.tie)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# JPA WAR LOG\n## [${escapeMarkdown(title)}](${url})\nNo wars recorded yet.`),
            )
            .addActionRowComponents(buttons)
            .addTextDisplayComponents(footer)
            .toJSON();
        return { title, description: "No wars recorded yet.", image: badge, imageAlt: `${clanName ?? tag} badge`, url, component };
    }

    const us = clanName ?? tag;
    const them = war.opponent.name ?? "Unknown clan";
    const live = war.state === "inWar" || war.state === "preparation";

    // FWA marks who should win each matchup; only the live war's call is published.
    let fwa = "";
    if (live && !warId) {
        const points = await getFwaPoints(tag).catch(() => null);
        const m = points?.matchup;
        if (m?.winner && normalizeTag(m.opponent.tag) === normalizeTag(war.opponent.tag ?? "")) fwa = m.winner === "clan" ? "Win" : "Lose";
    }

    const intro = [
        `-# JPA WAR LOG · ${war.teamSize} VS ${war.teamSize}${war.battleModifier === "hardMode" ? " · HARD MODE" : ""}${fwa ? ` · FWA CALL: ${fwa.toUpperCase()}` : ""}`,
        `## [${escapeMarkdown(us)} vs ${escapeMarkdown(them)}](${url})`,
        headline(war),
        `### ⭐ ${war.clan.stars} vs ${war.opponent.stars} ⭐`,
    ].join("\n");

    const header = badge
        ? new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(intro))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(badge).setDescription(`${us} badge`))
        : null;

    const blocks = [
        statTable(war, us),
        war.hasDetail ? `-# 🟢 ${spread(war, "clan")}\n-# 🔵 ${spread(war, "opponent")}` : "-# Only the final score of this war is known.",
        attackers(war),
        latestHits(war) ?? topHitters(war),
    ].filter((b): b is string => !!b);

    const done = history.wars.filter((w) => w.result);
    if (done.length) {
        const count = (r: string) => done.filter((w) => w.result === r).length;
        const strip = done
            .slice(0, 10)
            .map((w) => (w.result === "win" ? "🟩" : w.result === "lose" ? "🟥" : "⬜"))
            .join("");
        const draws = count("tie");
        blocks.push(`-# Form, newest first ${strip} · ${count("win")}W ${count("lose")}L${draws ? ` ${draws}D` : ""} in ${done.length}`);
    }

    const container = new ContainerBuilder().setAccentColor(
        live ? ACCENT[war.state as "inWar" | "preparation"] : (ACCENT[war.result as "win" | "lose" | "tie"] ?? ACCENT.tie),
    );
    if (header) container.addSectionComponents(header);
    else container.addTextDisplayComponents(new TextDisplayBuilder().setContent(intro));
    container
        .addTextDisplayComponents(blocks.map((b) => new TextDisplayBuilder().setContent(b)))
        .addActionRowComponents(buttons)
        .addTextDisplayComponents(footer);

    const left = war.teamSize * war.attacksPerMember - war.clan.attacks;
    const state =
        war.state === "inWar"
            ? `Battle day, ${left} hits left`
            : war.state === "preparation"
              ? "Preparation day"
              : ({ win: "Victory", lose: "Defeat", tie: "Draw" }[war.result ?? ""] ?? "War ended");
    return {
        title: `${us} vs ${them} · War Log`,
        description: `${state} · ${war.clan.stars} vs ${war.opponent.stars} stars · ${pct(war.clan.destruction)} vs ${pct(war.opponent.destruction)} destruction`,
        image: badge,
        imageAlt: `${us} badge`,
        url,
        component: container.toJSON(),
    };
}
