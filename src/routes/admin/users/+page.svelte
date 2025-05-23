<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import CocAccountsUsersFormsWrapper from "$lib/components/admin/wrappers/CocAccountsUsersFormsWrapper.svelte";
    import UserNameUsersFormsWrapper from "$lib/components/admin/wrappers/UserNameUsersFormsWrapper.svelte";
    import { toast } from "$lib/components/toast";
    import Button from "$lib/components/ui/Button.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import type { InsertCoc, InsertUser } from "$lib/server/schema";
    import type { GridOptions } from "@ag-grid-community/core";
    import { makeSvelteCellRenderer } from "ag-grid-svelte5-extended";
    import { fade } from "svelte/transition";
    import MaterialSymbolsCloudAlertRounded from "~icons/material-symbols/cloud-alert-rounded";
    import MaterialSymbolsCloudDoneRounded from "~icons/material-symbols/cloud-done-rounded";
    import MaterialSymbolsCloudSyncRounded from "~icons/material-symbols/cloud-sync-rounded";
    import MaterialSymbolsDeleteRounded from "~icons/material-symbols/delete-rounded";
    import TablerLoader2 from "~icons/tabler/loader-2";
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
                cellRenderer: makeSvelteCellRenderer(UserNameUsersFormsWrapper),
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
                cellRenderer: makeSvelteCellRenderer(CocAccountsUsersFormsWrapper),
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

<div class="flex size-full flex-col gap-5 p-5 md:p-11">
    <div class="flex w-full items-center justify-between">
        <div class="flex items-center justify-center gap-2">
            <h1 class="text-3xl font-bold md:text-4xl">Users</h1>
            <div class="size-8">
                {#if syncing === "success"}
                    <span in:fade class="size-full">
                        <MaterialSymbolsCloudDoneRounded class="size-full text-green-500" />
                    </span>
                {:else if syncing === "loading"}
                    <span in:fade class="size-full">
                        <MaterialSymbolsCloudSyncRounded class="size-full text-yellow-500" />
                    </span>
                {:else if syncing === "error"}
                    <span in:fade class="size-full">
                        <MaterialSymbolsCloudAlertRounded class="size-full text-red-500" />
                    </span>
                {/if}
            </div>
        </div>
        <div class="flex items-center justify-center gap-2">
            <Button
                size="sm"
                class="flex items-center justify-center gap-2 hover:not-disabled:!bg-red-500/10 hover:not-disabled:!text-red-500"
                disabled={selectedRows.length <= 0 || disabled}
                onclick={async () => {
                    await removeUser(selectedRows.map((row) => row.discordId));
                }}
            >
                <div in:fade class="size-6">
                    {#if loading}
                        <span class="size-full">
                            <TablerLoader2 class="size-full animate-spin" />
                        </span>
                    {:else}
                        <span class="size-full">
                            <MaterialSymbolsDeleteRounded class="size-full" />
                        </span>
                    {/if}
                </div>
            </Button>
        </div>
    </div>
    <div class="size-full">
        <Grid {gridOptions} bind:rowData />
    </div>
</div>
