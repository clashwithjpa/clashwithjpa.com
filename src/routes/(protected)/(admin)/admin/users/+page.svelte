<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import Grid from "$lib/components/admin/Grid.svelte";
    import CocAccountsUsersTableWrapper from "$lib/components/admin/wrappers/CocAccountsUsersTableWrapper.svelte";
    import UserUsersTableWrapper from "$lib/components/admin/wrappers/UserUsersTableWrapper.svelte";
    import { Button } from "$lib/components/ui/button";
    import type { InsertCoc, InsertUser } from "$lib/server/schema";
    import type { GridOptions } from "@ag-grid-community/core";
    import { makeSvelteCellRenderer } from "ag-grid-svelte5-extended";
    import { toast } from "svelte-sonner";
    import { fade } from "svelte/transition";
    import LucideCloud from "~icons/lucide/cloud";
    import LucideCloudAlert from "~icons/lucide/cloud-alert";
    import LucideCloudUpload from "~icons/lucide/cloud-upload";
    import LucideLoaderCircle from "~icons/lucide/loader-circle";
    import LucideTrash from "~icons/lucide/trash";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    let rowData = $derived<InsertUser[]>(data.users);
    let disabled: boolean = $state(false);
    let loading: boolean = $state(false);
    let syncing: "success" | "loading" | "error" = $state("success");

    const gridOptions: GridOptions<InsertUser & { cocAccounts: InsertCoc[] }> = {
        columnDefs: [
            {
                field: "discordId",
                headerName: "Discord ID",
                cellRenderer: makeSvelteCellRenderer(UserUsersTableWrapper),
                filter: true,
                filterParams: {
                    filterOptions: ["equals"],
                    maxNumConditions: 1,
                    filterPlaceholder: "Search by Discord ID"
                }
            },
            {
                field: "isActive",
                filter: true,
                editable: true
            },
            {
                field: "cocAccounts",
                headerName: "COC Accounts",
                cellRenderer: makeSvelteCellRenderer(CocAccountsUsersTableWrapper),
                filter: true
            }
        ],
        autoSizeStrategy: {
            type: "fitGridWidth"
        },
        pagination: true,
        paginationAutoPageSize: true,
        rowSelection: {
            mode: "multiRow"
        },
        onRowSelected(event) {
            selectedRows = event.api.getSelectedRows();
        },
        async onCellValueChanged(event) {
            let updatedRow = event.data;
            syncing = "loading";
            let response = await fetch(`/api/user`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: "update_user",
                    value: updatedRow
                })
            });
            if (response.ok) {
                syncing = "success";
                invalidateAll();
            } else {
                syncing = "error";
                toast.error("Failed to update user");
            }
        }
    };

    let selectedRows: InsertUser[] = $state([]);

    async function removeUser(discordIDs: string[]) {
        disabled = true;
        loading = true;
        let response = await fetch(`/api/user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key: "remove_user",
                value: discordIDs
            })
        });
        if (response.ok) {
            invalidateAll();
        } else {
            toast.error("Failed to remove user");
        }
        selectedRows = [];
        loading = false;
        setTimeout(() => {
            disabled = false;
        }, 500);
    }
</script>

<div class="flex size-full flex-col gap-5">
    <div class="flex w-full items-center justify-between">
        <div class="flex items-center justify-center gap-2">
            <h1 class="text-2xl font-bold">Users</h1>
            <div class="size-8">
                {#if syncing === "success"}
                    <span in:fade class="size-full">
                        <LucideCloud class="size-full text-green-500" />
                    </span>
                {:else if syncing === "loading"}
                    <span in:fade class="size-full">
                        <LucideCloudUpload class="size-full text-yellow-500" />
                    </span>
                {:else if syncing === "error"}
                    <span in:fade class="size-full">
                        <LucideCloudAlert class="size-full text-red-500" />
                    </span>
                {/if}
            </div>
        </div>
        <div class="flex items-center justify-center gap-2">
            <Button
                size="icon"
                variant="destructive"
                disabled={selectedRows.length <= 0 || disabled}
                onclick={async () => {
                    await removeUser(selectedRows.map((row) => row.discordId));
                }}
            >
                {#if loading}
                    <span in:fade={{ duration: 100 }}>
                        <LucideLoaderCircle class="animate-spin" />
                    </span>
                {:else}
                    <span in:fade={{ duration: 100 }}>
                        <LucideTrash />
                    </span>
                {/if}
            </Button>
        </div>
    </div>
    <div class="size-full">
        <Grid {gridOptions} bind:rowData />
    </div>
</div>
