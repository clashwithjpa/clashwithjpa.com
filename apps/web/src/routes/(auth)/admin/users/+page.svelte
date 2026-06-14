<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient } from "$lib/auth";
    import ActionCell from "$lib/components/grid/ActionCell.svelte";
    import RoleCell from "$lib/components/grid/RoleCell.svelte";
    import UserCell from "$lib/components/grid/UserCell.svelte";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import { svelteRenderer } from "$lib/components/ui/grid/SvelteCellRenderer";
    import Input from "$lib/components/ui/Input.svelte";
    import RoleBadge, { roleOptions } from "$lib/components/ui/RoleBadge.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar, sidebarStore } from "$lib/components/ui/sidebar";
    import UserManagementSidebar from "$lib/components/UserManagementSidebar.svelte";
    import { roleLevel } from "$lib/config/roles";
    import { loadGuildNicknames } from "$lib/discordNicknames";
    import { formatDate } from "$lib/utils";
    import { fadeIn } from "$lib/utils/animations";
    import type { CellValueChangedEvent, GridApi, IDatasource, IGetRowsParams } from "ag-grid-community";
    import type { UserWithRole } from "better-auth/plugins";
    import { toast } from "svelte-sonner";
    import TablerArrowRight from "~icons/tabler/arrow-right";
    import TablerSearch from "~icons/tabler/search";

    let isProcessing = $state<string | null>(null);
    let banUserDialogOpen = $state(false);
    let roleDialogOpen = $state(false);
    let pendingRoleChange = $state<{ event: CellValueChangedEvent; oldValue: string; newValue: string } | null>(null);
    let lastRevert: { id: string; value: string } | null = null;
    let gridApi: GridApi | null = $state(null);
    let guildNicknames: Record<string, string> = {};
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

    const session = authClient.useSession();
    let searchText = $state("");

    function openUserSidebar(user: UserWithRole & { discordId?: string }) {
        selectedSidebarUser = user;
        userSidebar?.open(user.id);
    }

    function closeUserSidebar() {
        userSidebar?.close();
        selectedSidebarUser = null;
    }

    function updateGridRow(user: Partial<UserWithRole> & { id: string }) {
        gridApi?.forEachNode((node) => {
            if (node.data?.id === user.id) {
                node.setData({ ...node.data, ...user });
            }
        });
        gridApi?.refreshCells({ force: true });
    }

    async function syncUserViews(userId: string) {
        const { data: refreshedUser } = await authClient.admin.getUser({ query: { id: userId } });

        if (!refreshedUser) {
            return null;
        }

        updateGridRow(refreshedUser);

        if (selectedSidebarUser?.id === userId) {
            selectedSidebarUser = { ...selectedSidebarUser, ...refreshedUser };
        }

        return refreshedUser;
    }

    function createDatasource(): IDatasource {
        return {
            async getRows(params: IGetRowsParams) {
                try {
                    const skip = params.startRow || 0;
                    const limit = (params.endRow || 0) - skip;
                    const sort = params.sortModel?.[0];

                    const query = new URLSearchParams({ limit: String(limit), offset: String(skip) });
                    if (searchText) query.set("search", searchText);
                    if (sort) {
                        query.set("sortBy", sort.colId);
                        query.set("sortDirection", sort.sort ?? "asc");
                    }

                    const resp = await fetch(`${PUBLIC_SERVER_URL}/admin/users?${query}`, { credentials: "include" });
                    const json = await resp.json();

                    if (!resp.ok || !json.success) {
                        params.failCallback();
                        return;
                    }

                    params.successCallback(
                        json.data.users.map((u: { discordId?: string | null }) => ({
                            ...u,
                            discordNickname: u.discordId ? guildNicknames[u.discordId] : undefined,
                        })),
                        json.data.total,
                    );
                } catch (error) {
                    toast.error("Failed to load users", { description: error instanceof Error ? error.message : "An unknown error occurred" });
                    params.failCallback();
                }
            },
        };
    }

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
            gridApi?.refreshInfiniteCache();
        }
    }

    function revertRoleCell(change: { event: CellValueChangedEvent; oldValue: string }) {
        lastRevert = { id: change.event.data.id, value: change.oldValue };
        change.event.node.setDataValue("role", change.oldValue);
    }

    async function confirmRoleChange() {
        const change = pendingRoleChange;
        if (!change) return;
        pendingRoleChange = null;

        const { event, newValue, oldValue } = change;
        isProcessing = event.data.id;
        const { error } = await authClient.admin.setRole({
            userId: event.data.id,
            role: newValue as Parameters<typeof authClient.admin.setRole>[0]["role"],
        });

        if (error) {
            toast.error("Failed to update role: " + error.message);
            revertRoleCell({ event, oldValue });
        } else {
            toast.success("Role updated successfully");
            await syncUserViews(event.data.id);
        }
        isProcessing = null;
    }

    function cancelRoleChange() {
        if (!pendingRoleChange) return;
        revertRoleCell(pendingRoleChange);
        pendingRoleChange = null;
    }

    const gridContext = {
        get isProcessing() {
            return isProcessing;
        },
        get currentUserId() {
            return $session.data?.user?.id;
        },
        get currentUserLevel() {
            return roleLevel($session.data?.user?.role);
        },

        openUserSidebar,
        closeUserSidebar,
        isSidebarOpenFor: (userId: string) => sidebarStore.isOpen && selectedSidebarUser?.id === userId,

        removeUser: async (userId: string) => {
            isProcessing = userId;
            const { error } = await authClient.admin.removeUser({ userId });

            if (error) {
                toast.error("Failed to remove user", { description: error.message });
            } else {
                toast.success("User removed successfully");
                if (selectedSidebarUser?.id === userId) {
                    closeUserSidebar();
                }
                gridApi?.refreshInfiniteCache();
            }
            isProcessing = null;
        },

        toggleBanUser: async (userId: string, isCurrentlyBanned: boolean) => {
            isProcessing = userId;

            if (isCurrentlyBanned) {
                const { error } = await authClient.admin.unbanUser({ userId });
                if (error) toast.error("Failed to unban user", { description: error.message });
                else {
                    const refreshedUser = await syncUserViews(userId);
                    toast.success(`${refreshedUser?.name ?? "User"} has been unbanned`);
                    gridApi?.refreshInfiniteCache();
                }
            } else {
                selectedUser = { userId, reason: "", duration: [] };
                banUserDialogOpen = true;
            }
            isProcessing = null;
        },
    };

    function handleSearchChange() {
        gridApi?.setGridOption("datasource", createDatasource());
    }

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

