<script lang="ts">
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import { BarChart, Bars, LinearGradient } from "layerchart";

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

    const chartData = $derived(
        mode === "townhalls"
            ? Object.entries(thDistribution)
                  .map(([th, count]) => ({ label: `TH${th}`, level: Number(th), value: count }))
                  .sort((a, b) => a.level - b.level)
            : clans.map((c) => ({ label: shorten(c.name), level: 0, value: c.members })).sort((a, b) => b.value - a.value),
    );
    const isRoster = $derived(mode === "roster");
    // LayerChart haloes text in the (dark) surface color, which smears on the parchment card.
    const axisText = "fill-[#3b2416] stroke-transparent font-coc text-xs";
</script>

<CocCard variant="dark" contentClass="p-4 md:p-6">
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h3 class="font-coc text-xl font-black text-stone-900 md:text-2xl">The War Room</h3>
            <p class="font-coc text-xs text-stone-700 md:text-sm">{activeMode.hint}</p>
        </div>
        <div class="flex justify-center gap-1 rounded-xl border border-black/10 bg-stone-900/10 p-1 inset-shadow-sm shadow-stone-900">
            {#each modes as m (m.id)}
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
            <!-- Clan names need the room, so the roster reads horizontally. -->
            <BarChart
                data={chartData}
                orientation={isRoster ? "horizontal" : "vertical"}
                x={isRoster ? "value" : "label"}
                y={isRoster ? "label" : "value"}
                xDomain={isRoster ? [0, 50] : undefined}
                padding={isRoster ? { top: 8, left: 96, right: 48, bottom: 24 } : { top: 28, left: 36, bottom: 24 }}
                series={[{ key: "value", label: isRoster ? "Members" : "Players" }]}
                labels={{
                    placement: "outside",
                    format: (v: number) => (isRoster ? `${v}/50` : `${v}`),
                    class: "fill-[#2a1810] stroke-transparent font-coc text-sm font-bold",
                }}
                props={{
                    xAxis: { tickLabelProps: { class: axisText } },
                    yAxis: { tickLabelProps: { class: axisText } },
                    tooltip: { item: { format: (v: number) => (isRoster ? `${v} of 50 seats` : `${v} players`) } },
                }}
                style="--color-surface-content: #5a3d2b"
            >
                {#snippet marks()}
                    <!-- Light end of the gradient sits at the bar's tip in both orientations. -->
                    <LinearGradient stops={isRoster ? [...activeMode.gradient].reverse() : activeMode.gradient} vertical={!isRoster}>
                        {#snippet children({ gradient })}
                            <Bars fill={gradient} radius={4} rounded="edge" />
                        {/snippet}
                    </LinearGradient>
                {/snippet}
            </BarChart>
        {/if}
    </div>
</CocCard>
