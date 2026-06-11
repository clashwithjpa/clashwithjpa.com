<script lang="ts">
    import RawPopup from "$lib/components/ui/RawPopup.svelte";
    import type { ICellRendererParams } from "ag-grid-community";
    import TablerArrowRight from "~icons/tabler/arrow-right";
    import TablerStar from "~icons/tabler/star";

    type Detail = {
        round: number;
        stars: number;
        destruction: number;
        position: number;
        defenderName: string;
        defenderTh: number;
        defenderPosition: number;
    };

    let { params }: { params: ICellRendererParams } = $props();

    let stars = $derived<number | null>(params.data?.cwlStars ?? null);
    let attacks = $derived<number>(params.data?.cwlAttacks ?? 0);
    let details = $derived<Detail[]>(params.data?.cwlDetails ?? []);
</script>

{#if stars === null}
    <span class="text-stone-600">—</span>
{:else if details.length === 0}
    <span class="flex items-center gap-1 text-sm font-medium text-stone-300">
        <TablerStar class="size-3.5 text-amber-400" />
        {stars}
    </span>
{:else}
    <RawPopup contentClass="p-0" maxWidth="max-w-xs">
        {#snippet trigger()}
            <span class="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-stone-100 hover:bg-stone-700/40">
                <TablerStar class="size-3.5 text-amber-400" />
                {stars}
            </span>
        {/snippet}
        <div class="flex w-72 flex-col gap-1 p-2">
            <div class="flex items-center gap-1 px-1 pb-1 text-xs font-semibold text-stone-400">
                {attacks}/7 attacks · {stars}
                <TablerStar class="size-3 shrink-0" />
            </div>
            {#each details as d (d.round)}
                <div class="flex items-center justify-between gap-3 rounded-md bg-stone-800/60 px-2 py-1.5 text-xs">
                    <div class="flex min-w-0 flex-col">
                        <span class="flex items-center gap-1 font-medium text-stone-100">
                            R{d.round} · #{d.position}
                            <TablerArrowRight class="size-3 shrink-0 text-stone-400" />
                            #{d.defenderPosition}
                        </span>
                        <span class="truncate text-stone-400">{d.defenderName} · TH{d.defenderTh} · {d.destruction}%</span>
                    </div>
                    <span class="flex shrink-0 items-center gap-0.5 font-semibold text-amber-300">
                        {d.stars}<TablerStar class="size-3" />
                    </span>
                </div>
            {/each}
        </div>
    </RawPopup>
{/if}
