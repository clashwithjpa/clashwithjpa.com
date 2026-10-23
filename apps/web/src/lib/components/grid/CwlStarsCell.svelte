<script lang="ts">
    import RawPopup from "$lib/components/ui/RawPopup.svelte";
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

    let {
        stars = null,
        attacks = 0,
        details = [],
        loading = false,
        stealRounds = [],
    }: { stars?: number | null; attacks?: number; details?: Detail[]; loading?: boolean; stealRounds?: number[] } = $props();
</script>

{#if stars === null && loading}
    <span class="block h-3.5 w-10 skeleton"></span>
{:else if stars === null}
    <span class="px-2 py-1 text-stone-600">—</span>
{:else if details.length === 0}
    <!-- Same box as the popup trigger below so every row lines up. -->
    <span class="flex items-center gap-1 px-2 py-1 text-sm font-medium text-stone-300">
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
                            {#if stealRounds.includes(d.round)}
                                <span class="ml-1 rounded border border-orange-700/50 bg-orange-900 px-1 text-[10px] text-orange-200">star steal</span
                                >
                            {/if}
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
