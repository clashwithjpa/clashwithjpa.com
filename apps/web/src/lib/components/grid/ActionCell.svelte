<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import { ROLE_LEVELS, roleLevel } from "$lib/config/roles";
    import type { ICellRendererParams } from "ag-grid-community";
    import type { UserWithRole } from "better-auth/plugins";
    import TablerBan from "~icons/tabler/ban";
    import TablerCheck from "~icons/tabler/check";
    import TablerTrash from "~icons/tabler/trash";
    import TablerUser from "~icons/tabler/user";

    let { params }: { params: ICellRendererParams } = $props();

    let user: UserWithRole = $derived(params.data);
    let isCurrentUser = $derived(user?.id === params.context?.currentUserId);
    // Mirror the server's rule (`before` hook in apps/server): can't act on users at or above your level.
    let isAboveOrEqual = $derived(roleLevel(user?.role) >= (params.context?.currentUserLevel ?? 0));
    let canAct = $derived(!isCurrentUser && !isAboveOrEqual);
    let canRemoveRole = $derived((params.context?.currentUserLevel ?? 0) >= ROLE_LEVELS.admin);

    function handleOpen() {
        if (user) {
            params.context?.openUserSidebar?.(user);
        }
    }

    async function handleRemove() {
        if (params.context?.removeUser && canAct && user) {
            if (params.context?.isSidebarOpenFor?.(user.id)) {
                params.context.closeUserSidebar?.();
            }
            await params.context.removeUser(user.id);
        }
    }

    async function handleBanToggle() {
        if (params.context?.toggleBanUser && canAct && user) {
            await params.context.toggleBanUser(user.id, user.banned);
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex size-full items-center justify-center gap-2 p-1.5" onmousedown={(e) => e.stopPropagation()}>
    {#if user}
        <Button size="icon" variant="base" tooltipPlacement="bottom" tooltip="View User" onclick={handleOpen}>
            <TablerUser />
        </Button>
        <Button
            size="icon"
            variant={user.banned ? "success" : "danger"}
            tooltipPlacement="bottom"
            tooltip={user.banned ? "Unban User" : "Ban User"}
            onclick={handleBanToggle}
            disabled={params.context?.isProcessing === user.id || !canAct}
        >
            {#if user.banned}
                <TablerCheck />
            {:else}
                <TablerBan />
            {/if}
        </Button>
        {#if canRemoveRole}
            <Button
                size="icon"
                variant="danger"
                tooltipPlacement="bottom"
                tooltip="Remove User"
                onclick={handleRemove}
                disabled={params.context?.isProcessing === user.id || !canAct}
            >
                <TablerTrash />
            </Button>
        {/if}
    {/if}
</div>
