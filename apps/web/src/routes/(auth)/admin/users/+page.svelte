<script lang="ts">
    import { authClient } from "$lib/auth";
    import ActionCell from "$lib/components/grid/ActionCell.svelte";
    import RoleCell from "$lib/components/grid/RoleCell.svelte";
    import UserCell from "$lib/components/grid/UserCell.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import { roleOptions } from "$lib/components/ui/RoleBadge.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { svelteRenderer } from "$lib/components/ui/grid/SvelteCellRenderer";
    import { fadeIn } from "$lib/utils/animations";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";

    let rowData = $state<any[]>([]);
    let isProcessing = $state<string | null>(null);

    const session = authClient.useSession();

    async function loadUsers() {
        const { data, error } = await authClient.admin.listUsers({ query: { limit: 100 } });
        if (error) {
            toast.error("Failed to load users", { description: error.message });
            return;
        }

        rowData = data?.users.map((user) => ({ ...user })) || [];
    }

    onMount(async () => {
        await loadUsers();
    });

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
                    toast.success("User unbanned");
                    rowData = rowData.map((u) => (u.id === userId ? { ...u, banned: false } : u));
                }
            } else {
                const { error } = await authClient.admin.banUser({ userId });
                if (error) toast.error("Failed to ban user", { description: error.message });
                else {
                    toast.success("User banned");
                    rowData = rowData.map((u) => (u.id === userId ? { ...u, banned: true } : u));
                }
            }
            isProcessing = null;
        },
    };
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
