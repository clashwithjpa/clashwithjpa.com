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
    import { roleOptions } from "$lib/components/ui/RoleBadge.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import ToggleGroup from "$lib/components/ui/ToggleGroup.svelte";
    import { formatDate } from "$lib/utils";
    import { fadeIn } from "$lib/utils/animations";
    import { getDiscordIdByUserId } from "@repo/clashofclans-client";
    import type { IDatasource, IGetRowsParams } from "ag-grid-community";
    import { toast } from "svelte-sonner";
    import TablerAbc from "~icons/tabler/abc";
    import TablerAt from "~icons/tabler/at";
    import TablerSearch from "~icons/tabler/search";

    let isProcessing = $state<string | null>(null);
    let banUserDialogOpen = $state(false);
    let gridApi: any = $state(null);

    let selectedUser: {
        userId: string;
        reason: string;
        duration: Date[] | [];
    } = $state({
        userId: "",
        reason: "",
        duration: [] as Date[] | [],
    });

    const session = authClient.useSession();
    let searchText = $state("");
    let isDragging = $state(false);
    let searchType: ["name"] | ["email"] = $state(["name"]);

    async function enrichUsers(users: any[]) {
        return Promise.all(
            users.map(async (user) => ({
                ...user,
                discordId: await getDiscordIdByUserId(user.id, {
                    baseURL: PUBLIC_SERVER_URL,
                    credentials: "include",
                })
                    .then((res) => (res.success && res.data?.accountId ? res.data.accountId : ""))
                    .catch(() => ""),
            })),
        );
    }

    function createDatasource(): IDatasource {
        return {
            async getRows(params: IGetRowsParams) {
                try {
                    const skip = params.startRow || 0;
                    const limit = (params.endRow || 0) - skip;

                    const queryParams: any = { limit, offset: skip };

                    // Server-side name search with operator
                    if (searchText) {
                        let searchValue = searchText;

                        queryParams.searchValue = searchValue;
                        queryParams.searchField = searchType[0];
                    }

                    const { data, error } = await authClient.admin.listUsers({ query: queryParams });

                    if (error || !data?.users) {
                        params.failCallback();
                        return;
                    }

                    const enrichedUsers = await enrichUsers(data.users);
                    params.successCallback(enrichedUsers, data.total);
                } catch (error) {
                    console.error("Failed to load users:", error);
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
            const { data } = await authClient.admin.getUser({ query: { id: userId } });
            selectedUser = { userId: "", reason: "", duration: [] };
            banUserDialogOpen = false;
            toast.success(`${data?.name} has been banned ${duration.length ? `until ${formatDate(duration[0])}` : "permanently"}`, {
                description: reason,
            });
            // Refresh grid data
            gridApi?.refreshInfiniteCache();
        }
    }

    const gridContext = {
        get isProcessing() {
            return isProcessing;
        },
        get currentUserId() {
            return $session.data?.user?.id;
        },

        removeUser: async (userId: string) => {
            isProcessing = userId;
            const { error } = await authClient.admin.removeUser({ userId });

            if (error) {
                toast.error("Failed to remove user", { description: error.message });
            } else {
                toast.success("User removed successfully");
                // Refresh grid data
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
                    const { data } = await authClient.admin.getUser({ query: { id: userId } });
                    toast.success(`${data?.name} has been unbanned`);
                    // Refresh grid data
                    gridApi?.refreshInfiniteCache();
                }
            } else {
                selectedUser = { userId, reason: "", duration: [] };
                banUserDialogOpen = true;
            }
            isProcessing = null;
        },
    };

    function refreshDatasource() {
        if (gridApi) gridApi.setGridOption("datasource", createDatasource());
    }

    function handleSearchChange() {
        refreshDatasource();
    }

    function getMinDate(): string {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split("T")[0];
    }

    $effect(() => {
        if (searchType) refreshDatasource(); // Refresh datasource when search type changes
    });
</script>

<Seo
    title="Users"
    description="Manage users in your server. View user details, edit roles and permissions, and perform administrative actions etc."
/>

<div class="size-full" in:fadeIn>
    <Grid
        gridOptions={{
            context: gridContext,
            rowHeight: 56,
            rowModelType: "infinite",
            cacheBlockSize: 50,
            blockLoadDebounceMillis: 300,
            onGridReady: (params) => {
                gridApi = params.api;
                gridApi.setGridOption("datasource", createDatasource());
            },
            onCellValueChanged: async (event) => {
                if (event.colDef.field === "role" && event.oldValue !== event.newValue) {
                    isProcessing = event.data.id;
                    const { error } = await authClient.admin.setRole({
                        userId: event.data.id,
                        role: event.newValue,
                    });

                    if (error) {
                        toast.error("Failed to update role: " + error.message);
                        event.data.role = event.oldValue;
                        event.api.refreshCells({ rowNodes: [event.node] });
                    } else {
                        toast.success("Role updated successfully");
                    }
                    isProcessing = null;
                }
            },
        }}
        columnDefs={[
            { headerName: "User", field: "name", flex: 2, cellRenderer: svelteRenderer(UserCell) },
            {
                headerName: "Role",
                field: "role",
                editable: (params) => params.data.id !== $session.data?.user?.id,
                cellRenderer: svelteRenderer(RoleCell),
                cellEditorPopup: true,
                cellEditor: "uiSelectEditor",
                cellEditorParams: {
                    options: roleOptions,
                },
            },
            {
                headerName: " ",
                field: "id",
                cellRenderer: svelteRenderer(ActionCell),
                sortable: false,
                filter: false,
                lockPosition: "right",
                width: 0,
            },
        ]}
    />

    <Toolbar onDragStart={() => (isDragging = true)} onDragEnd={() => (isDragging = false)}>
        <ToggleGroup
            bind:value={searchType}
            options={[
                { icon: TablerAbc, value: "name", tooltip: "Search by name" },
                { icon: TablerAt, value: "email", tooltip: "Search by email" },
            ]}
            tooltip={true}
            contentClass="size-5"
            class="h-11 shrink-0 px-0"
        />
        <Input placeholder="Search by {searchType}..." bind:value={searchText} onchange={handleSearchChange} class="h-11 w-80" />
        <Button variant="success" class="size-11 shrink-0 px-0" onclick={handleSearchChange} tooltip="Search" tooltipPlacement="top">
            <TablerSearch class="size-5" />
        </Button>
    </Toolbar>
</div>

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
