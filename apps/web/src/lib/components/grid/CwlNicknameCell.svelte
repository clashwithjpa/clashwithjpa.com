<script lang="ts">
    import type { ICellRendererParams } from "ag-grid-community";

    let { params }: { params: ICellRendererParams & { loading?: boolean } } = $props();
    let value = $derived(params.value as string | undefined);
    let loading = $derived(params.loading ?? false);
</script>

<div class="flex h-full w-full items-center px-1">
    {#if loading && !value}
        <span class="h-3.5 w-20 animate-pulse rounded bg-stone-700/60"></span>
    {:else}
        <span class="truncate">{value ?? "—"}</span>
    {/if}
</div>
