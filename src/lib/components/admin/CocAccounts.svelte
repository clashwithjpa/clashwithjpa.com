<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { APIPlayer } from "$lib/coc/types";
    import Grid from "$lib/components/admin/Grid.svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Popover from "$lib/components/ui/popover";
    import type { GridOptions } from "@ag-grid-community/core";
    import { toast } from "svelte-sonner";
    import { fade, fly } from "svelte/transition";
    import MaterialSymbolsDeleteRounded from "~icons/material-symbols/delete-rounded";
    import TablerLoader2 from "~icons/tabler/loader-2";

    interface Props {
        tags: string[];
    }
    let { tags }: Props = $props();
    let disabled: boolean = $state(false);
    let loading: boolean = $state(false);

    async function fetchCocAccounts(): Promise<APIPlayer[]> {
        return Promise.all(
            tags.map((tag) =>
                fetch(`/api/player?tag=${encodeURIComponent(tag)}`)
                    .then((res) => res.json())
                    .then((data) => data as APIPlayer)
            )
        );
    }

    const gridOptions: GridOptions<APIPlayer> = {
        columnDefs: [
            {
                field: "tag",
                headerName: "Account Tag",
                filter: true
            },
            {
                field: "name",
                headerName: "Account Name",
                filter: true
            },
            {
                field: "clan.name",
                headerName: "Clan Name",
                filter: true
            }
        ],
        autoSizeStrategy: {
            type: "fitCellContents"
        },
        pagination: true,
        paginationAutoPageSize: true,
        rowSelection: {
            mode: "multiRow"
        },
        onRowSelected(event) {
            selectedRows = event.api.getSelectedRows();
        }
    };

    let selectedRows: APIPlayer[] = $state([]);

    async function removeAcc(tags: string[]) {
        disabled = true;
        loading = true;
        let response = await fetch(`/api/coc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key: "remove_acc",
                value: tags
            })
        });
        if (response.ok) {
            invalidateAll();
        } else {
            toast.error("Failed to remove user's account");
        }
        selectedRows = [];
        loading = false;
        setTimeout(() => {
            disabled = false;
        }, 500);
    }
</script>

<Popover.Root>
    <Popover.Trigger class="cursor-pointer">
        <div class="bg-background rounded-md p-1 font-mono">
            <p class="text-sm">{tags.length} Account{tags.length > 1 ? "s" : ""}</p>
        </div>
    </Popover.Trigger>
    <Popover.Content class="p-0">
        {#await fetchCocAccounts()}
            <div class="flex size-full items-center justify-center py-1">
                <TablerLoader2 class="size-10 animate-spin"></TablerLoader2>
            </div>
        {:then accs}
            <div in:fly class="flex size-full flex-col">
                <div class="flex items-center justify-center py-2">
                    <Button
                        variant="destructive"
                        disabled={selectedRows.length <= 0 || disabled}
                        onclick={async () => {
                            await removeAcc(selectedRows.map((row) => row.tag));
                        }}
                    >
                        <div in:fade class="size-full">
                            {#if loading}
                                <TablerLoader2 class="size-full animate-spin" />
                            {:else}
                                <MaterialSymbolsDeleteRounded class="size-full" />
                            {/if}
                        </div>
                        Delete
                    </Button>
                </div>
                <div class="size-full h-[calc(100vh-400px)]">
                    <Grid {gridOptions} rowData={accs} />
                </div>
            </div>
        {/await}
    </Popover.Content>
</Popover.Root>
