<script lang="ts">
    import { formatDateTime, SIDE_COLOR, type Side, type WarDetail } from "./warLog";

    let { war, now }: { war: WarDetail; now: number } = $props();

    const H = 132;
    const PAD = { l: 8, r: 44, t: 12, b: 22 };
    let width = $state(0);
    let hoverT = $state<number | null>(null);

    // Hits made before the tracker first saw this war have no time, so they count from that moment.
    const chart = $derived.by(() => {
        if (!war.startTime || !war.attacks.some((a) => a.seenAt)) return null;
        const start = Date.parse(war.startTime);
        const end = Date.parse(war.endTime);
        const from = war.trackedSince ? Math.min(end, Math.max(start, Date.parse(war.trackedSince))) : start;
        const lastSeen = Math.max(...war.attacks.map((a) => (a.seenAt ? Date.parse(a.seenAt) : 0)));
        const to = war.state === "warEnded" ? Math.max(lastSeen, Math.min(end, now)) : Math.min(end, Math.max(now, from));

        const build = (side: Side) => {
            let total = 0;
            const timed: [number, number][] = [];
            for (const a of war.attacks) {
                if (a.side !== side) continue;
                if (a.seenAt) timed.push([Date.parse(a.seenAt), a.newStars]);
                else total += a.newStars;
            }
            timed.sort((a, b) => a[0] - b[0]);
            const points: [number, number][] = [[from, total]];
            for (const [t, n] of timed) points.push([t, (total += n)]);
            return { side, points, total };
        };
        const series = [build("clan"), build("opponent")];
        const yMax = Math.max(3, ...series.map((s) => s.total)) * 1.12;
        return { start, end, from, to, series, yMax };
    });

    const plotW = $derived(Math.max(0, width - PAD.l - PAD.r));
    const plotH = H - PAD.t - PAD.b;
    const x = (t: number) => (chart ? PAD.l + ((t - chart.start) / (chart.end - chart.start)) * plotW : 0);
    const y = (v: number) => (chart ? PAD.t + plotH - (v / chart.yMax) * plotH : 0);

    const valueAt = (points: [number, number][], t: number) => {
        let v = points[0][1];
        for (const [pt, pv] of points) {
            if (pt > t) break;
            v = pv;
        }
        return v;
    };

    const path = (points: [number, number][], to: number) =>
        points.reduce((d, [t, v], i) => (i === 0 ? `M${x(t)},${y(v)}` : `${d}H${x(t)}V${y(v)}`), "") + `H${x(to)}`;

    const ticks = $derived(chart ? [0, 6, 12, 18, 24].map((h) => ({ h, t: chart.start + h * 3_600_000 })).filter((k) => k.t <= chart.end) : []);

    function onMove(e: PointerEvent) {
        if (!chart) return;
        const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
        const t = chart.start + ((e.clientX - rect.left - PAD.l) / plotW) * (chart.end - chart.start);
        hoverT = t >= chart.from && t <= chart.to ? t : null;
    }

    const names = $derived({ clan: war.clan.name ?? "Us", opponent: war.opponent.name ?? "Them" });
</script>

{#if chart}
    <figure class="flex flex-col gap-2">
        <figcaption class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-coc text-xs text-parchment/70">
            <span class="font-bold tracking-wider uppercase">Star race</span>
            <span class="flex flex-wrap items-center gap-3">
                {#each chart.series as s (s.side)}
                    <span class="flex items-center gap-1.5">
                        <svg width="16" height="6" aria-hidden="true">
                            <line
                                x1="0"
                                y1="3"
                                x2="16"
                                y2="3"
                                stroke={SIDE_COLOR[s.side]}
                                stroke-width="2"
                                stroke-dasharray={s.side === "opponent" ? "4 3" : undefined}
                            />
                        </svg>
                        <span class="max-w-32 truncate">{names[s.side]}</span>
                    </span>
                {/each}
            </span>
        </figcaption>

        <div class="relative rounded-xl coc-slot" bind:clientWidth={width}>
            {#if width}
                <svg
                    {width}
                    height={H}
                    class="block touch-none"
                    role="img"
                    aria-label="Cumulative war stars over battle day: {names.clan} {chart.series[0].total}, {names.opponent} {chart.series[1].total}"
                    onpointermove={onMove}
                    onpointerleave={() => (hoverT = null)}
                >
                    {#each ticks as tick (tick.h)}
                        <line x1={x(tick.t)} x2={x(tick.t)} y1={PAD.t} y2={PAD.t + plotH} stroke="rgba(255,240,210,0.08)" />
                        <text
                            x={x(tick.t)}
                            y={H - 6}
                            text-anchor={tick.h === 0 ? "start" : tick.h === 24 ? "end" : "middle"}
                            class="fill-parchment/50 font-coc text-[10px]">{tick.h}h</text
                        >
                    {/each}
                    <line x1={PAD.l} x2={PAD.l + plotW} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke="rgba(255,240,210,0.2)" />

                    {#each chart.series as s (s.side)}
                        <path
                            d={path(s.points, chart.to)}
                            fill="none"
                            stroke={SIDE_COLOR[s.side]}
                            stroke-width="2"
                            stroke-linejoin="round"
                            stroke-dasharray={s.side === "opponent" ? "6 4" : undefined}
                        />
                        <text
                            x={x(chart.to) + 6}
                            y={y(s.total) + 4}
                            class="fill-white font-coc text-xs font-bold"
                            style="paint-order: stroke; stroke: #000; stroke-width: 3px">{s.total}</text
                        >
                    {/each}

                    {#if hoverT !== null}
                        <line x1={x(hoverT)} x2={x(hoverT)} y1={PAD.t} y2={PAD.t + plotH} stroke="rgba(255,240,210,0.45)" />
                        {#each chart.series as s (s.side)}
                            <circle
                                cx={x(hoverT)}
                                cy={y(valueAt(s.points, hoverT))}
                                r="4"
                                fill={SIDE_COLOR[s.side]}
                                stroke="#2a1609"
                                stroke-width="2"
                            />
                        {/each}
                    {/if}
                </svg>

                {#if hoverT !== null}
                    {@const left = Math.min(Math.max(x(hoverT), 70), width - 70)}
                    <div
                        class="pointer-events-none absolute top-1 z-10 flex -translate-x-1/2 flex-col gap-0.5 rounded-lg border border-black bg-[#1d0f06]/95 px-2.5 py-1.5 font-coc text-xs whitespace-nowrap text-parchment shadow-lg"
                        style="left: {left}px"
                    >
                        <span class="text-parchment/60">{formatDateTime(new Date(hoverT).toISOString())}</span>
                        {#each chart.series as s (s.side)}
                            <span class="flex items-center gap-1.5">
                                <span class="size-2 rounded-full" style="background: {SIDE_COLOR[s.side]}"></span>
                                <span class="max-w-28 truncate">{names[s.side]}</span>
                                <span class="ml-auto pl-2 font-bold text-white tabular-nums">{valueAt(s.points, hoverT)}★</span>
                            </span>
                        {/each}
                    </div>
                {/if}
            {:else}
                <div style="height: {H}px"></div>
            {/if}
        </div>
    </figure>
{/if}