<div class="relative flex size-full flex-col overflow-hidden" in:fadeIn>
    <Grid
        fitToWidth
        gridOptions={{
            context: gridContext,
            rowHeight: 56,
            rowModelType: "infinite",
            cacheBlockSize: 50,
            blockLoadDebounceMillis: 300,
            onGridReady: async (params) => {
                gridApi = params.api;
                guildNicknames = await loadGuildNicknames();
                gridApi.setGridOption("datasource", createDatasource());
            },
            onCellValueChanged: (event) => {
                if (event.colDef.field !== "role" || event.oldValue === event.newValue) return;
                if (lastRevert && event.data.id === lastRevert.id && event.newValue === lastRevert.value) {
                    lastRevert = null;
                    return;
                }
                pendingRoleChange = { event, oldValue: event.oldValue, newValue: event.newValue };
                roleDialogOpen = true;
            },
        }}
        columnDefs={[
            { headerName: "User", field: "name", sortable: true, filter: false, cellRenderer: svelteRenderer(UserCell) },
            {
                headerName: "Nickname",
                field: "discordNickname",
                sortable: false,
                filter: false,
                valueFormatter: (p) => p.value ?? "—",
            },
            {
                headerName: "Role",
                field: "role",
                editable: (params) => {
                    const me = $session.data?.user;
                    if (!me || params.data.id === me.id) return false;
                    return roleLevel(params.data.role) < roleLevel(me.role);
                },
                sortable: true,
                filter: false,
                cellRenderer: svelteRenderer(RoleCell),
                cellEditorPopup: true,
                cellEditor: "uiSelectEditor",
                cellEditorParams: () => {
                    const myLevel = roleLevel($session.data?.user?.role);
                    return { options: roleOptions.filter((opt) => roleLevel(opt.value) < myLevel) };
                },
            },
            {
                headerName: " ",
                field: "id",
                cellRenderer: svelteRenderer(ActionCell),
                cellStyle: { justifyContent: "center" },
                sortable: false,
                filter: false,
                lockPosition: "right",
                suppressSizeToFit: true,
            },
        ]}
    />

    <Toolbar>
        <Input placeholder="Search anything..." bind:value={searchText} onchange={handleSearchChange} class="lg:w-80" />
        <Button variant="success" class="shrink-0" onclick={handleSearchChange} tooltip="Search" tooltipPlacement="top">
            <TablerSearch class="size-5" />
        </Button>
    </Toolbar>
</div>

<Sidebar bind:this={userSidebar}>
    {#if selectedSidebarUser}
        <UserManagementSidebar
            user={selectedSidebarUser}
            onBanToggle={(userId, banned) => gridContext.toggleBanUser(userId, banned)}
            onRemove={(userId) => gridContext.removeUser(userId)}
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
    bind:open={roleDialogOpen}
    title="Change Role"
    description={pendingRoleChange
        ? `Are you sure you want to change ${pendingRoleChange.event.data.name}'s role?`
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
