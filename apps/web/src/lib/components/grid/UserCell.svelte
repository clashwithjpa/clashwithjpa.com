<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import type { Role } from "$lib/config/roles";
    import { getDiscordIdByUserId } from "@repo/clashofclans-client";
    import type { ICellRendererParams } from "ag-grid-community";
    import type { UserWithRole } from "better-auth/plugins";
    import { onMount } from "svelte";

    let { params }: { params: ICellRendererParams } = $props();
    let user: UserWithRole = $derived(params.data);
    let accId: string | null = $state(null);

    onMount(async () => {
        if (user) {
            const { success, data } = await getDiscordIdByUserId(user.id, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            accId = success ? data?.accountId : null;
        }
    });
</script>

<div class="flex h-full w-full items-center gap-3 px-2">
    <Avatar src={user?.image || null} name={user?.name || user?.email || "Unknown"} role={(user?.role as Role) || "unverified"} size="sm" />
    <div class="flex min-w-0 flex-col justify-center">
        <span class="truncate text-sm font-medium text-stone-200">{user?.name || "Unknown"}</span>
        <span class="truncate text-xs text-stone-400">{accId || user.email}</span>
    </div>
</div>
