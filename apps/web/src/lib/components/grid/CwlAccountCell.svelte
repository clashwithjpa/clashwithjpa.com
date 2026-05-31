<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import type { ICellRendererParams } from "ag-grid-community";
    import TablerExternalLink from "~icons/tabler/external-link";

    let { params }: { params: ICellRendererParams } = $props();
    let app = $derived(params.data);
</script>

{#if app}
    <div class="flex h-full w-full items-center gap-2 px-1">
        <div class="flex min-w-0 flex-col justify-center">
            <span class="truncate text-sm font-medium text-stone-100">{app.cocAccountName}</span>
            <span class="truncate font-mono text-xs text-stone-400">{app.cocAccountTag}</span>
        </div>
        {#if app.isExternal}
            <Badge variant="red" content="External" icon={TablerExternalLink} />
        {/if}
    </div>
{/if}
