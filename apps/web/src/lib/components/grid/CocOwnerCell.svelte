<script lang="ts">
    import Avatar from "#lib/components/ui/Avatar.svelte";
    import type { Role } from "#lib/config/roles.js";

    let {
        account,
    }: { account: { ownerName?: string | null; ownerImage?: string | null; ownerRole?: string | null; discordUserId?: string | null } } = $props();
</script>

<div class="flex min-w-0 items-center gap-3">
    <Avatar src={account.ownerImage || null} name={account.ownerName || "Unknown"} role={(account.ownerRole as Role) || "unverified"} size="sm" />
    <div class="flex min-w-0 flex-col justify-center">
        <span class="truncate text-sm font-medium text-stone-200">{account.ownerName || "Unknown"}</span>
        {#if account.discordUserId}
            <span class="truncate font-mono text-xs text-stone-400">{account.discordUserId}</span>
        {/if}
    </div>
</div>
