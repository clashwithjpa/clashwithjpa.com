<script lang="ts">
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import CocTabs from "$lib/components/ui/coc/CocTabs.svelte";
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

    const modes: { id: Mode; label: string; gradient: [string, string, string]; hint: string }[] = [
        {
            id: "townhalls",
            label: "Town Halls",
            gradient: ["#ffdc9f", "#ffa92b", "#a94908"],
            hint: "Roster strength across every JPA clan",
        },
        {
            id: "roster",
            label: "Roster Fill",
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
    // LayerChart haloes text in the surface colour by default, which smears the outlined font.
    const axisText = "fill-parchment/70 stroke-transparent font-coc text-xs";
</script>

<CocCard variant="panel" contentClass="p-4 md:p-6">
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h3 class="font-coc text-xl font-black text-white text-outline md:text-2xl">The War Room</h3>
            <p class="font-coc text-xs text-parchment/70 md:text-sm">{activeMode.hint}</p>
        </div>
        <CocTabs label="Chart" options={modes.map((m) => ({ key: m.id, label: m.label }))} bind:value={mode} />
    </div>

    <div class="relative h-80 w-full md:h-95">
        {#if loading}
            <div class="absolute inset-0 grid place-items-center">
                <div class="flex flex-col items-center gap-3">
                    <div class="size-10 animate-spin rounded-full border-4 border-[#e68e2e]/30 border-t-[#e68e2e]"></div>
                    <p class="font-coc text-sm text-parchment/70">Mustering the family…</p>
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
                    class: "fill-white stroke-transparent font-coc text-sm font-bold",
                }}
                props={{
                    xAxis: { tickLabelProps: { class: axisText } },
                    yAxis: { tickLabelProps: { class: axisText } },
                    tooltip: { item: { format: (v: number) => (isRoster ? `${v} of 50 seats` : `${v} players`) } },
                }}
                style="--color-surface-content: rgba(246, 223, 186, 0.25)"
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
