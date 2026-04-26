<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import Sidebar from "$lib/components/ui/Sidebar.svelte";
    import UserManagementSidebar from "$lib/components/UserManagementSidebar.svelte";
    import { sidebarStore } from "$lib/stores/sidebar.svelte";
    import type { ICellRendererParams } from "ag-grid-community";
    import type { UserWithRole } from "better-auth/plugins";
    import TablerBan from "~icons/tabler/ban";
    import TablerCheck from "~icons/tabler/check";
    import TablerTrash from "~icons/tabler/trash";
    import TablerUser from "~icons/tabler/user";

    let { params }: { params: ICellRendererParams } = $props();

    let user: UserWithRole = $derived(params.data);
    let isCurrentUser = $derived(user.id === params.context?.currentUserId);

    async function handleRemove() {
        if (params.context?.removeUser && !isCurrentUser) {
            await params.context.removeUser(user.id);
        }
    }

    async function handleBanToggle() {
        if (params.context?.toggleBanUser && !isCurrentUser) {
            await params.context.toggleBanUser(user.id, user.banned);
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex size-full items-center justify-center gap-2 p-1.5" onmousedown={(e) => e.stopPropagation()}>
    <Button
        size="icon"
        variant="base"
        class="size-8"
        tooltipPlacement="bottom"
        tooltip="View User"
        onclick={() => {
            sidebarStore.toggle();
        }}
    >
        <TablerUser class="size-4" />
    </Button>
    <Button
        size="icon"
        variant={user.banned ? "success" : "danger"}
        class="size-8"
        tooltipPlacement="bottom"
        tooltip={user.banned ? "Unban User" : "Ban User"}
        onclick={handleBanToggle}
        disabled={params.context?.isProcessing === user.id || isCurrentUser}
    >
        {#if user.banned}
            <TablerCheck class="size-4" />
        {:else}
            <TablerBan class="size-4" />
        {/if}
    </Button>
    <Button
        size="icon"
        variant="danger"
        class="size-8"
        tooltipPlacement="bottom"
        tooltip="Remove User"
        onclick={handleRemove}
        disabled={params.context?.isProcessing === user.id || isCurrentUser}
    >
        <TablerTrash class="size-4" />
    </Button>
</div>

<Sidebar>
    <UserManagementSidebar
        {user}
        onBanToggle={handleBanToggle}
        onRemove={handleRemove}
        {isCurrentUser}
        isProcessing={params.context?.isProcessing === user.id}
    />
</Sidebar>
