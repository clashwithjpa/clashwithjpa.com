<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { APIPlayer } from "$lib/coc/types";
    import type { GridOptions } from "@ag-grid-community/core";
    import { Popover } from "bits-ui";
    import { fade, fly } from "svelte/transition";
    import MaterialSymbolsDeleteRounded from "~icons/material-symbols/delete-rounded";
    import TablerLoader2 from "~icons/tabler/loader-2";
    import { toast } from "$lib/components/app/toast";
    import Button from "$lib/components/app/ui/Button.svelte";
    import Grid from "$lib/components/app/ui/Grid.svelte";

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
        <div class="rounded-md bg-gray-800 p-1 font-mono">
            <p class="text-sm">{tags.length} Account{tags.length > 1 ? "s" : ""}</p>
        </div>
    </Popover.Trigger>
    <Popover.Portal>
        <Popover.Content forceMount>
            {#snippet child({ wrapperProps, props, open })}
                {#if open}
                    <div {...wrapperProps}>
                        <div {...props} transition:fly={{ duration: 200 }} class="size-full rounded-lg border border-gray-700 bg-gray-950">
                            {#await fetchCocAccounts()}
                                <div class="flex size-full items-center justify-center p-5">
                                    <TablerLoader2 class="size-10 animate-spin"></TablerLoader2>
                                </div>
                            {:then accs}
                                <div in:fly class="size-full">
                                    <div class="flex items-center justify-center gap-2 p-2">
                                        <Button
                                            size="sm"
                                            class="flex items-center justify-center gap-2 hover:not-disabled:!bg-red-500/10 hover:not-disabled:!text-red-500"
                                            disabled={selectedRows.length <= 0 || disabled}
                                            onclick={async () => {
                                                await removeAcc(selectedRows.map((row) => row.tag));
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
                                    <div class="size-full h-[calc(100vh-400px)]">
                                        <Grid {gridOptions} rowData={accs} />
                                    </div>
                                </div>
                            {/await}
                            <Popover.Arrow class="text-gray-700" />
                        </div>
                    </div>
                {/if}
            {/snippet}
        </Popover.Content>
    </Popover.Portal>
</Popover.Root>
