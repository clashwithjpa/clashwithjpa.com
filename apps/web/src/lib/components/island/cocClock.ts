// Recurring Clash of Clans events, all on fixed UTC schedules, so no API call is
// needed. NOTE: Supercell does shift these occasionally. Checked against
// clash.ninja's event timers in October 2026.

export type ClockEvent = { name: string; active: boolean; at: Date };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Monthly window from `startDay` to `endDay` (exclusive end) at `hour` UTC.
function monthly(now: Date, startDay: number, endDay: number, hour: number) {
    const at = (monthOffset: number, day: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, day, hour));
    const start = at(0, startDay);
    const end = at(0, endDay);
    if (now < start) return { active: false, at: start };
    if (now < end) return { active: true, at: end };
    return { active: false, at: at(1, startDay) };
}

// Weekly window starting on `startDow` (0 = Sunday) at `hour` UTC, lasting `lengthMs`.
function weekly(now: Date, startDow: number, hour: number, lengthMs: number) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour));
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() - startDow + 7) % 7));
    if (now.getTime() - start.getTime() < lengthMs && now >= start) return { active: true, at: new Date(start.getTime() + lengthMs) };
    if (start <= now) start.setUTCDate(start.getUTCDate() + 7);
    return { active: false, at: start };
}

// League resets every 28 days at 05:00 UTC, counted from 3 Nov 2025.
function leagueReset(now: Date) {
    const anchor = Date.UTC(2025, 10, 3, 5);
    const period = 28 * DAY;
    const next = anchor + Math.ceil((now.getTime() - anchor) / period) * period;
    return { active: false, at: new Date(next) };
}

export function clockEvents(now = new Date()): ClockEvent[] {
    return [
        { name: "Raid Weekend", ...weekly(now, 5, 7, 3 * DAY) },
        { name: "Clan Games", ...monthly(now, 22, 28, 8) },
        { name: "CWL signup", ...monthly(now, 1, 3, 8) },
        { name: "Trader refresh", ...weekly(now, 2, 8, 0) },
        { name: "Season end", ...monthly(now, 1, 1, 8) },
        { name: "League reset", ...leagueReset(now) },
    ].sort((a, b) => Number(b.active) - Number(a.active) || a.at.getTime() - b.at.getTime());
}

export function countdown(to: Date, now = new Date()) {
    const ms = Math.max(to.getTime() - now.getTime(), 0);
    const d = Math.floor(ms / DAY);
    const h = Math.floor((ms % DAY) / HOUR);
    const m = Math.floor((ms % HOUR) / 60_000);
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    return `${m}m`;
}
