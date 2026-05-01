<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import UserManagementSidebar from "$lib/components/UserManagementSidebar.svelte";
    import type { ICellRendererParams } from "ag-grid-community";
    import type { UserWithRole } from "better-auth/plugins";
    import TablerBan from "~icons/tabler/ban";
    import TablerCheck from "~icons/tabler/check";
    import TablerTrash from "~icons/tabler/trash";
    import TablerUser from "~icons/tabler/user";
    import { Sidebar } from "../ui/sidebar";

    let { params }: { params: ICellRendererParams } = $props();

    let user: (UserWithRole & { discordId: string }) | null = $derived(params.data || null);
    let isCurrentUser = $derived(user?.id === params.context?.currentUserId);
    let sidebar: Sidebar | null = $state(null);

    function handleOpen() {
        sidebar?.open(user.id);
    }

    async function handleRemove() {
        if (params.context?.removeUser && !isCurrentUser) {
            if (sidebar?.isOpenFor(user.id)) {
                sidebar.close();
            }
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
    {#if user}
        <Sidebar bind:this={sidebar}>
            <UserManagementSidebar
                {user}
                onBanToggle={handleBanToggle}
                onRemove={handleRemove}
                {isCurrentUser}
                isProcessing={params.context?.isProcessing === user.id}
            />
        </Sidebar>

        <Button size="icon" variant="base" tooltipPlacement="bottom" tooltip="View User" onclick={handleOpen}>
            <TablerUser />
        </Button>
        <Button
            size="icon"
            variant={user.banned ? "success" : "danger"}
            tooltipPlacement="bottom"
            tooltip={user.banned ? "Unban User" : "Ban User"}
            onclick={handleBanToggle}
            disabled={params.context?.isProcessing === user.id || isCurrentUser}
        >
            {#if user.banned}
                <TablerCheck />
            {:else}
                <TablerBan />
            {/if}
        </Button>
        <Button
            size="icon"
            variant="danger"
            tooltipPlacement="bottom"
            tooltip="Remove User"
            onclick={handleRemove}
            disabled={params.context?.isProcessing === user.id || isCurrentUser}
        >
            <TablerTrash />
        </Button>
    {/if}
</div>
