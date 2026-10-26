<script lang="ts">
    import { authClient } from "#lib/auth.js";
    import ActionCell from "#lib/components/grid/ActionCell.svelte";
    import CwlNicknameCell from "#lib/components/grid/CwlNicknameCell.svelte";
    import RoleCell from "#lib/components/grid/RoleCell.svelte";
    import UserCell from "#lib/components/grid/UserCell.svelte";
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import Dialog from "#lib/components/ui/Dialog.svelte";
    import Input from "#lib/components/ui/Input.svelte";
    import PageHeader from "#lib/components/ui/PageHeader.svelte";
    import RoleBadge, { roleOptions } from "#lib/components/ui/RoleBadge.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import { Sidebar } from "#lib/components/ui/sidebar/index.js";
    import DataTable from "#lib/components/ui/table/DataTable.svelte";
    import type { TableColumn } from "#lib/components/ui/table/features.js";
    import { InfiniteRows } from "#lib/components/ui/table/infinite.svelte.js";
    import UserManagementSidebar from "#lib/components/UserManagementSidebar.svelte";
    import { roleLevel } from "#lib/config/roles.js";
    import { loadGuildNicknames } from "#lib/discordNicknames.js";
    import { toast } from "#lib/toast.js";
    import { formatDate } from "#lib/utils.js";
    import { getAdminUsers, type GetAdminUsersQuery } from "@repo/clashofclans-client";
    import { renderComponent, type SortingState } from "@tanstack/svelte-table";
    import type { UserWithRole } from "better-auth/plugins";
    import { untrack } from "svelte";
    import TablerAlertTriangle from "~icons/tabler/alert-triangle";
    import TablerArrowRight from "~icons/tabler/arrow-right";
    import TablerKey from "~icons/tabler/key";
    import TablerKeyOff from "~icons/tabler/key-off";
    import TablerSearch from "~icons/tabler/search";

    let isProcessing = $state<string | null>(null);
    let banUserDialogOpen = $state(false);
    let removeUserDialogOpen = $state(false);
    let pendingRemoval = $state<{ userId: string; name: string } | null>(null);
    let roleDialogOpen = $state(false);
    let pendingRoleChange = $state<{ user: User; oldValue: string; newValue: string } | null>(null);
    let guildNicknames: Record<string, string> = {};
    let nicknamesLoading = $state(false);
    let userSidebar: Sidebar | null = $state(null);
    let selectedSidebarUser: (UserWithRole & { discordId?: string }) | null = $state(null);

    let selectedUser: {
        userId: string;
        reason: string;
        duration: Date[];
    } = $state({
        userId: "",
        reason: "",
        duration: [],
    });

    type User = UserWithRole & { discordId?: string | null; discordNickname?: string };

    const session = authClient.useSession();
    let searchText = $state("");
    let sorting = $state<SortingState>([]);
    let roleFilter = $state<string>("");
    let roleCounts = $state<Record<string, number>>({});
    // null = no preference; it narrows alongside the role filter, not instead of it.
    let apiAccessFilter = $state<boolean | null>(null);
    let apiAccessCounts = $state<{ granted: number; none: number }>({ granted: 0, none: 0 });

    // Highest roles first; only show roles that have members (or the active filter).
    let roleBars = $derived(
        [...roleOptions]
            .reverse()
            .map((o) => ({ ...o, count: roleCounts[o.value] ?? 0 }))
            .filter((o) => o.count > 0 || roleFilter === o.value),
    );

    function handleRoleFilter(role: string) {
        roleFilter = roleFilter === role ? "" : role;
        list.reset();
    }

    function handleApiAccessFilter(granted: boolean) {
        apiAccessFilter = apiAccessFilter === granted ? null : granted;
        list.reset();
    }

    // Drag-to-scroll for the role badge bar (mirrors the CWL clan bar).
    let scrollEl = $state<HTMLDivElement | null>(null);
    let isDragging = $state(false);
    let hasDragged = false;
    let dragStartX = 0;
    let dragScrollLeft = 0;
    let dragCursorStyle: HTMLStyleElement | null = null;

    // Suppress the click that fires at the end of a drag-scroll so badges don't toggle.
    $effect(() => {
        const el = scrollEl;
        if (!el) return;
        function suppressClick(e: MouseEvent) {
            if (hasDragged) {
                e.stopPropagation();
                e.preventDefault();
                hasDragged = false;
            }
        }
        el.addEventListener("click", suppressClick, { capture: true });
        return () => el.removeEventListener("click", suppressClick, { capture: true });
    });

    function onDragStart(e: MouseEvent) {
        if (!scrollEl) return;
        isDragging = true;
        hasDragged = false;
        dragStartX = e.pageX - scrollEl.offsetLeft;
        dragScrollLeft = scrollEl.scrollLeft;
        dragCursorStyle = document.createElement("style");
        dragCursorStyle.textContent = "* { cursor: grabbing !important; }";
        document.head.appendChild(dragCursorStyle);
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    function onDragMove(e: MouseEvent) {
        if (!isDragging || !scrollEl) return;
        e.preventDefault();
        const dx = e.pageX - scrollEl.offsetLeft - dragStartX;
        if (Math.abs(dx) > 4) hasDragged = true;
        scrollEl.scrollLeft = dragScrollLeft - dx;
    }

    function onDragEnd() {
        isDragging = false;
        dragCursorStyle?.remove();
        dragCursorStyle = null;
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
    }

    function openUserSidebar(user: UserWithRole & { discordId?: string }) {
        selectedSidebarUser = user;
        userSidebar?.open(user.id);
    }

    function closeUserSidebar() {
        userSidebar?.close();
        selectedSidebarUser = null;
    }

    function updateTableRow(user: Partial<UserWithRole> & { id: string }) {
        list.update(
            (u) => u.id === user.id,
            () => user,
        );
    }

    async function syncUserViews(userId: string) {
        const { data: refreshedUser } = await authClient.admin.getUser({ query: { id: userId } });

        if (!refreshedUser) {
            return null;
        }

        updateTableRow(refreshedUser);

        if (selectedSidebarUser?.id === userId) {
            selectedSidebarUser = { ...selectedSidebarUser, ...refreshedUser };
        }

        return refreshedUser;
    }

    const list = new InfiniteRows<User>(async (offset, limit) => {
        const sort = sorting[0];
        const queryParams: GetAdminUsersQuery = { limit, offset };
        if (searchText) queryParams.search = searchText;
        if (roleFilter) queryParams.role = roleFilter;
        if (apiAccessFilter !== null) queryParams.apiAccess = String(apiAccessFilter);
        if (sort) {
            queryParams.sortBy = sort.id;
            queryParams.sortDirection = sort.desc ? "desc" : "asc";
        }
        try {
            const resp = await getAdminUsers({ query: queryParams });
            if (!resp.data) throw new Error();
            if (resp.data.data.roleCounts) roleCounts = resp.data.data.roleCounts;
            if (resp.data.data.apiAccessCounts) apiAccessCounts = resp.data.data.apiAccessCounts;
            return {
                rows: (resp.data.data.users as User[]).map((u) => ({
                    ...u,
                    discordNickname: u.discordId ? guildNicknames[u.discordId] : undefined,
                })),
                total: resp.data.data.total,
            };
        } catch (error) {
            toast.error("Failed to load users", { description: error instanceof Error ? error.message : "An unknown error occurred" });
            return null;
        }
    });

    async function banUser(userId: string, reason: string, duration: Date[] | []) {
        const { error } = await authClient.admin.banUser({
            userId,
            banReason: reason,
            banExpiresIn: duration.length ? Math.floor((duration[0].getTime() - Date.now()) / 1000) : undefined,
        });

        if (error) {
            toast.error("Failed to ban user", { description: error.message });
        } else {
            selectedUser = { userId: "", reason: "", duration: [] };
            banUserDialogOpen = false;
            const refreshedUser = await syncUserViews(userId);
            toast.success(
                `${refreshedUser?.name ?? "User"} has been banned ${duration.length ? `until ${formatDate(duration[0])}` : "permanently"}`,
                {
                    description: reason,
                },
            );
            list.refresh();
        }
    }

    async function confirmRemoveUser() {
        const target = pendingRemoval;
        if (!target) return;
        pendingRemoval = null;

        isProcessing = target.userId;
        const { error } = await authClient.admin.removeUser({ userId: target.userId });

        if (error) {
            toast.error("Failed to remove user", { description: error.message });
        } else {
            toast.success(`${target.name} has been removed`);
            if (selectedSidebarUser?.id === target.userId) closeUserSidebar();
            list.refresh();
        }
        isProcessing = null;
    }

    async function confirmRoleChange() {
        const change = pendingRoleChange;
        if (!change) return;
        pendingRoleChange = null;

        const { user, newValue, oldValue } = change;
        isProcessing = user.id;
        updateTableRow({ id: user.id, role: newValue });
        const { error } = await authClient.admin.setRole({
            userId: user.id,
            role: newValue as Parameters<typeof authClient.admin.setRole>[0]["role"],
        });

        if (error) {
            toast.error("Failed to update role: " + error.message);
            updateTableRow({ id: user.id, role: oldValue });
        } else {
            toast.success("Role updated successfully");
            await syncUserViews(user.id);
        }
        isProcessing = null;
    }

    function cancelRoleChange() {
        pendingRoleChange = null;
    }

    const userActions = {
        // Gated here rather than at each button so both entry points — the table's
        // trash action and the sidebar's Remove User — go through the same prompt.
        removeUser: (userId: string, name?: string) => {
            pendingRemoval = { userId, name: name ?? "this user" };
            removeUserDialogOpen = true;
        },

        toggleBanUser: async (userId: string, isCurrentlyBanned: boolean) => {
            isProcessing = userId;

            if (isCurrentlyBanned) {
                const { error } = await authClient.admin.unbanUser({ userId });
                if (error) toast.error("Failed to unban user", { description: error.message });
                else {
                    const refreshedUser = await syncUserViews(userId);
                    toast.success(`${refreshedUser?.name ?? "User"} has been unbanned`);
                    list.refresh();
                }
            } else {
                selectedUser = { userId, reason: "", duration: [] };
                banUserDialogOpen = true;
            }
            isProcessing = null;
        },
    };

    function handleSearchChange() {
        list.reset();
    }

    // Nicknames are fetched separately from the row pages so the table isn't
    // blocked on the Discord guild-member walk. Rows already fetched are backfilled.
    async function loadNicknames() {
        nicknamesLoading = true;
        try {
            guildNicknames = await loadGuildNicknames();
            list.update(
                (u) => !!u.discordId,
                (u) => ({ discordNickname: guildNicknames[u.discordId!] }),
            );
        } finally {
            nicknamesLoading = false;
        }
    }

    function canEditRole(user: User) {
        const me = $session.data?.user;
        if (!me || user.id === me.id) return false;
        return roleLevel(user.role) < roleLevel(me.role);
    }

    const columns: TableColumn<User>[] = [
        {
            accessorKey: "name",
            header: "User",
            size: 260,
            cell: ({ row }) => renderComponent(UserCell, { user: row.original }),
        },
        {
            accessorKey: "discordNickname",
            header: "Nickname",
            size: 180,
            enableSorting: false,
            cell: ({ getValue }) => renderComponent(CwlNicknameCell, { value: getValue(), loading: nicknamesLoading }),
        },
        {
            accessorKey: "role",
            header: "Role",
            size: 180,
            cell: ({ getValue }) => renderComponent(RoleCell, { role: getValue() }),
            meta: {
                edit: {
                    type: "select",
                    canEdit: canEditRole,
                    options: () => {
                        const myLevel = roleLevel($session.data?.user?.role);
                        return roleOptions.filter((opt) => roleLevel(opt.value) < myLevel);
                    },
                    commit: (user: User, newValue: string) => {
                        pendingRoleChange = { user, oldValue: user.role ?? "", newValue };
                        roleDialogOpen = true;
                    },
                },
            },
        },
        {
            id: "actions",
            header: "",
            size: 160,
            enableSorting: false,
            enableResizing: false,
            cell: ({ row }) =>
                renderComponent(ActionCell, {
                    user: row.original,
                    currentUserId: $session.data?.user?.id,
                    currentUserLevel: roleLevel($session.data?.user?.role),
                    processing: isProcessing === row.original.id,
                    onOpen: () => openUserSidebar({ ...row.original, discordId: row.original.discordId ?? undefined }),
                    onRemove: () => userActions.removeUser(row.original.id, row.original.name),
                    onToggleBan: () => userActions.toggleBanUser(row.original.id, !!row.original.banned),
                }),
        },
    ];

    $effect(() => {
        sorting; // track
        untrack(() => list.reset());
    });
    loadNicknames();

    function getMinDate(): string {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split("T")[0];
    }
</script>

<Seo
    title="Users"
    description="Manage users in your server. View user details, edit roles and permissions, and perform administrative actions etc."
/>

<div class="relative flex size-full flex-col gap-4 overflow-hidden">
    <div class="flex flex-col gap-4 px-4 pt-4">
        <PageHeader title="Users" subtitleLoading={list.loading && list.rows.length === 0} subtitle="{list.total} user{list.total === 1 ? '' : 's'}">
            {#snippet actions()}
                <div class="flex min-w-60 flex-1 items-center gap-2 @4xl:max-w-96">
                    <Input placeholder="Search anything..." bind:value={searchText} onchange={handleSearchChange} class="min-w-0 flex-1" />
                    <Button variant="success" class="shrink-0" onclick={handleSearchChange} tooltip="Search" tooltipPlacement="bottom">
                        <TablerSearch class="size-5" />
                    </Button>
                </div>
            {/snippet}
        </PageHeader>

        {#if list.loading && list.rows.length === 0}
            <div class="flex items-center gap-2 overflow-hidden" aria-hidden="true">
                {#each [126, 92, 108, 116, 123] as width, i (i)}
                    <div class="h-6.5 shrink-0 skeleton rounded-lg" style:width="{width}px"></div>
                {/each}
                <div class="h-6 shrink-0 self-center border-l-2 border-stone-700/50"></div>
                <div class="h-6.5 w-30 shrink-0 skeleton rounded-lg"></div>
                <div class="h-6.5 w-38 shrink-0 skeleton rounded-lg"></div>
            </div>
        {:else if roleBars.length > 0}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                bind:this={scrollEl}
                onmousedown={onDragStart}
                class="edge-fade flex cursor-grab items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden {isDragging ? 'select-none' : ''}"
                style="scrollbar-width: none;"
            >
                {#each roleBars as r (r.value)}
                    {@const isActive = roleFilter === r.value}
                    <Badge
                        icon={r.icon}
                        content="{r.label} • {r.count}"
                        variant={r.variant}
                        size="button"
                        iconSize="size-4"
                        onclick={() => handleRoleFilter(r.value)}
                        class="font-medium {isActive ? '' : roleFilter !== '' ? 'opacity-50 hover:opacity-100' : ''}"
                    />
                {/each}

                <div class="h-6 shrink-0 self-center border-l-2 border-stone-700/50"></div>

                <Badge
                    icon={TablerKey}
                    content="API Access • {apiAccessCounts.granted}"
                    variant="purple"
                    size="button"
                    iconSize="size-4"
                    onclick={() => handleApiAccessFilter(true)}
                    class="font-medium {apiAccessFilter === true ? '' : apiAccessFilter !== null ? 'opacity-50 hover:opacity-100' : ''}"
                />
                <Badge
                    icon={TablerKeyOff}
                    content="No API Access • {apiAccessCounts.none}"
                    variant="ghost"
                    size="button"
                    iconSize="size-4"
                    onclick={() => handleApiAccessFilter(false)}
                    class="font-medium {apiAccessFilter === false ? '' : apiAccessFilter !== null ? 'opacity-50 hover:opacity-100' : ''}"
                />
            </div>
        {/if}
    </div>

    <div class="min-h-0 flex-1">
        <DataTable
            data={list.rows}
            {columns}
            getRowId={(u) => u.id}
            loading={list.loading}
            manualSorting
            bind:sorting
            onEndReached={() => list.loadMore()}
        />
    </div>
</div>

<Sidebar bind:this={userSidebar}>
    {#if selectedSidebarUser}
        <UserManagementSidebar
            user={selectedSidebarUser}
            onBanToggle={(userId, banned) => userActions.toggleBanUser(userId, banned)}
            onRemove={(userId) => userActions.removeUser(userId, selectedSidebarUser?.name)}
            onUserUpdated={(userId) => syncUserViews(userId)}
            isCurrentUser={selectedSidebarUser.id === $session.data?.user?.id}
            isProcessing={isProcessing === selectedSidebarUser.id}
        />
    {/if}
</Sidebar>

<Dialog
    bind:open={banUserDialogOpen}
    title="Ban User"
    description="Are you sure you want to ban this user?"
    confirmText="Ban"
    onConfirm={async () => {
        await banUser(selectedUser.userId, selectedUser.reason, selectedUser.duration);
    }}
    onClose={() => {
        selectedUser = { userId: "", reason: "", duration: [] };
    }}
>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col items-start justify-center gap-1">
            <p class="text-sm font-medium">Reason</p>
            <Input placeholder="Enter reason for ban (optional)" bind:value={selectedUser.reason} />
        </div>
        <div class="flex flex-col items-start justify-center gap-1">
            <p class="text-sm font-medium">Duration</p>
            <Input type="date" bind:value={selectedUser.duration} min={getMinDate()} />
        </div>
    </div>
</Dialog>

<Dialog
    bind:open={removeUserDialogOpen}
    title="Remove User"
    description={pendingRemoval
        ? `Permanently delete ${pendingRemoval.name}? This also removes their sessions and linked logins, and cannot be undone.`
        : "Permanently delete this user? This cannot be undone."}
    confirmText="Remove user"
    onConfirm={confirmRemoveUser}
    onClose={() => (pendingRemoval = null)}
>
    {#if pendingRemoval}
        <div class="flex items-start gap-2 rounded-lg border-2 border-red-700/50 bg-red-900 p-2 text-sm text-red-200">
            <TablerAlertTriangle class="mt-0.5 size-4 shrink-0" />
            <span>Ban the user instead if you only need to revoke their access; removal is not recoverable.</span>
        </div>
    {/if}
</Dialog>

<Dialog
    bind:open={roleDialogOpen}
    title="Change Role"
    description={pendingRoleChange
        ? `Are you sure you want to change ${pendingRoleChange.user.name}'s role?`
        : "Are you sure you want to change this user's role?"}
    confirmText="Change role"
    onConfirm={confirmRoleChange}
    onClose={cancelRoleChange}
>
    {#if pendingRoleChange}
        <div class="flex items-center justify-center gap-3">
            <RoleBadge role={pendingRoleChange.oldValue} />
            <TablerArrowRight class="size-5 shrink-0 text-stone-400" />
            <RoleBadge role={pendingRoleChange.newValue} />
        </div>
    {/if}
</Dialog>
