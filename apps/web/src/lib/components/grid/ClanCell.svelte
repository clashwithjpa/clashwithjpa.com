<script lang="ts">
    import type { ICellRendererParams } from "ag-grid-community";

    // `clanName` is resolved by the grid (clan tag -> name) and merged in via
    // cellRendererParams; the cell value itself holds the clan tag.
    let { params }: { params: ICellRendererParams & { clanName?: string | null } } = $props();
    let tag = $derived((params.value as string | null) ?? null);
    let name = $derived(params.clanName ?? null);
</script>

{#if tag}
    <div class="flex h-full w-full min-w-0 flex-col justify-center px-2">
        <span class="truncate text-sm font-medium text-stone-200">{name ?? "Unknown clan"}</span>
        <span class="truncate font-mono text-xs text-stone-400">{tag}</span>
    </div>
{:else}
    <span class="px-2 text-sm text-stone-400">—</span>
{/if}
