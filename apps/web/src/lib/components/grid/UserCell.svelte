<script lang="ts">
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import type { Role } from "$lib/config/roles";

    let { user }: { user: { name?: string | null; image?: string | null; role?: string | null; discordId?: string | null } } = $props();
</script>

<div class="flex min-w-0 items-center gap-3">
    <Avatar src={user.image || null} name={user.name || "Unknown"} role={(user.role as Role) || "unverified"} size="sm" />
    <div class="flex min-w-0 flex-col justify-center">
        <span class="truncate text-sm font-medium text-stone-200">{user.name || "Unknown"}</span>
        {#if user.discordId}
            <span class="truncate font-mono text-xs text-stone-400">{user.discordId}</span>
        {/if}
    </div>
</div>
