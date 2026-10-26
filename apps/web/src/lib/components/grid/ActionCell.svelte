<script lang="ts">
    import Button from "#lib/components/ui/Button.svelte";
    import { ROLE_LEVELS, roleLevel } from "#lib/config/roles.js";
    import type { UserWithRole } from "better-auth/plugins";
    import TablerBan from "~icons/tabler/ban";
    import TablerCheck from "~icons/tabler/check";
    import TablerTrash from "~icons/tabler/trash";
    import TablerUser from "~icons/tabler/user";

    let {
        user,
        currentUserId,
        currentUserLevel,
        processing,
        onOpen,
        onRemove,
        onToggleBan,
    }: {
        user: UserWithRole;
        currentUserId: string | undefined;
        currentUserLevel: number;
        processing: boolean;
        onOpen: () => void;
        onRemove: () => void;
        onToggleBan: () => void;
    } = $props();

    let isCurrentUser = $derived(user.id === currentUserId);
    // Mirror the server's rule (`before` hook in apps/server): can't act on users at or above your level.
    let isAboveOrEqual = $derived(roleLevel(user.role) >= currentUserLevel);
    let canAct = $derived(!isCurrentUser && !isAboveOrEqual);
    let canRemoveRole = $derived(currentUserLevel >= ROLE_LEVELS.admin);
</script>

<div class="flex items-center justify-center gap-2">
    <Button size="icon" variant="base" tooltipPlacement="bottom" tooltip="View User" onclick={onOpen}>
        <TablerUser />
    </Button>
    <Button
        size="icon"
        variant={user.banned ? "success" : "danger"}
        tooltipPlacement="bottom"
        tooltip={user.banned ? "Unban User" : "Ban User"}
        onclick={() => canAct && onToggleBan()}
        disabled={processing || !canAct}
    >
        {#if user.banned}
            <TablerCheck />
        {:else}
            <TablerBan />
        {/if}
    </Button>
    {#if canRemoveRole}
        <!-- The sidebar is closed by the removal itself, not here: closing up front
             would tear it down even when the confirmation is dismissed. -->
        <Button
            size="icon"
            variant="danger"
            tooltipPlacement="bottom"
            tooltip="Remove User"
            onclick={() => canAct && onRemove()}
            disabled={processing || !canAct}
        >
            <TablerTrash />
        </Button>
    {/if}
</div>
