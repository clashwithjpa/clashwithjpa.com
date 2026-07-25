<script lang="ts">
    import Chart from "$lib/components/ui/Chart.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import type { AgCartesianChartOptions } from "ag-charts-community";

    export type FamilyClan = {
        name: string;
        warWins: number;
        members: number;
        points: number;
        level: number;
    };

    let {
        clans = [],
        thDistribution = {},
        loading = false,
    }: {
        clans?: FamilyClan[];
        thDistribution?: Record<number, number>;
        loading?: boolean;
    } = $props();

    type Mode = "townhalls" | "roster";
    let mode = $state<Mode>("townhalls");

    const modes: { id: Mode; label: string; icon: string; gradient: [string, string, string]; hint: string }[] = [
        {
            id: "townhalls",
            label: "Town Halls",
            icon: "th/16",
            gradient: ["#ffdc9f", "#ffa92b", "#a94908"],
            hint: "Roster strength across every JPA clan",
        },
        {
            id: "roster",
            label: "Roster Fill",
            icon: "trophy",
            gradient: ["#d3ebb7", "#85c03f", "#366c1b"],
            hint: "Seats filled out of 50 per clan",
        },
    ];
    const activeMode = $derived(modes.find((m) => m.id === mode)!);

    const shorten = (name: string) => (name.length > 12 ? name.slice(0, 11) + "…" : name);

    function barFill([light, mid, dark]: [string, string, string]) {
        return {
            type: "gradient" as const,
            rotation: 180,
            colorStops: [
                { color: light, stop: 0 },
                { color: mid, stop: 0.5 },
                { color: dark, stop: 1 },
            ],
        };
    }

    function tooltip(unit: string) {
        return {
            renderer: ({ datum, xKey, yKey }: { datum: Record<string, unknown>; xKey: string; yKey: string }) => ({
                title: String(datum[xKey]),
                content: `${datum[yKey]} ${unit}`,
            }),
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function barLabel(suffix = ""): any {
        return {
            enabled: true,
            placement: "outside-end",
            color: "#2a1810",
            fontFamily: "COC, sans-serif",
            fontWeight: 700,
            formatter: ({ value }: { value: number }) => `${value}${suffix}`,
        };
    }

    function axisTitle(text: string) {
        return { enabled: true, text, color: "#2a1810", fontFamily: "COC, sans-serif" };
    }

    const axisLabel = { color: "#5a3d2b", fontFamily: "COC, sans-serif" };

    const chartOptions = $derived.by<AgCartesianChartOptions>(() => {
        if (mode === "townhalls") {
            const data = Object.entries(thDistribution)
                .map(([th, count]) => ({ th: `TH${th}`, thLevel: Number(th), count }))
                .sort((a, b) => a.thLevel - b.thLevel);
            return {
                data,
                series: [
                    {
                        type: "bar",
                        xKey: "th",
                        yKey: "count",
                        yName: "Players",
                        fill: barFill(activeMode.gradient),
                        cornerRadius: 4,
                        tooltip: tooltip("players"),
                        label: barLabel(),
                    },
                ],
                axes: {
                    x: { type: "category", title: axisTitle("Town Hall level"), label: axisLabel },
                    y: { type: "number", nice: true, title: axisTitle("Players"), label: axisLabel },
                },
            };
        }

        const data = clans.map((c) => ({ clan: shorten(c.name), members: c.members })).sort((a, b) => b.members - a.members);
        return {
            padding: { top: 32 },
            data,
            series: [
                {
                    type: "bar",
                    xKey: "clan",
                    yKey: "members",
                    yName: "Members",
                    fill: barFill(activeMode.gradient),
                    cornerRadius: 4,
                    tooltip: tooltip("of 50 seats"),
                    label: barLabel("/50"),
                },
            ],
            axes: {
                x: { type: "category", title: axisTitle("Clan"), label: axisLabel },
                y: { type: "number", min: 0, max: 50, title: axisTitle("Members"), label: axisLabel },
            },
        };
    });
</script>

<CocCard variant="dark" contentClass="p-4 md:p-6">
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h3 class="font-coc text-xl font-black text-stone-900 md:text-2xl">The War Room</h3>
            <p class="font-coc text-xs text-stone-700 md:text-sm">{activeMode.hint}</p>
        </div>
        <div class="flex justify-center gap-1 rounded-xl border border-black/10 bg-stone-900/10 p-1 inset-shadow-sm shadow-stone-900">
            {#each modes as m}
                <button
                    type="button"
                    onclick={() => (mode = m.id)}
                    class="cursor-pointer rounded-lg px-3 py-1.5 font-coc text-xs font-bold transition-all duration-200 md:text-sm {mode === m.id
                        ? 'bg-linear-to-b from-[#ffcd6a] to-[#e68e2e] text-stone-900 shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
                        : 'text-stone-700 hover:text-stone-900'}"
                >
                    {m.label}
                </button>
            {/each}
        </div>
    </div>

    <div class="relative h-80 w-full md:h-95">
        {#if loading}
            <div class="absolute inset-0 grid place-items-center">
                <div class="flex flex-col items-center gap-3">
                    <div class="size-10 animate-spin rounded-full border-4 border-[#e68e2e]/30 border-t-[#e68e2e]"></div>
                    <p class="font-coc text-sm text-stone-700">Mustering the family…</p>
                </div>
            </div>
        {:else}
            <Chart options={chartOptions} class="size-full" />
        {/if}
    </div>
</CocCard>
