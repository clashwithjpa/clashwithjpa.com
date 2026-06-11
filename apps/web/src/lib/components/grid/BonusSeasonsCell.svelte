<script lang="ts">
    import type { ICellRendererParams } from "ag-grid-community";
    import TablerCheck from "~icons/tabler/check";

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
    <div class="flex h-full items-center gap-1.5 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden" style="scrollbar-width: none;">
        {#each seasons as s (s.id)}
            {@const checked = awarded.includes(s.id)}
            <button
                type="button"
                onclick={() => params.toggle(params.data, s.id, !checked)}
                class="flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors {checked
                    ? 'border-green-600/50 bg-green-900/30 text-green-200'
                    : 'border-stone-700/50 bg-stone-800/40 text-stone-400 hover:text-stone-200'}"
                title={checked ? `Remove ${s.name} bonus` : `Award ${s.name} bonus`}
            >
                <span
                    class="grid size-3.5 shrink-0 place-items-center rounded-sm border {checked
                        ? 'border-green-500 bg-green-600'
                        : 'border-stone-600'}"
                >
                    {#if checked}<TablerCheck class="size-3 text-white" />{/if}
                </span>
                {s.name}
            </button>
        {/each}
    </div>
{/if}
