import { config } from "@/lib/config";
import { Redis } from "ioredis";
import { parse, type HTMLElement } from "node-html-parser";
import z4 from "zod/v4";

const redis = new Redis(config.JPA_REDIS_URL);

const SOURCE = "https://points.fwafarm.com";
const TTL_SECONDS = 300;
const HISTORY_LIMIT = 15;
const NOT_FOUND = "\0none"; // cached "not in the FWA database" vs cache miss

const ClanRefSchema = z4.object({ name: z4.string(), tag: z4.string() });

export const FwaPointsSchema = z4.object({
    clan: ClanRefSchema,
    balance: z4.number().nullable(),
    activeFwa: z4.boolean().nullable(),
    matchup: z4
        .object({
            warId: z4.number().nullable(),
            sync: z4.number().nullable(),
            opponent: ClanRefSchema,
            winner: z4.enum(["clan", "opponent"]).nullable(),
            reason: z4.string().nullable(),
            // FWA's own message when there's no "should win" verdict, e.g. "Not marked as an FWA match."
            notice: z4.string().nullable(),
        })
        .nullable(),
    warState: z4.string().nullable(),
    // Star breakdown per side as [3★, 2★, 1★, 0★] attack counts, in the order the source lists them.
    stars: z4.array(z4.object({ name: z4.string(), counts: z4.array(z4.number()) })),
    history: z4.array(
        z4.object({
            at: z4.string(),
            sync: z4.number().nullable(),
            result: z4.enum(["win", "lose"]).nullable(),
            points: z4.number(),
            note: z4.string().nullable(),
        }),
    ),
    sourceUrl: z4.string(),
});
export type FwaPoints = z4.infer<typeof FwaPointsSchema>;

export class FwaPointsUnavailableError extends Error {
    constructor(message = "Could not read the FWA points database") {
        super(message);
        this.name = "FwaPointsUnavailableError";
    }
}

export const fwaPointsUrl = (tag: string) => `${SOURCE}/clan?tag=${encodeURIComponent(tag.replace(/^#/, "").toUpperCase())}`;

const num = (s: string | undefined) => {
    const n = Number.parseFloat(s ?? "");
    return Number.isFinite(n) ? n : null;
};

// Fields are written as `<b>Label</b>: value<br>`, so the value is the text right after the label.
function field(scope: HTMLElement, label: string) {
    const b = scope.querySelectorAll("b").find((el) => el.text.trim() === label);
    const value = b?.nextSibling?.text.replace(/^\s*:\s*/, "").trim();
    return value || null;
}

function lines(el: HTMLElement) {
    return el.innerHTML
        .split(/<br\s*\/?>/i)
        .map((html) => parse(html).text.trim())
        .filter(Boolean);
}

/**
 * Reads a points.fwafarm.com clan page. Returns null for "Clan not found." and throws
 * FwaPointsUnavailableError when the page no longer looks the way this parser expects.
 */
export function parseFwaPoints(html: string, tag: string): FwaPoints | null {
    const root = parse(html);
    if (root.text.trim() === "Clan not found.") return null;

    const heading = root.querySelectorAll("h3").find((h) => h.text.trim() === "Viewing Clan");
    const info = heading?.nextElementSibling;
    const name = info ? field(info, "Clan Name") : null;
    if (!info || !name) throw new FwaPointsUnavailableError("Unexpected FWA points page layout");

    const clanTag = `#${tag.replace(/^#/, "").toUpperCase()}`;
    const active = field(info, "Active FWA");

    let matchup: FwaPoints["matchup"] = null;
    const box = root.querySelector("p.winner-box");
    if (box) {
        const [title = "", sides = "", verdict = ""] = lines(box);
        const pair = sides.match(/^(.+) \(([0-9A-Z]+)\) vs\. (.+) \(([0-9A-Z]+)\):?$/);
        if (pair) {
            const [, aName, aTag, bName, bTag] = pair as unknown as [string, string, string, string, string];
            const weAreA = `#${aTag}` === clanTag;
            const opponent = weAreA ? { name: bName, tag: `#${bTag}` } : { name: aName, tag: `#${aTag}` };
            const winnerName = box.querySelector("b")?.text.trim();
            // Mirror clans can share a name, in which case the winner can't be told apart by it.
            const winner =
                !winnerName || name === opponent.name ? null : winnerName === name ? "clan" : winnerName === opponent.name ? "opponent" : null;
            matchup = {
                warId: num(box.querySelector('a[href*="war?id="]')?.getAttribute("href")?.split("id=")[1]),
                sync: num(title.match(/Sync #(\d+)/)?.[1]),
                opponent,
                winner,
                reason: verdict.match(/should win by (.+)$/)?.[1] ?? null,
                notice: /should win by/.test(verdict) ? null : verdict || null,
            };
        }
    }

    const current = root.querySelector("div.current-box");
    const stars: FwaPoints["stars"] = [];
    if (current) {
        const names =
            current
                .querySelector("table tr")
                ?.querySelectorAll("td")
                .map((td) => td.text.trim()) ?? [];
        current.querySelectorAll("table table").forEach((t, i) => {
            const counts = t.querySelectorAll("tr").map((tr) => num(tr.querySelectorAll("td")[1]?.text) ?? 0);
            if (names[i]) stars.push({ name: names[i], counts });
        });
    }

    const historyTable = root.querySelectorAll("table").find((t) => t.querySelector("thead")?.text.includes("Timestamp"));
    const history: FwaPoints["history"] = (historyTable?.querySelectorAll("tbody tr") ?? []).slice(0, HISTORY_LIMIT).flatMap((tr) => {
        const [at, war, points, note] = tr.querySelectorAll("td").map((td) => td.text.trim());
        const value = num(points);
        if (!at || value === null) return [];
        const result = war?.match(/\((win|lose)\)/)?.[1] as "win" | "lose" | undefined;
        return [{ at, sync: num(war?.match(/Sync #(\d+)/)?.[1]), result: result ?? null, points: value, note: note || null }];
    });

    return {
        clan: { name, tag: clanTag },
        balance: num(field(info, "Point Balance") ?? undefined),
        activeFwa: active === null ? null : active.toLowerCase() === "yes",
        matchup,
        warState: current ? field(current, "Last Known War State") : null,
        stars,
        history,
        sourceUrl: fwaPointsUrl(tag),
    };
}

export async function getFwaPoints(tag: string): Promise<FwaPoints | null> {
    const key = `fwa-points:v2:${tag.replace(/^#/, "").toUpperCase()}`;
    try {
        const cached = await redis.get(key);
        if (cached) return cached === NOT_FOUND ? null : (JSON.parse(cached) as FwaPoints);
    } catch (error) {
        console.error("Failed to read FWA points from Redis:", error);
    }

    let html: string;
    try {
        const res = await fetch(fwaPointsUrl(tag), {
            headers: { "User-Agent": "clashwithjpa.com (+https://clashwithjpa.com)" },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new FwaPointsUnavailableError(`FWA points responded with ${res.status}`);
        html = await res.text();
    } catch (error) {
        if (error instanceof FwaPointsUnavailableError) throw error;
        throw new FwaPointsUnavailableError();
    }

    const points = parseFwaPoints(html, tag);
    try {
        await redis.setex(key, TTL_SECONDS, points ? JSON.stringify(points) : NOT_FOUND);
    } catch (error) {
        console.error("Failed to write FWA points to Redis:", error);
    }
    return points;
}
