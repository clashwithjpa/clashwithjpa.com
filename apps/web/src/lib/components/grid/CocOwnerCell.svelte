<script lang="ts">
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import type { Role } from "$lib/config/roles";
    import type { ICellRendererParams } from "ag-grid-community";

    let { params }: { params: ICellRendererParams } = $props();
    let account = $derived(params.data || null);
</script>

{#if account}
    <div class="flex h-full w-full items-center gap-3 px-2">
        <Avatar src={account.ownerImage || null} name={account.ownerName || "Unknown"} role={(account.ownerRole as Role) || "unverified"} size="sm" />
        <div class="flex min-w-0 flex-col justify-center">
            <span class="truncate text-sm font-medium text-stone-200">{account.ownerName || "Unknown"}</span>
            {#if account.discordUserId}
                <span class="truncate font-mono text-xs text-stone-400">{account.discordUserId}</span>
            {/if}
        </div>
    </div>
{/if}
