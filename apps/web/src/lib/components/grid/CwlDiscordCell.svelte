<script lang="ts">
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import type { Role } from "$lib/config/roles";

    let { app }: { app: { image?: string | null; discordUsername: string; discordUserId: string; ownerRole?: string | null } } = $props();
</script>

<div class="flex min-w-0 items-center gap-2">
    <Avatar src={app.image || null} name={app.discordUsername || "Unknown"} role={(app.ownerRole as Role) || "unverified"} size="sm" />
    <div class="flex min-w-0 flex-col justify-center">
        <span class="truncate text-sm text-stone-200">{app.discordUsername}</span>
        <span class="truncate font-mono text-xs text-stone-400">{app.discordUserId}</span>
    </div>
</div>
