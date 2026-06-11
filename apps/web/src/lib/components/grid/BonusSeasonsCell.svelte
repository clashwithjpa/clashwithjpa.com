<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import type { ICellRendererParams } from "ag-grid-community";

    type Season = { id: number; name: string };
    type Params = ICellRendererParams & {
        seasons: Season[];
        toggle: (data: any, seasonId: number, selected: boolean) => void;
    };

    let { params }: { params: Params } = $props();

    let seasons = $derived(params.seasons ?? []);
    let awarded = $derived<number[]>(params.data?.bonusSeasonIds ?? []);
</script>

{#if seasons.length === 0}
    <span class="px-1 text-xs text-stone-500">—</span>
{:else}
    <div class="edge-fade flex h-full items-center gap-1.5 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden" style="scrollbar-width: none;">
        {#each seasons as s (s.id)}
            {@const checked = awarded.includes(s.id)}
            <Badge variant="checkbox" size="button" {checked} content={s.name} onclick={() => params.toggle(params.data, s.id, !checked)} />
        {/each}
    </div>
{/if}
