<script lang="ts">
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import type { ICellRendererParams } from "ag-grid-community";

    let { params }: { params: ICellRendererParams } = $props();
    let app = $derived(params.data);
</script>

{#if app}
    <div class="flex h-full w-full items-center gap-2 px-1">
        <Avatar src={app.image || null} name={app.discordUsername || "Unknown"} size="sm" />
        <div class="flex min-w-0 flex-col justify-center">
            <span class="truncate text-sm text-stone-200">{app.discordUsername}</span>
            <span class="truncate font-mono text-xs text-stone-400">{app.discordUserId}</span>
        </div>
    </div>
{/if}
