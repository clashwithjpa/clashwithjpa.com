<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient } from "$lib/auth";
    import ActionCell from "$lib/components/grid/ActionCell.svelte";
    import RoleCell from "$lib/components/grid/RoleCell.svelte";
    import UserCell from "$lib/components/grid/UserCell.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import { svelteRenderer } from "$lib/components/ui/grid/SvelteCellRenderer";
    import Input from "$lib/components/ui/Input.svelte";
    import { roleOptions } from "$lib/components/ui/RoleBadge.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { formatDate } from "$lib/utils";
    import { fadeIn } from "$lib/utils/animations";
    import { getDiscordIdByUserId } from "@repo/clashofclans-client";
    import type { UserWithRole } from "better-auth/plugins";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";

    let rowData = $state<(UserWithRole & { discordId: string })[]>([]);
    let isProcessing = $state<string | null>(null);
    let banUserDialogOpen = $state(false);
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

    async function loadUsers() {
        const { data, error } = await authClient.admin.listUsers({ query: { limit: 10 } });
        if (error) {
            toast.error("Failed to load users", { description: error.message });
            return;
        }

        rowData = await Promise.all(
            data?.users.map(async (user) => ({
                ...user,
                discordId: await getDiscordIdByUserId(user.id, { baseURL: PUBLIC_SERVER_URL, credentials: "include" }).then((res) =>
                    res.success && res.data?.accountId ? res.data.accountId : "",
                ),
            })) || [],
        );
    }

    onMount(async () => {
        await loadUsers();
    });

    async function banUser(userId: string, reason: string, duration: Date[] | []) {
        const { error } = await authClient.admin.banUser({
            userId,
            banReason: reason,
            banExpiresIn: duration.length ? Math.floor((duration[0].getTime() - Date.now()) / 1000) : undefined,
        });

        if (error) toast.error("Failed to ban user", { description: error.message });
        else {
            const { data, error } = await authClient.admin.getUser({ query: { id: userId } });
            if (error) {
                toast.error("Failed to refresh user data", { description: error.message });
            } else if (data) {
                const index = rowData.findIndex((u) => u.id === userId);
                if (index !== -1) {
                    Object.assign(rowData[index], data);
                    rowData = rowData.map((u) => u);
                }
            }
            selectedUser = { userId: "", reason: "", duration: [] };
            banUserDialogOpen = false;
            toast.success(`${data?.name} has been banned ${duration.length ? `until ${formatDate(duration[0])}` : "permanently"}`, {
                description: reason,
            });
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
                rowData = rowData.filter((u) => u.id !== userId);
            }
            isProcessing = null;
        },

        toggleBanUser: async (userId: string, isCurrentlyBanned: boolean) => {
            isProcessing = userId;

            if (isCurrentlyBanned) {
                const { error } = await authClient.admin.unbanUser({ userId });
                if (error) toast.error("Failed to unban user", { description: error.message });
                else {
                    const { data, error } = await authClient.admin.getUser({ query: { id: userId } });
                    if (error) {
                        toast.error("Failed to refresh user data", { description: error.message });
                    } else if (data) {
                        const index = rowData.findIndex((u) => u.id === userId);
                        if (index !== -1) {
                            Object.assign(rowData[index], data);
                            rowData = rowData.map((u) => u);
                        }
                    }
                    toast.success(`${data?.name} has been unbanned`);
                }
            } else {
                selectedUser = { userId, reason: "", duration: [] };
                banUserDialogOpen = true;
            }
            isProcessing = null;
        },
    };

    let nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
</script>

<Seo
    title="Users"
    description="Manage users in your server. View user details, edit roles and permissions, and perform administrative actions etc."
/>

<div class="size-full" in:fadeIn>
    <Grid
        {rowData}
        gridOptions={{
            context: gridContext,
            rowHeight: 56,
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
            <Input type="date" bind:value={selectedUser.duration} min={nextDate} />
        </div>
    </div>
</Dialog>
