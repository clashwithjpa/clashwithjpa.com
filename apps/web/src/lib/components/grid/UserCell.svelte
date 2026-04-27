<script lang="ts">
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import type { Role } from "$lib/config/roles";
    import type { ICellRendererParams } from "ag-grid-community";
    import type { UserWithRole } from "better-auth/plugins";

    let { params }: { params: ICellRendererParams } = $props();
    let user: UserWithRole & { discordId: string } = $derived(params.data);
</script>

<div class="flex h-full w-full items-center gap-3 px-2">
    <Avatar src={user?.image || null} name={user?.name || user?.email || "Unknown"} role={(user?.role as Role) || "unverified"} size="sm" />
    <div class="flex min-w-0 flex-col justify-center">
        <span class="truncate text-sm font-medium text-stone-200">{user?.name || "Unknown"}</span>
        <span class="truncate text-xs text-stone-400">{user.discordId || user.email}</span>
    </div>
</div>
